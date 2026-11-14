// Kiểu dữ liệu trả ra API / sự kiện (09-detailed-design.md mục 6.2).
import { avatarInitial } from "./avatar.js";
export function toUserDto(u) {
    return { id: u.id, username: u.username, displayName: u.displayName, avatarInitial: avatarInitial(u.displayName) };
}
export function toMessageDto(m) {
    return {
        id: m.id,
        conversationId: m.conversationId,
        type: m.type,
        content: m.content,
        sender: m.sender ? toUserDto(m.sender) : null,
        eventType: m.eventType,
        clientMessageId: m.clientMsgId,
        createdAt: m.createdAt.toISOString(),
    };
}
export const PREVIEW_CHARS = 100; // GT-13
export const preview = (s) => Array.from(s).slice(0, PREVIEW_CHARS).join("");
