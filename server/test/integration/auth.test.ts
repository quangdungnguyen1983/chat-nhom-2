// IT-AUTH-01…12, IT-SES-01 (09 mục 13.1) – TK-01, TK-02, TK-03, TK-04 trên CSDL SQLite thật.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../../src/storage/prisma.js";
import { hashToken } from "../../src/modules/auth/session.service.js";
import { M } from "../../src/common/messages.js";
import { ORIGIN, REG_CODE, login, makeAgent, register, type Agent } from "../helpers/app.js";

let agent: Agent;
beforeAll(async () => {
  agent = await makeAgent();
});

describe("A0 GET /api/auth/registration-options – SC-01 listbox", () => {
  it("trả danh mục gồm tên tổ chức và mã đang cấu hình, không cần đăng nhập, không lưu cache", async () => {
    const res = await agent.get("/api/auth/registration-options");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ options: [{ label: "Tổ chức", code: REG_CODE }] });
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("A1 POST /api/auth/register – TK-01, TK-02", () => {
  it("TK-01-AC1: tạo tài khoản và đăng nhập được ngay", async () => {
    const res = await register(agent, { username: "NhanVien01" });
    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: expect.any(Number), username: "nhanvien01", displayName: "Nguyễn Văn An", avatarInitial: "A" });
    expect(JSON.stringify(res.body)).not.toContain("Matkhau123");
    expect(res.headers["set-cookie"]).toBeUndefined(); // không tự đăng nhập (GS-03)
    const { res: l } = await login(agent, "nhanvien01", "Matkhau123");
    expect(l.status).toBe(200);
  });

  it("TK-01-AC2: trùng tên khác hoa thường → 409 M-01, tổng số tài khoản không đổi", async () => {
    const before = await prisma().user.count();
    const res = await register(agent, { username: "NhanVien01" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: "USERNAME_TAKEN", message: M.M01 });
    expect(await prisma().user.count()).toBe(before);
  });

  it("TK-01-AC3: mã tổ chức sai → 400 M-05, không tạo tài khoản, kiểm tra TRƯỚC các trường khác", async () => {
    const before = await prisma().user.count();
    // Tên đã tồn tại + mã sai: vẫn chỉ báo M-05 (không lộ tên tồn tại).
    const res = await register(agent, { username: "nhanvien01", registrationCode: "sai-ma" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "INVALID_REGISTRATION_CODE", message: M.M05 });
    const empty = await register(agent, { username: "moi01", registrationCode: "" });
    expect(empty.body.error.code).toBe("INVALID_REGISTRATION_CODE");
    expect(await prisma().user.count()).toBe(before);
  });

  it("TK-02-AC2: mật khẩu sai quy tắc bị từ chối với đúng câu", async () => {
    const cases: Array<[string, string]> = [["abcdefgh", M.M07], ["12345678", M.M07], ["abc1234", M.M06], ["a1" + "b".repeat(63), M.M08]];
    for (const [pw, msg] of cases) {
      const res = await register(agent, { username: "pwtest", password: pw, passwordConfirm: pw });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.fields.password).toBe(msg);
    }
    expect(await prisma().user.findUnique({ where: { username: "pwtest" } })).toBeNull();
  });

  it("định dạng sai: tên đăng nhập, tên hiển thị, nhập lại mật khẩu", async () => {
    const res = await register(agent, { username: "an-nguyen", displayName: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toMatchObject({ username: M.M02, displayName: M.M03 });
    const mismatch = await register(agent, { username: "khop01", passwordConfirm: "Matkhau999" });
    expect(mismatch.body.error.fields).toEqual({ passwordConfirm: M.M04 });
  });

  it("TK-01-AC4: tên hiển thị có dấu lưu và trả lại đúng từng ký tự (kể cả nhập dạng NFD)", async () => {
    const res = await register(agent, { username: "dang.an", displayName: "Đặng Thị Ẩn".normalize("NFD") });
    expect(res.status).toBe(201);
    expect(res.body.user.displayName).toBe("Đặng Thị Ẩn");
    expect(res.body.user.avatarInitial).toBe("Ẩ");
    const row = await prisma().user.findUnique({ where: { username: "dang.an" } });
    expect(row?.displayName).toBe("Đặng Thị Ẩn");
  });

  it("chế độ nghiêm: trường lạ bị từ chối (GT-07)", async () => {
    const res = await agent.post("/api/auth/register").set("Origin", ORIGIN)
      .send({ username: "x01", password: "Matkhau123", passwordConfirm: "Matkhau123", displayName: "X", registrationCode: "test-only-registration-code", role: "admin" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.role).toBeDefined();
  });

  it("hai yêu cầu đăng ký trùng tên cùng lúc: chỉ một thành công", async () => {
    const [a, b] = await Promise.all([register(agent, { username: "dongthoi" }), register(agent, { username: "DongThoi" })]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma().user.count({ where: { username: "dongthoi" } })).toBe(1);
  });
});

describe("TK-02-AC3, AC4: mật khẩu chỉ lưu dạng băm, không xuất hiện trong log", () => {
  it("password_hash là argon2id và khác chuỗi gốc; log không chứa mật khẩu", async () => {
    const lines: string[] = [];
    const spyLog = vi.spyOn(console, "log").mockImplementation((...a) => { lines.push(a.join(" ")); });
    const spyErr = vi.spyOn(console, "error").mockImplementation((...a) => { lines.push(a.join(" ")); });
    const prev = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = "debug";
    try {
      await register(agent, { username: "logcheck", password: "Bimat2026xyz", passwordConfirm: "Bimat2026xyz" });
      await login(agent, "logcheck", "Bimat2026xyz");
      await login(agent, "logcheck", "Saimatkhau1");
    } finally {
      process.env.LOG_LEVEL = prev;
      spyLog.mockRestore();
      spyErr.mockRestore();
    }
    expect(lines.length).toBeGreaterThan(0); // log thật sự đã được ghi
    expect(lines.join("\n")).not.toMatch(/Bimat2026xyz|Saimatkhau1/);
    const row = await prisma().user.findUnique({ where: { username: "logcheck" } });
    expect(row!.passwordHash).not.toBe("Bimat2026xyz");
    expect(row!.passwordHash).toMatch(/^\$argon2id\$/);
  });
});

describe("A2/A3 đăng nhập – đăng xuất – TK-03", () => {
  it("IT-AUTH-06: đăng nhập đúng đặt cookie HttpOnly, SameSite=Lax; tên viết hoa đăng nhập được", async () => {
    const { res } = await login(agent, "NHANVIEN01", "Matkhau123");
    expect(res.status).toBe(200);
    const setCookie = (res.headers["set-cookie"] as unknown as string[])[0];
    expect(setCookie).toMatch(/^sid=[A-Za-z0-9_-]{43};/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Max-Age=28[78]\d\d/);
    expect(res.body.session.expiresAt).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toContain("sid");
  });

  it("token chỉ lưu dạng SHA-256 trong CSDL", async () => {
    const { cookie } = await login(agent, "nhanvien01", "Matkhau123");
    const token = cookie.split("=")[1];
    expect(await prisma().session.findFirst({ where: { tokenHash: token } })).toBeNull();
    expect(await prisma().session.findFirst({ where: { tokenHash: hashToken(token) } })).not.toBeNull();
  });

  it("TK-03-AC1: sai mật khẩu và tên không tồn tại cho CÙNG một phản hồi", async () => {
    const a = await login(agent, "nhanvien01", "SaiMatKhau1");
    const b = await login(agent, "khongtontai", "SaiMatKhau1");
    expect(a.res.status).toBe(401);
    expect(b.res.status).toBe(401);
    expect(a.res.body).toEqual(b.res.body);
    expect(a.res.body.error).toEqual({ code: "INVALID_CREDENTIALS", message: M.M09 });
    expect(a.res.headers["set-cookie"]).toBeUndefined();
  });

  it("thiếu trường đăng nhập → 400 M-35", async () => {
    const res = await agent.post("/api/auth/login").set("Origin", ORIGIN).send({ username: "nhanvien01" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(M.M35);
    const blank = await agent.post("/api/auth/login").set("Origin", ORIGIN).send({ username: "  ", password: "" });
    expect(blank.body.error.message).toBe(M.M35);
  });

  it("TK-03-AC2 (REST): sau đăng xuất, cookie cũ bị từ chối 401 dù còn hạn", async () => {
    const { cookie } = await login(agent, "nhanvien01", "Matkhau123");
    expect((await agent.get("/api/me").set("Cookie", cookie)).status).toBe(200);
    const out = await agent.post("/api/auth/logout").set("Origin", ORIGIN).set("Cookie", cookie);
    expect(out.status).toBe(204);
    expect((out.headers["set-cookie"] as unknown as string[])[0]).toMatch(/^sid=;.*Expires=Thu, 01 Jan 1970/);
    const again = await agent.get("/api/me").set("Cookie", cookie);
    expect(again.status).toBe(401);
    expect(again.body.error).toEqual({ code: "UNAUTHENTICATED", message: M.M31 });
    expect((await agent.post("/api/auth/logout").set("Origin", ORIGIN).set("Cookie", cookie)).status).toBe(401);
    const row = await prisma().session.findFirst({ where: { tokenHash: hashToken(cookie.split("=")[1]) } });
    expect(row?.revokedReason).toBe("logout");
  });

  it("TK-03-AC3 / IT-SES-01: phiên quá hạn bị từ chối ở yêu cầu kế tiếp", async () => {
    const { cookie } = await login(agent, "nhanvien01", "Matkhau123");
    const th = hashToken(cookie.split("=")[1]);
    const s = await prisma().session.findFirstOrThrow({ where: { tokenHash: th } });
    // Đưa phiên về quá khứ (giữ đúng CHECK expires_at > created_at).
    await prisma().session.update({ where: { id: s.id }, data: { createdAt: new Date(Date.now() - 9 * 3600_000), expiresAt: new Date(Date.now() - 1000) } });
    expect((await agent.get("/api/me").set("Cookie", cookie)).status).toBe(401);
  });

  it("không có cookie / cookie rác → 401", async () => {
    expect((await agent.get("/api/me")).status).toBe(401);
    expect((await agent.get("/api/me").set("Cookie", "sid=abc")).status).toBe(401);
  });

  it("GH-03: yêu cầu thay đổi dữ liệu có Origin lạ hoặc thiếu Origin → 403", async () => {
    const evil = await agent.post("/api/auth/login").set("Origin", "https://evil.example").send({ username: "nhanvien01", password: "Matkhau123" });
    expect(evil.status).toBe(403);
    expect(evil.body.error.code).toBe("FORBIDDEN_ORIGIN");
    const none = await agent.post("/api/auth/login").send({ username: "nhanvien01", password: "Matkhau123" });
    expect(none.status).toBe(403);
  });
});

describe("A4 PUT /api/me/password – TK-04", () => {
  const put = (cookie: string, body: object) => agent.put("/api/me/password").set("Origin", ORIGIN).set("Cookie", cookie).send(body);

  it("TK-04-AC2: mật khẩu hiện tại sai → 400 M-10 (không phải 401), mật khẩu cũ vẫn dùng được", async () => {
    await register(agent, { username: "doimk01" });
    const { cookie } = await login(agent, "doimk01", "Matkhau123");
    const res = await put(cookie, { currentPassword: "Sai12345", newPassword: "Matkhau456", newPasswordConfirm: "Matkhau456" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: "WRONG_CURRENT_PASSWORD", message: M.M10 });
    expect((await login(agent, "doimk01", "Matkhau123")).res.status).toBe(200);
  });

  it("mật khẩu mới sai quy tắc / trùng cũ / nhập lại không khớp", async () => {
    const { cookie } = await login(agent, "doimk01", "Matkhau123");
    const weak = await put(cookie, { currentPassword: "Matkhau123", newPassword: "abcdefgh", newPasswordConfirm: "abcdefgh" });
    expect(weak.body.error.fields.newPassword).toBe(M.M07);
    const same = await put(cookie, { currentPassword: "Matkhau123", newPassword: "Matkhau123", newPasswordConfirm: "Matkhau123" });
    expect(same.body.error).toMatchObject({ code: "SAME_PASSWORD", message: M.M11 });
    const mismatch = await put(cookie, { currentPassword: "Matkhau123", newPassword: "Matkhau456", newPasswordConfirm: "Matkhau457" });
    expect(mismatch.body.error.fields.newPasswordConfirm).toBe(M.M04);
    expect((await login(agent, "doimk01", "Matkhau123")).res.status).toBe(200);
  });

  it("TK-04-AC1 + AC3: đổi thành công; phiên hiện tại còn dùng, phiên khác bị hủy; mật khẩu cũ hết hiệu lực", async () => {
    const a = await login(agent, "doimk01", "Matkhau123"); // trình duyệt A
    const b = await login(agent, "doimk01", "Matkhau123"); // trình duyệt B
    const res = await put(a.cookie, { currentPassword: "Matkhau123", newPassword: "Matkhau456", newPasswordConfirm: "Matkhau456" });
    expect(res.status).toBe(204);
    expect((await agent.get("/api/me").set("Cookie", a.cookie)).status).toBe(200);
    expect((await agent.get("/api/me").set("Cookie", b.cookie)).status).toBe(401);
    const rowB = await prisma().session.findFirst({ where: { tokenHash: hashToken(b.cookie.split("=")[1]) } });
    expect(rowB?.revokedReason).toBe("password_change");
    expect((await login(agent, "doimk01", "Matkhau123")).res.status).toBe(401);
    expect((await login(agent, "doimk01", "Matkhau456")).res.status).toBe(200);
  });

  it("chưa đăng nhập → 401", async () => {
    const res = await agent.put("/api/me/password").set("Origin", ORIGIN).send({ currentPassword: "a", newPassword: "b", newPasswordConfirm: "b" });
    expect(res.status).toBe(401);
  });
});
