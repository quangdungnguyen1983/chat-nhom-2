// SC-04 với socket giả lập: gửi qua WebSocket (emitWithAck), Enter / IME, giới hạn 5000, tin realtime.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Socket } from "socket.io-client";
import { ChatPanel } from "./ChatPanel";

const conv = { id: 7, type: "direct" as const, title: "Trần Thị Bình", avatarInitial: "B", otherUser: { id: 2, username: "b", displayName: "Trần Thị Bình", avatarInitial: "B" },
  memberCount: 2, myRole: "member" as const, lastMessage: null, lastMessageAt: null, unreadCount: 0 };
const msg = (id: number, senderId: number, content: string, clientMessageId: string | null = null) => ({
  id, conversationId: 7, type: "text", content, sender: { id: senderId, username: "u" + senderId, displayName: "U" + senderId, avatarInitial: "U" },
  eventType: null, clientMessageId, createdAt: "2026-11-14T03:00:00.000Z" });

function fakeSocket(ackImpl: (payload: any) => any) {
  const handlers = new Map<string, Set<(p: any) => void>>();
  const emitWithAck = vi.fn(async (_ev: string, payload: any) => ackImpl(payload));
  const s = {
    connected: true,
    on: (ev: string, h: any) => { if (!handlers.has(ev)) handlers.set(ev, new Set()); handlers.get(ev)!.add(h); return s; },
    off: (ev: string, h: any) => { handlers.get(ev)?.delete(h); return s; },
    timeout: () => ({ emitWithAck }),
    fire: (ev: string, p: any) => handlers.get(ev)?.forEach((h) => h(p)),
    emitWithAck,
  };
  return s;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  Element.prototype.scrollTo = () => {};
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(
    url.includes("/messages") ? { messages: [msg(1, 2, "Chào An\n\nDòng ba")], hasMore: false, nextCursor: 1 } : { conversationId: 7, unreadCount: 0, totalUnread: 0 },
  ), { status: 200, headers: { "Content-Type": "application/json" } })));
});

const renderPanel = (s: ReturnType<typeof fakeSocket>) =>
  render(<ChatPanel conversation={conv} meId={1} socket={s as unknown as Socket} onBack={() => {}} onForbidden={() => {}} />);

describe("SC-04 ChatPanel", () => {
  it("hiển thị lịch sử giữ xuống dòng; Enter gửi qua message:send KHÔNG kèm senderId; tin tạm được thay bằng tin chính thức", async () => {
    const s = fakeSocket((p) => ({ ok: true, duplicate: false, message: msg(2, 1, p.content, p.clientMessageId) }));
    renderPanel(s);
    expect((await screen.findByText(/Chào An/)).textContent).toBe("Chào An\n\nDòng ba");
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Nhập tin nhắn"), "Xin chào{Shift>}{Enter}{/Shift}dòng hai{Enter}");
    await waitFor(() => expect(s.emitWithAck).toHaveBeenCalledTimes(1));
    const [ev, payload] = s.emitWithAck.mock.calls[0];
    expect(ev).toBe("message:send");
    expect(Object.keys(payload).sort()).toEqual(["clientMessageId", "content", "conversationId"]);
    expect(payload).toMatchObject({ conversationId: 7, content: "Xin chào\ndòng hai" });
    await waitFor(() => expect(screen.queryByText("đang gửi…")).not.toBeInTheDocument());
    const texts = [...document.querySelectorAll(".bubble-text")].map((e) => e.textContent);
    expect(texts.filter((t) => t === "Xin chào\ndòng hai")).toHaveLength(1);
  });

  it("không gửi khi bộ gõ đang ghép chữ (isComposing)", async () => {
    const s = fakeSocket(() => ({ ok: true }));
    renderPanel(s);
    const box = await screen.findByLabelText("Nhập tin nhắn");
    fireEvent.change(box, { target: { value: "Việt" } });
    fireEvent.keyDown(box, { key: "Enter", isComposing: true });
    expect(s.emitWithAck).not.toHaveBeenCalled();
  });

  it("5001 ký tự: hiện M-17, nút Gửi bị khóa; 5000 thì gửi được", async () => {
    const s = fakeSocket(() => ({ ok: true }));
    renderPanel(s);
    const box = await screen.findByLabelText("Nhập tin nhắn");
    fireEvent.change(box, { target: { value: "a".repeat(5001) } });
    expect(screen.getByText("Tin nhắn vượt quá 5.000 ký tự (hiện có 5.001 ký tự).")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi" })).toBeDisabled();
    fireEvent.change(box, { target: { value: "a".repeat(5000) } });
    expect(screen.getByText("5.000 / 5.000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gửi" })).toBeEnabled();
  });

  it("gửi thất bại (không ack) → ⚠ Gửi lại với CÙNG clientMessageId", async () => {
    let n = 0;
    const s = fakeSocket((p) => { n++; if (n === 1) throw new Error("timeout"); return { ok: true, duplicate: false, message: msg(3, 1, p.content, p.clientMessageId) }; });
    renderPanel(s);
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("Nhập tin nhắn"), "thử lại{Enter}");
    const retry = await screen.findByRole("button", { name: "Gửi lại" });
    await u.click(retry);
    await waitFor(() => expect(s.emitWithAck).toHaveBeenCalledTimes(2));
    expect(s.emitWithAck.mock.calls[0][1].clientMessageId).toBe(s.emitWithAck.mock.calls[1][1].clientMessageId);
    await waitFor(() => expect(screen.queryByText("Gửi lại")).not.toBeInTheDocument());
  });

  it("message:new của người kia hiện ngay, <script> hiện nguyên văn", async () => {
    const s = fakeSocket(() => ({ ok: true }));
    renderPanel(s);
    await screen.findByText(/Chào An/);
    act(() => s.fire("message:new", { message: msg(9, 2, "<script>alert(1)</script>") }));
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    act(() => s.fire("message:new", { message: { ...msg(10, 2, "hội thoại khác"), conversationId: 99 } }));
    expect(screen.queryByText("hội thoại khác")).not.toBeInTheDocument();
  });
});
