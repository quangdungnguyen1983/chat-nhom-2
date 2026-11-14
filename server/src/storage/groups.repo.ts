// Ghi cho nhóm (09 mục 10.6, 10.7). Mọi hàm nhận `tx` – chỉ gọi BÊN TRONG withWriteTx.
import type { Tx } from "./prisma.js";

const userSel = { id: true, username: true, displayName: true } as const;

export function usersByIds(tx: Tx, ids: number[]) {
  return tx.user.findMany({ where: { id: { in: ids } }, select: userSel });
}

export function findConversation(tx: Tx, id: number) {
  return tx.conversation.findUnique({ where: { id }, select: { id: true, type: true, name: true } });
}

export function activeMembers(tx: Tx, conversationId: number) {
  return tx.conversationMember.findMany({ where: { conversationId, leftAt: null }, select: { userId: true, role: true } });
}

export function createGroupRow(tx: Tx, name: string, ownerId: number) {
  return tx.conversation.create({ data: { type: "group", name, createdById: ownerId }, select: { id: true } });
}

/** Thêm mới hoặc MỞ LẠI dòng thành viên (người từng rời / bị xóa được thêm lại). */
export function upsertMember(tx: Tx, conversationId: number, userId: number, role: "owner" | "member", addedById: number | null) {
  const data = { role, joinedAt: new Date(), addedById, leftAt: null, leftReason: null, visibleFromMessageId: 0 };
  return tx.conversationMember.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, ...data },
    update: data,
  });
}

export function setVisibleFrom(tx: Tx, conversationId: number, userId: number, visibleFromMessageId: number) {
  return tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { visibleFromMessageId } });
}

/** Mốc đã đọc của người mới = tin hệ thống lúc vào nhóm (tin trước đó không tính chưa đọc). */
export function upsertCursor(tx: Tx, conversationId: number, userId: number, lastReadMessageId: number) {
  return tx.messageReadCursor.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId, lastReadMessageId },
    update: { lastReadMessageId },
  });
}

export function setRole(tx: Tx, conversationId: number, userId: number, role: "owner" | "member") {
  return tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { role } });
}

export function markLeft(tx: Tx, conversationId: number, userId: number, reason: "left" | "removed") {
  return tx.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { leftAt: new Date(), leftReason: reason },
  });
}

export function rename(tx: Tx, conversationId: number, name: string) {
  return tx.conversation.update({ where: { id: conversationId }, data: { name } });
}

/** Tin hệ thống: không tác giả, không mã tạm; cập nhật tin cuối của hội thoại (09 mục 10.6). */
export async function createSystemMessage(
  tx: Tx, conversationId: number,
  e: { eventType: string; actorId: number | null; targetId: number | null; data: Record<string, unknown>; content: string },
) {
  const msg = await tx.message.create({
    data: {
      conversationId, senderId: null, type: "system", content: e.content, eventType: e.eventType,
      eventActorId: e.actorId, eventTargetId: e.targetId, eventData: JSON.stringify(e.data),
    },
    include: { sender: { select: userSel } },
  });
  await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageId: msg.id, lastMessageAt: msg.createdAt } });
  return msg;
}
