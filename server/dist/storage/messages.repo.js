import { prisma } from "./prisma.js";
const include = { sender: { select: { id: true, username: true, displayName: true } } };
export function findBySenderClientId(senderId, clientMsgId, tx) {
    return (tx ?? prisma()).message.findUnique({ where: { senderId_clientMsgId: { senderId, clientMsgId } }, include });
}
export function createText(tx, conversationId, senderId, content, clientMsgId) {
    return tx.message.create({ data: { conversationId, senderId, type: "text", content, clientMsgId }, include });
}
/**
 * Trang tin theo con trỏ mã tin (09 mục 10.4). Lấy limit + 1 dòng để biết còn tin hay không.
 * Không dùng OFFSET (GS-22).
 */
export function pageBefore(conversationId, floor, before, take) {
    return prisma().message.findMany({
        where: { conversationId, id: { gte: floor, ...(before !== undefined ? { lt: before } : {}) } },
        orderBy: { id: "desc" },
        take,
        include,
    });
}
export function pageAfter(conversationId, floor, after, take) {
    return prisma().message.findMany({
        where: { conversationId, id: { gte: floor, gt: after } },
        orderBy: { id: "asc" },
        take,
        include,
    });
}
