// Đếm chưa đọc (09 mục 10.3) – SQL thô biến thể SQLite (PostgreSQL: MAX(a, b) → GREATEST(a, b)).
// Chỉ đếm tin 'text' của NGƯỜI KHÁC, sau mốc đã đọc, trong phạm vi được xem; dừng ở 100 (GE-11).
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
export const UNREAD_CAP = 100;
export async function unreadCounts(userId, conversationIds) {
    const out = new Map();
    if (conversationIds.length === 0)
        return out;
    const rows = await prisma().$queryRaw `
    SELECT cm.conversation_id AS conversationId,
           (SELECT COUNT(*) FROM (
               SELECT 1 FROM messages m
               WHERE m.conversation_id = cm.conversation_id
                 AND m.type = 'text'
                 AND m.id > MAX(r.last_read_message_id, cm.visible_from_message_id - 1)
                 AND m.sender_id <> cm.user_id
               LIMIT ${UNREAD_CAP})) AS unread
    FROM conversation_members cm
    JOIN message_read_cursors r ON r.conversation_id = cm.conversation_id AND r.user_id = cm.user_id
    WHERE cm.user_id = ${userId} AND cm.left_at IS NULL
      AND cm.conversation_id IN (${Prisma.join(conversationIds)})`;
    for (const r of rows)
        out.set(Number(r.conversationId), Number(r.unread));
    return out;
}
/** Mốc đã đọc chỉ TĂNG (09 mục 10.5). Gọi trong withWriteTx (các lần ghi xếp hàng). Trả mốc mới. */
export async function advanceCursor(tx, conversationId, userId, target) {
    const where = { conversationId_userId: { conversationId, userId } };
    const cur = await tx.messageReadCursor.findUniqueOrThrow({ where, select: { lastReadMessageId: true } });
    if (target <= cur.lastReadMessageId)
        return cur.lastReadMessageId;
    await tx.messageReadCursor.update({ where, data: { lastReadMessageId: target } });
    return target;
}
