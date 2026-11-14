// Test giao diện SCR-01, SCR-02 với fetch giả lập (không cần máy chủ).
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth";
import { App } from "../App";

type Handler = (url: string, init?: RequestInit) => { status: number; body?: unknown };
const ORG = { label: "Công ty Thử", code: "ma-to-chuc-thu" };
function mockFetch(handler: Handler) {
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = url === "/api/auth/registration-options"
      ? { status: 200, body: { options: [ORG] } }
      : handler(url, init);
    return new Response(status === 204 ? null : JSON.stringify(body ?? {}), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

const unauth = { status: 401, body: { error: { code: "UNAUTHENTICATED", message: "x" } } };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.unstubAllGlobals());

describe("SCR-01 Đăng ký", () => {
  it("báo lỗi sớm ở trình duyệt, không gửi yêu cầu khi dữ liệu sai", async () => {
    const fetch = mockFetch((url) => (url === "/api/me" ? unauth : { status: 500 }));
    renderAt("/dang-ky");
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("Tên đăng nhập"), "an-nguyen");
    await u.type(screen.getByLabelText("Mật khẩu"), "abcdefgh");
    await u.click(screen.getByRole("button", { name: "Đăng ký" }));
    expect(screen.getByText(/Tên đăng nhập dài 3–30 ký tự/)).toBeInTheDocument();
    expect(screen.getByText("Mật khẩu phải có cả chữ cái và chữ số.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tên đăng nhập")).toHaveAttribute("aria-invalid", "true");
    expect(fetch.mock.calls.filter(([url]) => url === "/api/auth/register")).toHaveLength(0);
  });

  it("danh sách kiểm tra mật khẩu cập nhật theo từng phím", async () => {
    mockFetch(() => unauth);
    renderAt("/dang-ky");
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("Mật khẩu"), "abc");
    const list = screen.getByRole("list", { name: "Yêu cầu mật khẩu" });
    expect(list.querySelectorAll("li.ok")).toHaveLength(1);
    await u.type(screen.getByLabelText("Mật khẩu"), "12345");
    expect(list.querySelectorAll("li.ok")).toHaveLength(3);
  });

  it("thành công → chuyển sang Đăng nhập, hiện M-40 và điền sẵn tên đăng nhập", async () => {
    mockFetch((url) => url === "/api/auth/register"
      ? { status: 201, body: { user: { id: 1, username: "nhanvien01", displayName: "Nguyễn Văn An", avatarInitial: "A" } } }
      : unauth);
    renderAt("/dang-ky");
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("Tên đăng nhập"), "NhanVien01");
    await u.type(screen.getByLabelText("Tên hiển thị"), "Nguyễn Văn An");
    await u.type(screen.getByLabelText("Mật khẩu"), "Matkhau123");
    await u.type(screen.getByLabelText("Nhập lại mật khẩu"), "Matkhau123");
    await waitFor(() => expect(screen.getByLabelText("Mã đăng ký tổ chức")).toHaveValue(ORG.code)); // chọn sẵn khi chỉ có 1
    await u.click(screen.getByRole("button", { name: "Đăng ký" }));
    expect(await screen.findByText("Đăng ký thành công. Vui lòng đăng nhập.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tên đăng nhập")).toHaveValue("nhanvien01");
  });

  it("hiện lỗi máy chủ dưới đúng ô (M-01)", async () => {
    mockFetch((url) => url === "/api/auth/register"
      ? { status: 409, body: { error: { code: "USERNAME_TAKEN", message: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.", fields: { username: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." } } } }
      : unauth);
    renderAt("/dang-ky");
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("Tên đăng nhập"), "nhanvien01");
    await u.type(screen.getByLabelText("Tên hiển thị"), "An");
    await u.type(screen.getByLabelText("Mật khẩu"), "Matkhau123");
    await u.type(screen.getByLabelText("Nhập lại mật khẩu"), "Matkhau123");
    await u.selectOptions(await screen.findByRole("combobox", { name: "Mã đăng ký tổ chức" }), ORG.code);
    await u.click(screen.getByRole("button", { name: "Đăng ký" }));
    expect(await screen.findByText("Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác.")).toBeInTheDocument();
  });
});

describe("SC-01 listbox Mã đăng ký tổ chức", () => {
  it("lấy danh mục từ máy chủ, hiện tên kèm mã và gửi đúng mã khi đăng ký", async () => {
    const fetch = mockFetch((url) => url === "/api/auth/register"
      ? { status: 201, body: { user: { id: 1, username: "nv02", displayName: "B", avatarInitial: "B" } } }
      : unauth);
    renderAt("/dang-ky");
    const u = userEvent.setup();
    const box = await screen.findByRole("combobox", { name: "Mã đăng ký tổ chức" });
    expect(await screen.findByRole("option", { name: "Công ty Thử (ma-to-chuc-thu)" })).toBeInTheDocument();
    await u.type(screen.getByLabelText("Tên đăng nhập"), "nv02");
    await u.type(screen.getByLabelText("Tên hiển thị"), "B");
    await u.type(screen.getByLabelText("Mật khẩu"), "Matkhau123");
    await u.type(screen.getByLabelText("Nhập lại mật khẩu"), "Matkhau123");
    expect(box).toHaveValue(ORG.code);
    await u.click(screen.getByRole("button", { name: "Đăng ký" }));
    await screen.findByText("Đăng ký thành công. Vui lòng đăng nhập.");
    const call = fetch.mock.calls.find(([url]) => url === "/api/auth/register");
    expect(JSON.parse(String(call?.[1]?.body)).registrationCode).toBe(ORG.code);
  });
});

describe("SCR-02 Đăng nhập", () => {
  it("trống → M-35 và không gọi API; sai → M-09", async () => {
    const fetch = mockFetch((url) => url === "/api/auth/login"
      ? { status: 401, body: { error: { code: "INVALID_CREDENTIALS", message: "Tên đăng nhập hoặc mật khẩu không đúng." } } }
      : unauth);
    renderAt("/dang-nhap");
    const u = userEvent.setup();
    await u.click(await screen.findByRole("button", { name: "Đăng nhập" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Vui lòng nhập đủ tên đăng nhập và mật khẩu.");
    expect(fetch.mock.calls.filter(([url]) => url === "/api/auth/login")).toHaveLength(0);
    await u.type(screen.getByLabelText("Tên đăng nhập"), "a");
    await u.type(screen.getByLabelText("Mật khẩu"), "b");
    await u.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByText("Tên đăng nhập hoặc mật khẩu không đúng.")).toBeInTheDocument();
  });

  it("nút hiện/ẩn mật khẩu", async () => {
    mockFetch(() => unauth);
    renderAt("/dang-nhap");
    const u = userEvent.setup();
    const pw = await screen.findByLabelText("Mật khẩu");
    expect(pw).toHaveAttribute("type", "password");
    await u.click(screen.getByRole("button", { name: "Hiện mật khẩu" }));
    expect(pw).toHaveAttribute("type", "text");
  });

  it("đúng → vào trang chính; phiên hết hạn khi tìm → M-31 và về đăng nhập", async () => {
    let loggedIn = false;
    mockFetch((url) => {
      if (url === "/api/auth/login") { loggedIn = true; return { status: 200, body: { user: { id: 2, username: "an", displayName: "Nguyễn Văn An", avatarInitial: "A" }, session: { expiresAt: "2099-01-01T00:00:00Z" } } }; }
      if (url === "/api/me") return loggedIn ? { status: 200, body: {} } : unauth;
      if (url.startsWith("/api/users")) return unauth; // phiên bị hủy ở nơi khác
      return { status: 500 };
    });
    renderAt("/dang-nhap");
    const u = userEvent.setup();
    await u.type(await screen.findByLabelText("Tên đăng nhập"), "an");
    await u.type(screen.getByLabelText("Mật khẩu"), "Matkhau123");
    await u.click(screen.getByRole("button", { name: "Đăng nhập" }));
    const search = await screen.findByPlaceholderText("Tìm đồng nghiệp…");
    await u.type(search, "bình");
    await waitFor(() => expect(screen.getByText("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
  });
});
