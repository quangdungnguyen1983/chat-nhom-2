// NH-01, NH-03, NH-04 (09 mục 10.6, 10.7). Không import express / socket.io.
// Thứ tự bắt buộc: kiểm quyền + ghi + tin hệ thống trong MỘT giao dịch → (rời phòng nếu bị xóa / rời) → phát.
import { AppError, validationError } from "../../common/errors.js";
import { toMessageDto, type ConversationDetailDto, type MessageDto } from "../../common/dto.js";
import { normalizeGroupName } from "../../common/validation.js";
import { withWriteTx, type Tx } from "../../storage/prisma.js";
import * as groups from "../../storage/groups.repo.js";
import { activeMemberIds } from "../../storage/members.repo.js";
import { assertActiveMember } from "../chat/membership.js";
import { broadcastMessages, detailFor } from "../chat/chat.service.js";
import * as realtime from "../notifications/realtime.js";
import { systemText, type SystemEvent } from "./system-messages.js";

async function addSystem(tx: Tx, conversationId: number, e: SystemEvent, actorId: number | null, targetId: number | null) {
  const { type, ...data } = e;
  const msg = await groups.createSystemMessage(tx, conversationId, { eventType: type, actorId, targetId, data, content: systemText(e) });
  return toMessageDto(msg);
}

async function namesOf(tx: Tx, ids: number[]): Promise<Map<number, string>> {
  const rows = await groups.usersByIds(tx, ids);
  return new Map(rows.map((u) => [u.id, u.displayName]));
}

/** Cửa G3: thành viên hiện tại (403 CONVERSATION_FORBIDDEN) → là nhóm → là trưởng nhóm (403 NOT_GROUP_OWNER). */
async function requireOwner(tx: Tx, me: number, conversationId: number) {
  const member = await assertActiveMember(conversationId, me, tx);
  const conv = await groups.findConversation(tx, conversationId);
  if (!conv || conv.type !== "group") throw new AppError("NOT_A_GROUP");
  if (member.role !== "owner") throw new AppError("NOT_GROUP_OWNER");
  return conv;
}

function checkIds(ids: number[], me: number, field: string) {
  if (new Set(ids).size !== ids.length) throw validationError({ [field]: "Danh sách có người bị trùng." });
  if (ids.includes(me)) throw validationError({ [field]: "Không chọn chính mình." });
}

/** G1 – NH-01: tạo nhóm với ≥ 2 người được chọn; người tạo là trưởng nhóm; sinh HT-01. */
export async function createGroup(me: number, rawName: string, memberIds: number[]): Promise<ConversationDetailDto> {
  const name = normalizeGroupName(rawName);
  if (!name) throw new AppError("GROUP_NAME_INVALID");
  checkIds(memberIds, me, "memberIds");
  if (memberIds.length < 2) throw new AppError("GROUP_TOO_FEW_MEMBERS");

  const { id, ht } = await withWriteTx(async (tx) => {
    const names = await namesOf(tx, [me, ...memberIds]);
    if (memberIds.some((u) => !names.has(u))) throw new AppError("USERS_NOT_FOUND");
    const conv = await groups.createGroupRow(tx, name, me);
    await groups.upsertMember(tx, conv.id, me, "owner", null);
    for (const u of memberIds) await groups.upsertMember(tx, conv.id, u, "member", me);
    const ht = await addSystem(tx, conv.id, { type: "group_created", actor: names.get(me)!, groupName: name }, me, null);
    for (const u of [me, ...memberIds]) await groups.upsertCursor(tx, conv.id, u, ht.id);
    return { id: conv.id, ht };
  });
  realtime.joinConversation(id, [me, ...memberIds]); // chỉ máy chủ cho socket vào phòng
  await broadcastMessages(id, [ht]);
  return detailFor(me, id);
}

/** G2 – NH-03: đổi tên (trưởng nhóm). Tên giống cũ → không làm gì, không có tin hệ thống (GF-19). */
export async function renameGroup(me: number, conversationId: number, rawName: string): Promise<ConversationDetailDto> {
  const msgs = await withWriteTx(async (tx) => {
    const conv = await requireOwner(tx, me, conversationId);
    const name = normalizeGroupName(rawName);
    if (!name) throw new AppError("GROUP_NAME_INVALID");
    if (name === conv.name) return [];
    await groups.rename(tx, conversationId, name);
    const names = await namesOf(tx, [me]);
    return [await addSystem(tx, conversationId, { type: "group_renamed", actor: names.get(me)!, newName: name }, me, null)];
  }, { lockConversationId: conversationId }); // khóa dòng hội thoại (PostgreSQL)
  if (msgs.length) {
    await broadcastMessages(conversationId, msgs);
    realtime.emitMemberChanged(conversationId, "renamed", null, (await detailFor(me, conversationId)).memberCount);
  }
  return detailFor(me, conversationId);
}

/**
 * G3 – NH-03: thêm thành viên (trưởng nhóm). Một người không hợp lệ → không thêm ai (GU-13).
 * Mỗi người một tin HT-02. Phạm vi xem: từ tin HT-02 ĐẦU TIÊN của lần thêm (showHistory = false, mặc định)
 * hoặc từ đầu (showHistory = true) – QĐ-08, GS-35.
 */
export async function addMembers(me: number, conversationId: number, userIds: number[], showHistory: boolean): Promise<ConversationDetailDto> {
  checkIds(userIds, me, "userIds");
  if (userIds.length === 0) throw validationError({ userIds: "Chọn ít nhất một người." });
  const msgs = await withWriteTx(async (tx) => {
    await requireOwner(tx, me, conversationId);
    const active = new Set((await groups.activeMembers(tx, conversationId)).map((m) => m.userId));
    const names = await namesOf(tx, [me, ...userIds]);
    if (userIds.some((u) => !names.has(u) || active.has(u))) throw new AppError("MEMBER_CONFLICT");
    const out: MessageDto[] = [];
    for (const u of userIds) {
      await groups.upsertMember(tx, conversationId, u, "member", me);
      out.push(await addSystem(tx, conversationId, { type: "member_added", actor: names.get(me)!, target: names.get(u)! }, me, u));
    }
    const floor = showHistory ? 0 : out[0].id; // cả lần thêm dùng chung một mốc → không ai thấy tin trước lúc được thêm
    for (const u of userIds) {
      await groups.setVisibleFrom(tx, conversationId, u, floor);
      await groups.upsertCursor(tx, conversationId, u, out[out.length - 1].id);
    }
    return out;
  }, { lockConversationId: conversationId }); // khóa dòng hội thoại (PostgreSQL)
  realtime.joinConversation(conversationId, userIds); // vào phòng SAU khi ghi CSDL, TRƯỚC khi phát
  await broadcastMessages(conversationId, msgs);
  const count = (await detailFor(me, conversationId)).memberCount;
  for (const u of userIds) realtime.emitMemberChanged(conversationId, "added", u, count);
  return detailFor(me, conversationId);
}

/** G4 – NH-03: xóa thành viên (trưởng nhóm, không tự xóa). Người bị xóa mất quyền xem toàn bộ lịch sử (QĐ-04). */
export async function removeMember(me: number, conversationId: number, targetId: number): Promise<void> {
  const msg = await withWriteTx(async (tx) => {
    await requireOwner(tx, me, conversationId);
    if (targetId === me) throw new AppError("CANNOT_REMOVE_SELF");
    const active = await groups.activeMembers(tx, conversationId);
    if (!active.some((m) => m.userId === targetId)) throw new AppError("TARGET_NOT_MEMBER");
    await groups.markLeft(tx, conversationId, targetId, "removed");
    const names = await namesOf(tx, [me, targetId]);
    return addSystem(tx, conversationId, { type: "member_removed", actor: names.get(me)!, target: names.get(targetId)! }, me, targetId);
  }, { lockConversationId: conversationId }); // khóa dòng hội thoại (PostgreSQL)
  // Rời phòng TRƯỚC khi phát → người bị xóa không nhận HT-03 về chính mình (FRS-14 quy tắc 4).
  realtime.leaveConversation(conversationId, [targetId]);
  realtime.emitConversationRemoved(targetId, conversationId, "removed");
  await broadcastMessages(conversationId, [msg]);
  realtime.emitMemberChanged(conversationId, "removed", targetId, (await detailFor(me, conversationId)).memberCount);
}

/** G5 – NH-03: tự rời. Trưởng nhóm bắt buộc chuyển quyền trong cùng thao tác (QĐ-03): HT-06 rồi HT-04. */
export async function leaveGroup(me: number, conversationId: number, newOwnerId?: number): Promise<void> {
  const { msgs, transferredTo } = await withWriteTx(async (tx) => {
    const member = await assertActiveMember(conversationId, me, tx);
    const conv = await groups.findConversation(tx, conversationId);
    if (!conv || conv.type !== "group") throw new AppError("NOT_A_GROUP");
    const others = (await groups.activeMembers(tx, conversationId)).filter((m) => m.userId !== me);
    const out: MessageDto[] = [];
    let transferredTo: number | null = null;
    if (member.role === "owner") {
      if (others.length === 0) throw new AppError("LAST_MEMBER_CANNOT_LEAVE");
      if (newOwnerId === undefined || !others.some((m) => m.userId === newOwnerId)) throw new AppError("NEW_OWNER_REQUIRED");
      await groups.setRole(tx, conversationId, me, "member"); // hạ trước: UK "một trưởng nhóm"
      await groups.setRole(tx, conversationId, newOwnerId, "owner");
      const n = await namesOf(tx, [me, newOwnerId]);
      out.push(await addSystem(tx, conversationId, { type: "owner_transferred", actor: n.get(me)!, target: n.get(newOwnerId)! }, me, newOwnerId));
      transferredTo = newOwnerId;
    }
    await groups.markLeft(tx, conversationId, me, "left");
    const n = await namesOf(tx, [me]);
    out.push(await addSystem(tx, conversationId, { type: "member_left", target: n.get(me)! }, me, me));
    return { msgs: out, transferredTo };
  }, { lockConversationId: conversationId }); // khóa dòng hội thoại (PostgreSQL)
  realtime.leaveConversation(conversationId, [me]);
  realtime.emitConversationRemoved(me, conversationId, "left");
  await broadcastMessages(conversationId, msgs);
  const count = (await activeMemberIds(conversationId)).length;
  if (transferredTo !== null) realtime.emitMemberChanged(conversationId, "owner_transferred", transferredTo, count);
  realtime.emitMemberChanged(conversationId, "left", me, count);
}
