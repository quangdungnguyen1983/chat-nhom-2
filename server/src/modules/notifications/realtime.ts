// NƠI DUY NHẤT gọi io.to(...).emit / socketsJoin / disconnectSockets (09 mục 2.2 quy tắc 5).
// Tên phòng: user:<id>, session:<id>, conv:<id> (ADR-03).
import type { Server } from "socket.io";
import type { ConversationSummaryDto, MessageDto } from "../../common/dto.js";

let io: Server | null = null;

export function setIo(server: Server | null): void {
  io = server;
}

export const rooms = {
  user: (id: number) => `user:${id}`,
  session: (id: number) => `session:${id}`,
  conv: (id: number) => `conv:${id}`,
};

/** Cho MỌI socket của các người dùng này vào phòng hội thoại (vừa mở 1-1 – CH-01). */
export function joinConversation(conversationId: number, userIds: number[]): void {
  if (!io) return;
  for (const u of userIds) io.in(rooms.user(u)).socketsJoin(rooms.conv(conversationId));
}

export function emitNewMessage(message: MessageDto): void {
  io?.to(rooms.conv(message.conversationId)).emit("message:new", { message });
}

export function emitConversationUpdated(userId: number, conversation: ConversationSummaryDto): void {
  io?.to(rooms.user(userId)).emit("conversation:updated", { conversation });
}

export function emitUnread(userId: number, conversationId: number, unreadCount: number, lastReadMessageId: number): void {
  io?.to(rooms.user(userId)).emit("unread:update", { conversationId, unreadCount, lastReadMessageId });
}

export type RevokeReason = "logout" | "password_change" | "expired";

/** TK-03 R4: báo phiên bị hủy rồi ngắt mọi socket của phiên đó. */
export function disconnectSession(sessionId: number, reason: RevokeReason): void {
  if (!io) return;
  io.to(rooms.session(sessionId)).emit("session:revoked", { reason });
  io.in(rooms.session(sessionId)).disconnectSockets(true);
}
