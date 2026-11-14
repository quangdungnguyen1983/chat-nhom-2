let io = null;
export function setIo(server) {
    io = server;
}
export const rooms = {
    user: (id) => `user:${id}`,
    session: (id) => `session:${id}`,
    conv: (id) => `conv:${id}`,
};
/** Cho MỌI socket của các người dùng này vào phòng hội thoại (vừa mở 1-1 – CH-01). */
export function joinConversation(conversationId, userIds) {
    if (!io)
        return;
    for (const u of userIds)
        io.in(rooms.user(u)).socketsJoin(rooms.conv(conversationId));
}
export function emitNewMessage(message) {
    io?.to(rooms.conv(message.conversationId)).emit("message:new", { message });
}
export function emitConversationUpdated(userId, conversation) {
    io?.to(rooms.user(userId)).emit("conversation:updated", { conversation });
}
export function emitUnread(userId, conversationId, unreadCount, lastReadMessageId) {
    io?.to(rooms.user(userId)).emit("unread:update", { conversationId, unreadCount, lastReadMessageId });
}
/** TK-03 R4: báo phiên bị hủy rồi ngắt mọi socket của phiên đó. */
export function disconnectSession(sessionId, reason) {
    if (!io)
        return;
    io.to(rooms.session(sessionId)).emit("session:revoked", { reason });
    io.in(rooms.session(sessionId)).disconnectSockets(true);
}
/** Rời phòng hội thoại – gọi TRƯỚC khi phát tin hệ thống xóa / rời (09 mục 10.8, QĐ-04). */
export function leaveConversation(conversationId, userIds) {
    if (!io)
        return;
    for (const u of userIds)
        io.in(rooms.user(u)).socketsLeave(rooms.conv(conversationId));
}
export function emitConversationRemoved(userId, conversationId, reason) {
    io?.to(rooms.user(userId)).emit("conversation:removed", { conversationId, reason });
}
export function emitMemberChanged(conversationId, change, userId, memberCount) {
    io?.to(rooms.conv(conversationId)).emit("member:changed", { conversationId, change, userId, memberCount });
}
