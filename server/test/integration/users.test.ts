// IT-USR-01…07 (09 mục 13.1) – TK-05, TK-06.
import { beforeAll, describe, expect, it } from "vitest";
import { M } from "../../src/common/messages.js";
import { ORIGIN, login, makeAgent, register, type Agent } from "../helpers/app.js";

let agent: Agent;
let anCookie: string;
let otherCookie: string;

beforeAll(async () => {
  agent = await makeAgent();
  await register(agent, { username: "an.nguyen", displayName: "Nguyễn Văn An" });
  await register(agent, { username: "dang.an", displayName: "Đặng Thị Ẩn" });
  await register(agent, { username: "tran_binh", displayName: "Trần Bình" });
  await register(agent, { username: "le.hoa", displayName: "Lê Hoa" });
  anCookie = (await login(agent, "an.nguyen", "Matkhau123")).cookie;
  otherCookie = (await login(agent, "le.hoa", "Matkhau123")).cookie;
});

const search = (cookie: string, q: string) => agent.get("/api/users").query({ q }).set("Cookie", cookie);

describe("U1/U2 hồ sơ – TK-05", () => {
  it("IT-USR-01: GET /api/me trả hồ sơ và hạn phiên", async () => {
    const res = await agent.get("/api/me").set("Cookie", anCookie);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: "an.nguyen", displayName: "Nguyễn Văn An", avatarInitial: "A" });
    expect(new Date(res.body.session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("TK-05-AC1: đổi tên hiển thị, người khác tìm thấy tên mới, avatar cập nhật", async () => {
    const res = await agent.put("/api/me").set("Origin", ORIGIN).set("Cookie", otherCookie).send({ displayName: "  Trần Thị Bình  " });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ displayName: "Trần Thị Bình", avatarInitial: "B", username: "le.hoa" });
    const found = await search(anCookie, "thị bình");
    expect(found.body.users.map((u: { username: string }) => u.username)).toContain("le.hoa");
    expect((await agent.get("/api/me").set("Cookie", otherCookie)).body.user.displayName).toBe("Trần Thị Bình");
  });

  it("TK-05-AC3: tên chỉ có khoảng trắng → 400 M-03 và giữ tên cũ", async () => {
    const res = await agent.put("/api/me").set("Origin", ORIGIN).set("Cookie", anCookie).send({ displayName: "    " });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.displayName).toBe(M.M03);
    expect((await agent.get("/api/me").set("Cookie", anCookie)).body.user.displayName).toBe("Nguyễn Văn An");
  });

  it("TK-05 R1: không sửa được tên đăng nhập / không có trường ảnh (trường lạ bị từ chối)", async () => {
    for (const extra of [{ username: "hacker" }, { avatar: "x.png" }]) {
      const res = await agent.put("/api/me").set("Origin", ORIGIN).set("Cookie", anCookie).send({ displayName: "A", ...extra });
      expect(res.status).toBe(400);
    }
    expect((await agent.get("/api/me").set("Cookie", anCookie)).body.user.username).toBe("an.nguyen");
  });
});

describe("U3 GET /api/users – TK-06", () => {
  const names = (res: { body: { users: Array<{ username: string }> } }) => res.body.users.map((u) => u.username);

  it("TK-06-AC1: AN, an.ng, Văn An đều ra an.nguyen", async () => {
    for (const q of ["AN", "an.ng", "Văn An"]) {
      const res = await search(otherCookie, q);
      expect(res.status).toBe(200);
      expect(names(res)).toContain("an.nguyen");
    }
  });

  it("TK-06-AC2: không trả chính mình", async () => {
    expect(names(await search(anCookie, "an.nguyen"))).not.toContain("an.nguyen");
  });

  it("TK-06-AC3: Đặng và đặng đều ra Đặng Thị Ẩn (hoa thường với chữ có dấu)", async () => {
    for (const q of ["Đặng", "đặng", "ĐẶNG"]) {
      const res = await search(anCookie, q);
      expect(res.body.users).toEqual([{ id: expect.any(Number), username: "dang.an", displayName: "Đặng Thị Ẩn", avatarInitial: "Ẩ" }]);
    }
  });

  it("TK-06 R3: có phân biệt dấu – 'nguyen' không ra 'Nguyễn' theo tên hiển thị", async () => {
    await register(agent, { username: "khac01", displayName: "Nguyễn Khác" });
    expect(names(await search(anCookie, "nguyen khac"))).toEqual([]);
  });

  it("IT-USR-07: ký tự đặc biệt của LIKE được thoát – '_' chỉ khớp tên có '_'", async () => {
    expect(names(await search(anCookie, "_"))).toEqual(["tran_binh"]);
    expect(names(await search(anCookie, "%"))).toEqual([]);
  });

  it("không có kết quả → 200 mảng rỗng; từ khóa trống / quá dài → 400", async () => {
    const none = await search(anCookie, "zzzz");
    expect(none.status).toBe(200);
    expect(none.body.users).toEqual([]);
    expect((await search(anCookie, "   ")).status).toBe(400);
    expect((await search(anCookie, "a".repeat(51))).status).toBe(400);
    expect((await agent.get("/api/users").set("Cookie", anCookie)).status).toBe(400);
  });

  it("GS-14: tối đa 20 kết quả", async () => {
    for (let i = 0; i < 22; i++) await register(agent, { username: `nv.bulk${String(i).padStart(2, "0")}`, displayName: `Bulk ${i}` });
    const res = await search(anCookie, "bulk");
    expect(res.body.users).toHaveLength(20);
  });

  it("chưa đăng nhập → 401", async () => {
    expect((await agent.get("/api/users").query({ q: "an" })).status).toBe(401);
  });
});
