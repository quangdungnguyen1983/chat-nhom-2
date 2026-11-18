import { api, type UserDto } from "./client";
import type { MessageFormat } from "../lib/message-format";

export type MessageDto = {
  id: number; conversationId: number; type: "text" | "system"; content: string;
  sender: UserDto | null; eventType: string | null; clientMessageId: string | null; createdAt: string;
  format?: MessageFormat | null; // phông/cỡ/màu chữ người gửi chọn
  attachment?: AttachmentDto | null; // tệp đính kèm
};
export type AttachmentDto = { id: number; fileName: string; mimeType: string; size: number; isImage: boolean };
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

/** Gửi tệp đính kèm (tối đa 4 MB) kèm chú thích tùy chọn. */
export const sendAttachment = (conversationId: number, file: Blob, fileName: string, clientMessageId: string, caption?: string) =>
  api<{ message: MessageDto; duplicate: boolean }>("POST", `/api/conversations/${conversationId}/attachments`, file, {
    headers: {
      "X-File-Name": encodeURIComponent(fileName),
      "X-Client-Message-Id": clientMessageId,
      ...(caption ? { "X-Caption": encodeURIComponent(caption) } : {}),
    },
  });

export const attachmentUrl = (id: number) => `/api/attachments/${id}`;
