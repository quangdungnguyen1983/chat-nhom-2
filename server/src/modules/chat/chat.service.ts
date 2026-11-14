// CH-01, CH-02, CH-03, CH-06. Không import express / socket.io (08 mục 4.3).
import { AppError, validationError } from "../../common/errors.js";
import { M } from "../../common/messages.js";
import {
  preview, toMessageDto, toUserDto,
  type ConversationDetailDto, type ConversationSummaryDto, type MessageDto,
} from "../../common/dto.js";
import { avatarInitial } from "../../common/avatar.js";
import { MAX_MESSAGE_CHARS, countChars, hasVisibleChar, normalizeContent } from "../../common/validation.js";
import { isUniqueViolation, withWriteTx } from "../../storage/prisma.js";
import * as convRepo from "../../storage/conversations.repo.js";
import * as msgRepo from "../../storage/messages.repo.js";
import * as members from "../../storage/members.repo.js";
import * as users from "../../storage/users.repo.js";
import { unreadCounts } from "../../storage/unread.repo.js";
import { assertActiveMember } from "./membership.js";
import * as realtime from "../notifications/realtime.js";

export const PAGE_SIZE = 50; // PDF CH-03

type ViewRow = Awaited<ReturnType<typeof convRepo.findForView>>[number];

function toSummary(c: ViewRow, me: number, unread: number): ConversationSummaryDto {
  const mine = c.members.find((m) => m.userId === me);
  const other = c.type === "direct" ? c.members.find((m) => m.userId !== me)?.user ?? null : null;
  const title = other ? other.displayName : c.name ?? "";
  const lm = c.lastMessage;
  return {
    id: c.id,
    type: c.type as ConversationSummaryDto["type"],
    title,
    avatarInitial: avatarInitial(title),
    otherUser: other ? toUserDto(other) : null,
    memberCount: c.members.length,
    myRole: (mine?.role ?? "member") as ConversationSummaryDto["myRole"],
    lastMessage: lm
      ? {
          id: lm.id,
          type: lm.type as "text" | "system",
          preview: preview(lm.content),
          senderDisplayName: lm.sender?.displayName ?? null,
          isMine: lm.senderId === me,
          createdAt: lm.createdAt.toISOString(),
        }
      : null,
    lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    unreadCount: unread,
  };
}

async function summariesFor(me: number, ids: number[]): Promise<ConversationSummaryDto[]> {
  const [rows, unread] = await Promise.all([convRepo.findForView(ids), unreadCounts(me, ids)]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [toSummary(r, me, unread.get(id) ?? 0)] : [];
  });
}

async function detailFor(me: number, conversationId: number): Promise<ConversationDetailDto> {
  const [row] = await convRepo.findForView([conversationId]);
  const unread = (await unreadCounts(me, [conversationId])).get(conversationId) ?? 0;
  return {
    ...toSummary(row, me, unread),
    name: row.name,
    members: row.members.map((m) => ({ user: toUserDto(m.user), role: m.role as "owner" | "member" })),
  };
}

/** C1 – CH-01: mở hoặc mở lại hội thoại 1-1, không bao giờ tạo trùng (09 mục 10.2). */
export async function openDirect(me: number, otherId: number): Promise<{ conversation: ConversationDetailDto; created: boolean }> {
  if (otherId === me) throw new AppError("CANNOT_CHAT_SELF");
  if (!(await users.findById(otherId))) throw new AppError("USER_NOT_FOUND");
  const low = Math.min(me, otherId);
  const high = Math.max(me, otherId);

  let result: { id: number; created: boolean };
  try {
    result = await withWriteTx(async (tx) => {
      const existing = await convRepo.findDirect(low, high, tx);
      if (existing) return { id: existing.id, created: false };
      const conv = await convRepo.createDirect(tx, low, high, me);
      return { id: conv.id, created: true };
    });
  } catch (err) {
    // Lớp dự phòng: UNIQUE (low, high) của CSDL chặn trùng nếu có tiến trình khác ghi cùng lúc.
    if (!isUniqueViolation(err)) throw err;
    const again = await convRepo.findDirect(low, high);
    if (!again) throw err;
    result = { id: again.id, created: false };
  }
  if (result.created) realtime.joinConversation(result.id, [low, high]);
  return { conversation: await detailFor(me, result.id), created: result.created };
}

/** C2 – CH-06 + TB-01: chỉ hội thoại đã có tin, mới nhất trước. */
export async function listConversations(me: number) {
  const ids = await convRepo.listIdsWithMessages(me);
  const conversations = await summariesFor(me, ids);
  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);
  return { conversations, totalUnread };
}

/** C3 */
export async function getConversation(me: number, conversationId: number): Promise<ConversationDetailDto> {
  await assertActiveMember(conversationId, me);
  return detailFor(me, conversationId);
}

/** C4 – CH-03: phân trang theo con trỏ, tối đa 50 tin, trả từ cũ đến mới (09 mục 10.4). */
export async function getMessages(me: number, conversationId: number, q: { before?: number; after?: number; limit?: number }) {
  const member = await assertActiveMember(conversationId, me); // kiểm tra TRƯỚC khi đọc bảng messages
  const limit = q.limit ?? PAGE_SIZE;
  if (!Number.isInteger(limit) || limit < 1 || limit > PAGE_SIZE) throw validationError({ limit: `1–${PAGE_SIZE}` });
  if (q.before !== undefined && q.after !== undefined) throw validationError({ before: "Không dùng cùng lúc before và after." });
  const floor = member.visibleFromMessageId;

  if (q.after !== undefined) {
    const rows = await msgRepo.pageAfter(conversationId, floor, q.after, limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    return { messages: page.map(toMessageDto), hasMore, nextCursor: page.at(-1)?.id ?? null };
  }
  const rows = await msgRepo.pageBefore(conversationId, floor, q.before, limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();
  return { messages: page.map(toMessageDto), hasMore, nextCursor: page[0]?.id ?? null };
}

export type SendInput = { conversationId: number; content: string; clientMessageId: string };

/**
 * CH-02: kiểm tra → LƯU CSDL (giao dịch) → trả kết quả. Chỉ SAU KHI giao dịch thành công
 * mới phát message:new / conversation:updated (09 mục 8.1, CH-02 R5).
 * `senderId` luôn là người của phiên (tham số `me`), không bao giờ lấy từ trình duyệt.
 */
export async function sendMessage(me: number, input: SendInput): Promise<{ message: MessageDto; duplicate: boolean }> {
  const content = normalizeContent(input.content);
  if (!hasVisibleChar(content)) throw new AppError("MESSAGE_EMPTY");
  const n = countChars(content);
  if (n > MAX_MESSAGE_CHARS) {
    throw new AppError("MESSAGE_TOO_LONG", undefined, M.M17.replace("{n}", n.toLocaleString("vi-VN")));
  }

  let saved: { message: MessageDto; duplicate: boolean };
  try {
    saved = await withWriteTx(async (tx) => {
      await assertActiveMember(input.conversationId, me, tx);
      const prev = await msgRepo.findBySenderClientId(me, input.clientMessageId, tx);
      if (prev) {
        if (prev.conversationId !== input.conversationId) throw validationError({ clientMessageId: "Mã tạm đã dùng cho hội thoại khác." });
        return { message: toMessageDto(prev), duplicate: true };
      }
      const msg = await msgRepo.createText(tx, input.conversationId, me, content, input.clientMessageId);
      await convRepo.setLastMessage(tx, input.conversationId, msg.id, msg.createdAt);
      return { message: toMessageDto(msg), duplicate: false };
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    const prev = await msgRepo.findBySenderClientId(me, input.clientMessageId);
    if (!prev || prev.conversationId !== input.conversationId) throw err;
    saved = { message: toMessageDto(prev), duplicate: true };
  }

  if (!saved.duplicate) await broadcastNewMessage(saved.message);
  return saved;
}

async function broadcastNewMessage(message: MessageDto): Promise<void> {
  realtime.emitNewMessage(message);
  const memberIds = await members.activeMemberIds(message.conversationId);
  for (const uid of memberIds) {
    const [summary] = await summariesFor(uid, [message.conversationId]);
    if (summary) realtime.emitConversationUpdated(uid, summary); // tính RIÊNG cho từng người (unreadCount, isMine)
  }
}
