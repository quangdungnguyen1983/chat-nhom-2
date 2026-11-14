// Hành vi bổ sung để khớp wireframe/ui-design: dòng ngày, tin hệ thống, GF-10, GF-15, tải tin bị lỡ, SC-03 trích tin + skeleton.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Socket } from "socket.io-client";
import { ChatPanel } from "./ChatPanel";

const u = (id: number, n: string) => ({ id, username: `u${id}`, displayName: n, avatarInitial: n.at(0)! });
const msg = (id: number, sender: ReturnType<typeof u> | null, content: string, createdAt: string, type: "text" | "system" = "text") =>
  ({ id, conversationId: 7, type, content, sender, eventType: type === "system" ? "group_created" : null, clientMessageId: null, createdAt });
const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });
const conv = { id: 7, type: "group" as const, title: "Phòng Kế hoạch", avatarInitial: "P", otherUser: null, memberCount: 3, myRole: "member" as const, lastMessage: null, lastMessageAt: null, unreadCount: 0 };

function fakeSocket() {
  const h = new Map<string, Set<(p?: any) => void>>();
  const s = {
    connected: true,
    on: (e: string, f: any) => { if (!h.has(e)) h.set(e, new Set()); h.get(e)!.add(f); return s; },
    off: (e: string, f: any) => { h.get(e)?.delete(f); return s; },
    timeout: () => ({ emitWithAck: vi.fn(async () => ({ ok: true })) }),
    fire: (e: string, p?: any) => h.get(e)?.forEach((f) => f(p)),
  };
  return s;
}

const today = new Date(); today.setHours(9, 5, 0, 0);
const yesterday = new Date(today.getTime() - 86_400_000);
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.unstubAllGlobals();
  Element.prototype.scrollTo = () => {};
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes("after=")) return json({ messages: [msg(4, u(2, "Bình"), "Tin bị lỡ khi mất mạng", today.toISOString())], hasMore: false, nextCursor: 4 });
    if (url.includes("/messages")) return json({ hasMore: false, nextCursor: 1, messages: [
      msg(1, null, 'An đã tạo nhóm "Phòng Kế hoạch"', yesterday.toISOString(), "system"),
      msg(2, u(2, "Bình"), "Hôm qua nói", yesterday.toISOString()),
      msg(3, u(2, "Bình"), "Hôm nay nói", today.toISOString()),
    ] });
    return json({ conversationId: 7, unreadCount: 0, totalUnread: 0 });
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderPanel = (s: ReturnType<typeof fakeSocket>) =>
  render(<ChatPanel conversation={conv} meId={1} socket={s as unknown as Socket} onBack={() => {}} onForbidden={() => {}} />);

describe("SC-04 theo ui-design", () => {
  it("dòng ngày 'Hôm qua' / 'Hôm nay' và tin hệ thống dạng 'nội dung · HH:MM'", async () => {
    renderPanel(fakeSocket());
    await screen.findByText("Hôm nay nói");
    expect([...document.querySelectorAll(".day-sep")].map((e) => e.textContent)).toEqual(["Hôm qua", "Hôm nay"]);
    const hh = String(yesterday.getHours()).padStart(2, "0"), mm = String(yesterday.getMinutes()).padStart(2, "0");
    expect(document.querySelector(".system-msg")!.textContent).toBe(`An đã tạo nhóm "Phòng Kế hoạch" · ${hh}:${mm}`);
  });

  it("GF-10: trên thiết bị cảm ứng Enter KHÔNG gửi (xuống dòng); máy tính Enter gửi", async () => {
    const s = fakeSocket();
    const send = vi.fn(async () => ({ ok: true, duplicate: false, message: msg(9, u(1, "An"), "x", today.toISOString()) }));
    s.timeout = () => ({ emitWithAck: send });
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(pointer: coarse)", media: q, addEventListener() {}, removeEventListener() {} }));
    renderPanel(s);
    const box = await screen.findByLabelText("Nhập tin nhắn");
    fireEvent.change(box, { target: { value: "dòng 1" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(send).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole("button", { name: "Gửi" }));
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("GF-15: đang đọc tin cũ (không ở đáy) mà có tin mới → nút 'Có tin nhắn mới ↓'; bấm thì ẩn", async () => {
    const s = fakeSocket();
    renderPanel(s);
    await screen.findByText("Hôm nay nói");
    const log = screen.getByRole("log");
    Object.defineProperty(log, "scrollHeight", { configurable: true, value: 2000 });
    Object.defineProperty(log, "clientHeight", { configurable: true, value: 400 });
    log.scrollTop = 500;
    fireEvent.scroll(log);
    act(() => s.fire("message:new", { message: msg(5, u(2, "Bình"), "Tin mới đến", today.toISOString()) }));
    const btn = screen.getByRole("button", { name: "Có tin nhắn mới ↓" });
    await userEvent.setup().click(btn);
    expect(screen.queryByRole("button", { name: "Có tin nhắn mới ↓" })).toBeNull();
  });

  it("GL-06: kết nối lại → gọi ?after=<mã tin cuối> và chèn tin bị lỡ", async () => {
    const s = fakeSocket();
    renderPanel(s);
    await screen.findByText("Hôm nay nói");
    act(() => s.fire("disconnect"));
    expect(screen.getByText("Mất kết nối. Đang thử kết nối lại…")).toBeInTheDocument();
    act(() => s.fire("connect"));
    await screen.findByText("Tin bị lỡ khi mất mạng");
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/messages?after=3"))).toBe(true);
    expect(screen.queryByText("Mất kết nối. Đang thử kết nối lại…")).toBeNull();
  });
});

describe("SC-03 theo ui-design", () => {
  it("5 dòng skeleton khi tải; trích tin nhóm 'Tên người gửi:', tin hệ thống in nghiêng; 'Hôm qua'", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/me") return json({ user: u(1, "An"), session: { expiresAt: "2099-01-01T00:00:00Z" } });
      if (url === "/api/conversations") {
        await gate;
        return json({ totalUnread: 2, conversations: [
          { ...conv, id: 7, lastMessageAt: today.toISOString(), unreadCount: 2,
            lastMessage: { id: 3, type: "text", preview: "Họp lúc 9h", senderDisplayName: "Lê Cường", isMine: false, createdAt: today.toISOString() } },
          { ...conv, id: 8, title: "Nhóm Đổi Mới 2026", avatarInitial: "2", lastMessageAt: yesterday.toISOString(),
            lastMessage: { id: 2, type: "system", preview: "Đặng Thị Ẩn đã rời nhóm", senderDisplayName: null, isMine: false, createdAt: yesterday.toISOString() } },
        ] });
      }
      return json({});
    }));
    const { AuthProvider } = await import("../auth");
    const { App } = await import("../App");
    render(<MemoryRouter initialEntries={["/"]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    await screen.findByLabelText("Đang tải danh sách hội thoại");
    expect(document.querySelectorAll(".skeleton-row")).toHaveLength(5);
    release();
    expect(await screen.findByText("Lê Cường: Họp lúc 9h")).toBeInTheDocument();
    const sys = screen.getByText("Đặng Thị Ẩn đã rời nhóm");
    expect(sys).toHaveClass("italic");
    expect(screen.getByText("Hôm qua")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tạo nhóm" })).toHaveTextContent("+ Tạo nhóm");
  });
});
