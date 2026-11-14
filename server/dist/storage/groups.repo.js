const userSel = { id: true, username: true, displayName: true };
export function usersByIds(tx, ids) {
    return tx.user.findMany({ where: { id: { in: ids } }, select: userSel });
}
export function findConversation(tx, id) {
    return tx.conversation.findUnique({ where: { id }, select: { id: true, type: true, name: true } });
}
export function activeMembers(tx, conversationId) {
    return tx.conversationMember.findMany({ where: { conversationId, leftAt: null }, select: { userId: true, role: true } });
}
export function createGroupRow(tx, name, ownerId) {
    return tx.conversation.create({ data: { type: "group", name, createdById: ownerId }, select: { id: true } });
}
/** Thêm mới hoặc MỞ LẠI dòng thành viên (người từng rời / bị xóa được thêm lại). */
export function upsertMember(tx, conversationId, userId, role, addedById) {
    const data = { role, joinedAt: new Date(), addedById, leftAt: null, leftReason: null, visibleFromMessageId: 0 };
    return tx.conversationMember.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        create: { conversationId, userId, ...data },
        update: data,
    });
}
export function setVisibleFrom(tx, conversationId, userId, visibleFromMessageId) {
    return tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { visibleFromMessageId } });
}
/** Mốc đã đọc của người mới = tin hệ thống lúc vào nhóm (tin trước đó không tính chưa đọc). */
export function upsertCursor(tx, conversationId, userId, lastReadMessageId) {
    return tx.messageReadCursor.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        create: { conversationId, userId, lastReadMessageId },
        update: { lastReadMessageId },
    });
}
export function setRole(tx, conversationId, userId, role) {
    return tx.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { role } });
}
export function markLeft(tx, conversationId, userId, reason) {
    return tx.conversationMember.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { leftAt: new Date(), leftReason: reason },
    });
}
export function rename(tx, conversationId, name) {
    return tx.conversation.update({ where: { id: conversationId }, data: { name } });
}
/** Tin hệ thống: không tác giả, không mã tạm; cập nhật tin cuối của hội thoại (09 mục 10.6). */
export async function createSystemMessage(tx, conversationId, e) {
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
