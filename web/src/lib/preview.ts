// Trích tin cuối ở danh sách hội thoại (GS-25, FRS-10, 10-ui-ux.md mục 11.1):
// tin của mình "Bạn: …"; nhóm "Tên người gửi: …"; tin hệ thống hiện nguyên câu, chữ nghiêng.
import type { ConversationSummaryDto } from "../api/chat";

export type Preview = { text: string; italic: boolean };

export function previewOf(c: ConversationSummaryDto): Preview | null {
  const m = c.lastMessage;
  if (!m) return null;
  if (m.type === "system") return { text: m.preview, italic: true };
  if (m.isMine) return { text: `Bạn: ${m.preview}`, italic: false };
  if (c.type === "group" && m.senderDisplayName) return { text: `${m.senderDisplayName}: ${m.preview}`, italic: false };
  return { text: m.preview, italic: false };
}
