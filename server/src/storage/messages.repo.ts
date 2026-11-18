import { prisma, type Tx } from "./prisma.js";

// Tệp đính kèm: chỉ lấy thông tin mô tả, KHÔNG lấy cột data (nội dung tệp) khi đọc danh sách tin.
const attachmentMeta = { select: { id: true, fileName: true, mimeType: true, sizeBytes: true } } as const;
const include = { sender: { select: { id: true, username: true, displayName: true } }, attachment: attachmentMeta } as const;

export function findBySenderClientId(senderId: number, clientMsgId: string, tx?: Tx) {
  return (tx ?? prisma()).message.findUnique({ where: { senderId_clientMsgId: { senderId, clientMsgId } }, include });
}

export type StoredFormat = { fmtFont: string | null; fmtSize: string | null; fmtColor: string | null };

export function createText(tx: Tx, conversationId: number, senderId: number, content: string, clientMsgId: string, format: StoredFormat) {
  return tx.message.create({ data: { conversationId, senderId, type: "text", content, clientMsgId, ...format }, include });
}

/**
 * Trang tin theo con trỏ mã tin (09 mục 10.4). Lấy limit + 1 dòng để biết còn tin hay không.
 * Không dùng OFFSET (GS-22).
 */
export function pageBefore(conversationId: number, floor: number, before: number | undefined, take: number) {
  return prisma().message.findMany({
    where: { conversationId, id: { gte: floor, ...(before !== undefined ? { lt: before } : {}) } },
    orderBy: { id: "desc" },
    take,
    include,
  });
}

export function pageAfter(conversationId: number, floor: number, after: number, take: number) {
  return prisma().message.findMany({
    where: { conversationId, id: { gte: floor, gt: after } },
    orderBy: { id: "asc" },
    take,
    include,
  });
}

export type NewAttachment = { fileName: string; mimeType: string; sizeBytes: number; data: Uint8Array };

/** Tin văn bản kèm một tệp – cùng giao dịch với việc lưu tin. */
export async function createWithAttachment(
  tx: Tx, conversationId: number, senderId: number, content: string, clientMsgId: string, file: NewAttachment,
) {
  const msg = await tx.message.create({ data: { conversationId, senderId, type: "text", content, clientMsgId }, select: { id: true } });
  await tx.attachment.create({
    data: { messageId: msg.id, conversationId, uploaderId: senderId, fileName: file.fileName, mimeType: file.mimeType, sizeBytes: file.sizeBytes, data: Buffer.from(file.data) },
  });
  return tx.message.findUniqueOrThrow({ where: { id: msg.id }, include });
}

/** Đọc tệp để tải về, kèm mã tin để kiểm tra quyền xem. */
export function findAttachment(id: number) {
  return prisma().attachment.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true, sizeBytes: true, data: true, conversationId: true, messageId: true },
  });
}
