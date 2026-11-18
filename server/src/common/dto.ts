// Kiểu dữ liệu trả ra API / sự kiện (09-detailed-design.md mục 6.2).
import { toFormatDto, type MessageFormat } from "./message-format.js";
import { IMAGE_MIMES } from "./attachments.js";
import { avatarInitial } from "./avatar.js";

export type UserDto = {
  id: number;
  username: string;
  displayName: string;
  avatarInitial: string;
};

export function toUserDto(u: { id: number; username: string; displayName: string }): UserDto {
  return { id: u.id, username: u.username, displayName: u.displayName, avatarInitial: avatarInitial(u.displayName) };
}

export type MessageDto = {
  id: number;
  conversationId: number;
  type: "text" | "system";
  content: string;
  sender: UserDto | null; // tên HIỆN TẠI của người gửi (GS-12)
  eventType: string | null;
  clientMessageId: string | null;
  createdAt: string;
  format: MessageFormat | null; // phông/cỡ/màu chữ người gửi chọn; null = mặc định
  attachment: AttachmentDto | null; // tệp đính kèm (2026-11-18)
};

export type AttachmentDto = { id: number; fileName: string; mimeType: string; size: number; isImage: boolean };

export type MessageRow = {
  id: number;
  conversationId: number;
  type: string;
  content: string;
  eventType: string | null;
  clientMsgId: string | null;
  createdAt: Date;
  fmtFont?: string | null;
  fmtSize?: string | null;
  fmtColor?: string | null;
  attachment?: { id: number; fileName: string; mimeType: string; sizeBytes: number } | null;
  sender: { id: number; username: string; displayName: string } | null;
};

export function toMessageDto(m: MessageRow): MessageDto {
  return {
    id: m.id,
    conversationId: m.conversationId,
    type: m.type as MessageDto["type"],
    content: m.content,
    sender: m.sender ? toUserDto(m.sender) : null,
    eventType: m.eventType,
    clientMessageId: m.clientMsgId,
    createdAt: m.createdAt.toISOString(),
    format: m.type === "text" ? toFormatDto(m) : null,
    attachment: m.attachment
      ? { id: m.attachment.id, fileName: m.attachment.fileName, mimeType: m.attachment.mimeType, size: m.attachment.sizeBytes, isImage: IMAGE_MIMES.has(m.attachment.mimeType) }
      : null,
  };
}

export type ConversationSummaryDto = {
  id: number;
  type: "direct" | "group";
  title: string;
  avatarInitial: string;
  otherUser: UserDto | null;
  memberCount: number;
  myRole: "owner" | "member";
  lastMessage: null | {
    id: number;
    type: "text" | "system";
    preview: string;
    senderDisplayName: string | null;
    isMine: boolean;
    createdAt: string;
  };
  lastMessageAt: string | null;
  unreadCount: number; // 0…100; 100 nghĩa là "100 trở lên"
};

export type ConversationDetailDto = ConversationSummaryDto & {
  name: string | null;
  members: Array<{ user: UserDto; role: "owner" | "member" }>;
};

export const PREVIEW_CHARS = 100; // GT-13
export const preview = (s: string): string => Array.from(s).slice(0, PREVIEW_CHARS).join("");
