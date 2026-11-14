// Đếm chưa đọc (09 mục 10.3) – SQL thô chạy được trên cả SQLite và PostgreSQL:
// chỉ khác hàm lấy giá trị lớn hơn (SQLite: MAX(a, b); PostgreSQL: GREATEST(a, b)).
// Chỉ đếm tin 'text' của NGƯỜI KHÁC, sau mốc đã đọc, trong phạm vi được xem; dừng ở 100 (GE-11).
import { Prisma } from "@prisma/client";
import { isPostgres, prisma, type Tx } from "./prisma.js";

export const UNREAD_CAP = 100;

export async function unreadCounts(userId: number, conversationIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (conversationIds.length === 0) return out;
  const greatest = Prisma.raw(isPostgres() ? "GREATEST" : "MAX");
  const rows = await prisma().$queryRaw<Array<{ conversationId: number; unread: bigint | number }>>`
    SELECT cm.conversation_id AS "conversationId",
           (SELECT COUNT(*) FROM (
               SELECT 1 FROM messages m
               WHERE m.conversation_id = cm.conversation_id
                 AND m.type = 'text'
                 AND m.id > ${greatest}(r.last_read_message_id, cm.visible_from_message_id - 1)
                 AND m.sender_id <> cm.user_id
               LIMIT ${UNREAD_CAP}) AS capped) AS unread
    FROM conversation_members cm
    JOIN message_read_cursors r ON r.conversation_id = cm.conversation_id AND r.user_id = cm.user_id
    WHERE cm.user_id = ${userId} AND cm.left_at IS NULL
      AND cm.conversation_id IN (${Prisma.join(conversationIds)})`;
  for (const r of rows) out.set(Number(r.conversationId), Number(r.unread));
  return out;
}

/**
 * Mốc đã đọc chỉ TĂNG (09 mục 10.5). Gọi trong withWriteTx. Trả mốc sau khi cập nhật.
 * Một câu UPDATE có điều kiện "nhỏ hơn" nên đúng cả khi nhiều bản máy chủ cùng ghi (PostgreSQL).
 */
export async function advanceCursor(tx: Tx, conversationId: number, userId: number, target: number): Promise<number> {
  await tx.messageReadCursor.updateMany({
    where: { conversationId, userId, lastReadMessageId: { lt: target } },
    data: { lastReadMessageId: target },
  });
  const cur = await tx.messageReadCursor.findUniqueOrThrow({
    where: { conversationId_userId: { conversationId, userId } },
    select: { lastReadMessageId: true },
  });
  return cur.lastReadMessageId;
}
