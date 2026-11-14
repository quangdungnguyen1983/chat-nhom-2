import { api, type UserDto } from "./client";

export type MessageDto = {
  id: number; conversationId: number; type: "text" | "system"; content: string;
  sender: UserDto | null; eventType: string | null; clientMessageId: string | null; createdAt: string;
};
export type ConversationSummaryDto = {
  id: number; type: "direct" | "group"; title: string; avatarInitial: string; otherUser: UserDto | null;
  memberCount: number; myRole: "owner" | "member";
  lastMessage: null | { id: number; type: "text" | "system"; preview: string; senderDisplayName: string | null; isMine: boolean; createdAt: string };
  lastMessageAt: string | null; unreadCount: number;
};
export type MessagePage = { messages: MessageDto[]; hasMore: boolean; nextCursor: number | null };

export const openDirect = (userId: number) =>
  api<{ conversation: ConversationSummaryDto }>("POST", "/api/conversations/direct", { userId });
export const listConversations = () =>
  api<{ conversations: ConversationSummaryDto[]; totalUnread: number }>("GET", "/api/conversations");
export const getMessages = (id: number, before?: number) =>
  api<MessagePage>("GET", `/api/conversations/${id}/messages${before ? `?before=${before}` : ""}`);
/** Tin bị lỡ sau khi mất kết nối (09 C4 `after`, GL-06). */
export const getMessagesAfter = (id: number, after: number) =>
  api<MessagePage>("GET", `/api/conversations/${id}/messages?after=${after}`);
export const markRead = (id: number) =>
  api<{ conversationId: number; unreadCount: number; totalUnread: number }>("POST", `/api/conversations/${id}/read`, {});
