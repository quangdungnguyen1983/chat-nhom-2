import { describe, expect, it } from "vitest";
import { previewOf } from "./preview";

const base = { id: 1, title: "X", avatarInitial: "X", otherUser: null, memberCount: 3, myRole: "member" as const, lastMessageAt: null, unreadCount: 0 };
const lm = (o: object) => ({ id: 9, type: "text" as const, preview: "Họp lúc 9h", senderDisplayName: "Lê Cường", isMine: false, createdAt: "2026-11-14T03:00:00Z", ...o });

describe("GS-25 – trích tin cuối", () => {
  it("nhóm: 'Tên người gửi: …'; 1-1: chỉ nội dung; của mình: 'Bạn: …'", () => {
    expect(previewOf({ ...base, type: "group", lastMessage: lm({}) })).toEqual({ text: "Lê Cường: Họp lúc 9h", italic: false });
    expect(previewOf({ ...base, type: "direct", lastMessage: lm({}) })).toEqual({ text: "Họp lúc 9h", italic: false });
    expect(previewOf({ ...base, type: "group", lastMessage: lm({ isMine: true }) })).toEqual({ text: "Bạn: Họp lúc 9h", italic: false });
  });
  it("tin hệ thống: nguyên câu, chữ nghiêng; chưa có tin → null", () => {
    expect(previewOf({ ...base, type: "group", lastMessage: lm({ type: "system", senderDisplayName: null, preview: "A đã rời nhóm" }) }))
      .toEqual({ text: "A đã rời nhóm", italic: true });
    expect(previewOf({ ...base, type: "direct", lastMessage: null })).toBeNull();
  });
});
