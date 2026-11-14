import { prisma } from "./prisma.js";
const userSel = { id: true, username: true, displayName: true };
export function findDirect(low, high, tx) {
    return (tx ?? prisma()).conversation.findUnique({
        where: { directUserLowId_directUserHighId: { directUserLowId: low, directUserHighId: high } },
        select: { id: true },
    });
}
/** Tạo hội thoại 1-1 + 2 thành viên + 2 con trỏ đã đọc (09 mục 10.2). Gọi trong withWriteTx. */
export async function createDirect(tx, low, high, createdById) {
    const conv = await tx.conversation.create({
        data: { type: "direct", directUserLowId: low, directUserHighId: high, createdById },
        select: { id: true },
    });
    for (const userId of [low, high]) {
        await tx.conversationMember.create({ data: { conversationId: conv.id, userId, role: "member", visibleFromMessageId: 0 } });
        await tx.messageReadCursor.create({ data: { conversationId: conv.id, userId, lastReadMessageId: 0 } });
    }
    return conv;
}
/** Dữ liệu để dựng ConversationSummaryDto / DetailDto: thành viên hiện tại + tin cuối. */
export function findForView(conversationIds) {
    return prisma().conversation.findMany({
        where: { id: { in: conversationIds } },
        include: {
            members: { where: { leftAt: null }, include: { user: { select: userSel } } },
            lastMessage: { include: { sender: { select: userSel } } },
        },
    });
}
/** Hội thoại người dùng đang tham gia VÀ đã có tin (GF-09, CH-01 R3), mới nhất trước (CH-06 R1). */
export async function listIdsWithMessages(userId) {
    const rows = await prisma().conversation.findMany({
        where: { lastMessageId: { not: null }, members: { some: { userId, leftAt: null } } },
        orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
        select: { id: true },
    });
    return rows.map((r) => r.id);
}
export function setLastMessage(tx, conversationId, messageId, at) {
    return tx.conversation.update({ where: { id: conversationId }, data: { lastMessageId: messageId, lastMessageAt: at } });
}
export function lastMessageId(conversationId) {
    return prisma().conversation.findUnique({ where: { id: conversationId }, select: { lastMessageId: true } });
}
