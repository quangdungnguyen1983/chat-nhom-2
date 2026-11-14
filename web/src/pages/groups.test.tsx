// SC-05 tạo nhóm, SC-04 hiển thị nhóm (tin hệ thống, tên người gửi), SC-06/06b theo vai trò.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Socket } from "socket.io-client";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { ChatPanel } from "./ChatPanel";
import { GroupInfoPanel } from "./GroupInfoPanel";

const user = (id: number, name: string) => ({ id, username: `u${id}`, displayName: name, avatarInitial: name.split(" ").at(-1)![0] });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
let calls: Array<{ url: string; method: string; body: any }> = [];
function mockFetch(handler: (url: string, method: string, body: any) => Response) {
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method: init?.method ?? "GET", body });
    return handler(url, init?.method ?? "GET", body);
  }));
}
beforeEach(() => { vi.unstubAllGlobals(); Element.prototype.scrollTo = () => {}; });

const detail = (myRole: "owner" | "member", members: Array<[number, string, "owner" | "member"]>) => ({
  id: 5, type: "group", title: "Phòng Kế hoạch", name: "Phòng Kế hoạch", avatarInitial: "P", otherUser: null, memberCount: members.length,
  myRole, lastMessage: null, lastMessageAt: null, unreadCount: 0,
  members: members.map(([id, n, role]) => ({ user: user(id, n), role })),
});

describe("SC-05 Tạo nhóm", () => {
  it("nút khóa khi chọn < 2 người (M-26); chọn 2 người → gửi đúng name + memberIds", async () => {
    mockFetch((url, method) => {
      if (url.startsWith("/api/users")) return json({ users: [user(2, "Trần Thị Bình"), user(3, "Lê Văn Cường")] });
      if (url === "/api/conversations/group" && method === "POST") return json({ conversation: detail("owner", [[1, "An", "owner"], [2, "Bình", "member"], [3, "Cường", "member"]]) }, 201);
      return json({}, 500);
    });
    const onCreated = vi.fn();
    render(<CreateGroupDialog onClose={() => {}} onCreated={onCreated} />);
    const u = userEvent.setup();
    await u.type(screen.getByLabelText("Tên nhóm"), "Phòng Kế hoạch");
    const btn = screen.getByRole("button", { name: "Tạo nhóm" });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Đã chọn: 0 người – Hãy chọn ít nhất 2 thành viên\./)).toBeInTheDocument();
    await u.type(screen.getByLabelText("Thêm thành viên"), "a");
    await u.click(await screen.findByRole("button", { name: /Trần Thị Bình/ }));
    expect(btn).toBeDisabled();
    await u.click(screen.getByRole("button", { name: /Lê Văn Cường/ }));
    expect(screen.getByText("Đã chọn: 2 người")).toBeInTheDocument();
    await u.click(btn);
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(calls.find((c) => c.url === "/api/conversations/group")!.body).toEqual({ name: "Phòng Kế hoạch", memberIds: [2, 3] });
  });
});

describe("SC-04 nhóm", () => {
  it("tin hệ thống căn giữa không avatar; tin người khác có tên người gửi; tiêu đề có số thành viên + nút Thông tin nhóm", async () => {
    mockFetch((url) => url.includes("/messages")
      ? json({ hasMore: false, nextCursor: 1, messages: [
          { id: 1, conversationId: 5, type: "system", content: 'Nguyễn Văn An đã tạo nhóm "Phòng Kế hoạch"', sender: null, eventType: "group_created", clientMessageId: null, createdAt: "2026-11-14T03:00:00Z" },
          { id: 2, conversationId: 5, type: "text", content: "Chào cả nhóm", sender: user(2, "Trần Thị Bình"), eventType: null, clientMessageId: null, createdAt: "2026-11-14T03:01:00Z" },
        ] })
      : json({ conversationId: 5, unreadCount: 0, totalUnread: 0 }));
    const s = { connected: true, on: () => s, off: () => s, timeout: () => ({ emitWithAck: vi.fn() }) };
    const onShowInfo = vi.fn();
    const conv = { ...detail("member", [[1, "A", "owner"], [2, "B", "member"], [3, "C", "member"]]) } as any;
    render(<ChatPanel conversation={conv} meId={3} socket={s as unknown as Socket} onBack={() => {}} onForbidden={() => {}} onShowInfo={onShowInfo} />);
    const sys = await screen.findByText('Nguyễn Văn An đã tạo nhóm "Phòng Kế hoạch"');
    expect(sys.closest(".system-msg")).not.toBeNull();
    expect(sys.closest(".system-msg")!.querySelector(".avatar")).toBeNull();
    const bubble = screen.getByText("Chào cả nhóm").closest(".bubble-row")!;
    expect(within(bubble as HTMLElement).getByText("Trần Thị Bình")).toBeInTheDocument();
    expect(bubble.querySelector(".avatar")!.textContent).toBe("B");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Phòng Kế hoạch · 3 thành viên");
    await userEvent.setup().click(screen.getByRole("button", { name: "Thông tin nhóm" }));
    expect(onShowInfo).toHaveBeenCalled();
  });
});

describe("SC-06 / SC-06b theo vai trò", () => {
  it("thành viên thường: không có Sửa tên / Xóa / Thêm thành viên; chỉ có Rời nhóm", async () => {
    mockFetch(() => json({ conversation: detail("member", [[1, "Nguyễn Văn An", "owner"], [2, "Trần Thị Bình", "member"], [3, "Lê Văn Cường", "member"]]) }));
    render(<GroupInfoPanel conversationId={5} meId={2} refreshKey={0} onClose={() => {}} onLeft={() => {}} />);
    expect(await screen.findByText("Thành viên (3)")).toBeInTheDocument();
    expect(screen.getByText(/· Trưởng nhóm/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sửa tên" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xóa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Thêm thành viên" })).toBeNull();
    expect(screen.getByRole("button", { name: "Rời nhóm" })).toBeEnabled();
  });

  it("trưởng nhóm rời: nút khóa tới khi chọn trưởng nhóm mới; gửi newOwnerId", async () => {
    mockFetch((url, method) => method === "POST" ? new Response(null, { status: 204 })
      : json({ conversation: detail("owner", [[1, "Nguyễn Văn An", "owner"], [2, "Trần Thị Bình", "member"]]) }));
    const onLeft = vi.fn();
    render(<GroupInfoPanel conversationId={5} meId={1} refreshKey={0} onClose={() => {}} onLeft={onLeft} />);
    const u = userEvent.setup();
    expect(await screen.findByRole("button", { name: "Xóa" })).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "Rời nhóm" }));
    const dlg = screen.getByRole("dialog", { name: "Rời nhóm" });
    expect(within(dlg).getByText('Rời nhóm "Phòng Kế hoạch"? Bạn sẽ không xem được lịch sử nhóm nữa.')).toBeInTheDocument();
    const leave = within(dlg).getByRole("button", { name: "Rời nhóm" });
    expect(leave).toBeDisabled();
    await u.selectOptions(within(dlg).getByLabelText("Chọn trưởng nhóm mới"), "2");
    expect(leave).toBeEnabled();
    await u.click(leave);
    await waitFor(() => expect(onLeft).toHaveBeenCalled());
    expect(calls.find((c) => c.url === "/api/conversations/5/leave")!.body).toEqual({ newOwnerId: 2 });
  });

  it("trưởng nhóm một mình: M-28 và nút Rời nhóm bị khóa", async () => {
    mockFetch(() => json({ conversation: detail("owner", [[1, "Nguyễn Văn An", "owner"]]) }));
    render(<GroupInfoPanel conversationId={5} meId={1} refreshKey={0} onClose={() => {}} onLeft={() => {}} />);
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Rời nhóm" }));
    const dlg = screen.getByRole("dialog", { name: "Rời nhóm" });
    expect(within(dlg).getByText("Bạn là thành viên duy nhất của nhóm nên chưa thể rời nhóm.")).toBeInTheDocument();
    expect(within(dlg).getByRole("button", { name: "Rời nhóm" })).toBeDisabled();
  });
});
