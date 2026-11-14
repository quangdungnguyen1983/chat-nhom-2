// REST nhóm: G1–G5 + C3/C4/C5 trên nhóm (NH-01, NH-03, NH-04) và người ngoài nhóm.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/storage/prisma.js";
import { M } from "../../src/common/messages.js";
import { ORIGIN, login, register } from "../helpers/app.js";
import { send, startServer, type TestServer } from "../helpers/realtime.js";

let srv: TestServer;
const u: Record<string, { id: number; cookie: string }> = {};
const NAMES: Record<string, string> = { a: "Nguyễn Văn An", b: "Trần Thị Bình", c: "Lê Văn Cường", d: "Phạm Dũng", e: "Người Ngoài", f: "Hoàng Phúc" };

beforeAll(async () => {
  srv = await startServer();
  for (const k of Object.keys(NAMES)) {
    const r = await register(srv.http as never, { username: `grp.${k}`, displayName: NAMES[k] });
    u[k] = { id: r.body.user.id, cookie: (await login(srv.http as never, `grp.${k}`, "Matkhau123")).cookie };
  }
});
afterAll(async () => srv.close());

const post = (who: string, path: string, body: object = {}) => srv.http.post(path).set("Origin", ORIGIN).set("Cookie", u[who].cookie).send(body);
const patch = (who: string, path: string, body: object) => srv.http.patch(path).set("Origin", ORIGIN).set("Cookie", u[who].cookie).send(body);
const del = (who: string, path: string) => srv.http.delete(path).set("Origin", ORIGIN).set("Cookie", u[who].cookie);
const get = (who: string, path: string) => srv.http.get(path).set("Cookie", u[who].cookie);
const createGroup = (who: string, name: string, members: string[]) => post(who, "/api/conversations/group", { name, memberIds: members.map((m) => u[m].id) });
const history = async (who: string, id: number) => (await get(who, `/api/conversations/${id}/messages`)).body.messages as any[];
const systemTexts = async (who: string, id: number) => (await history(who, id)).filter((m) => m.type === "system").map((m) => m.content);
const listIds = async (who: string) => (await get(who, "/api/conversations")).body.conversations.map((c: any) => c.id);

describe("G1 – NH-01 tạo nhóm", () => {
  it("NH-01-AC1: A tạo nhóm với B, C → 3 thành viên, A trưởng nhóm, HT-01, có trong danh sách A/B/C, không có ở E", async () => {
    const res = await createGroup("a", "Phòng Kế hoạch", ["b", "c"]);
    expect(res.status).toBe(201);
    const g = res.body.conversation;
    expect(g).toMatchObject({ type: "group", title: "Phòng Kế hoạch", name: "Phòng Kế hoạch", memberCount: 3, myRole: "owner", otherUser: null, unreadCount: 0 });
    expect(Object.fromEntries(g.members.map((m: any) => [m.user.username, m.role]))).toEqual({ "grp.a": "owner", "grp.b": "member", "grp.c": "member" });
    const msgs = await history("b", g.id);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ type: "system", sender: null, eventType: "group_created", content: 'Nguyễn Văn An đã tạo nhóm "Phòng Kế hoạch"' });
    for (const k of ["a", "b", "c"]) expect(await listIds(k)).toContain(g.id);
    expect(await listIds("e")).not.toContain(g.id);
    const rowB = (await get("b", "/api/conversations")).body.conversations.find((c: any) => c.id === g.id);
    expect(rowB.unreadCount).toBe(0); // tin hệ thống không tính chưa đọc (QĐ-10)
    expect(rowB.lastMessage).toMatchObject({ type: "system", preview: 'Nguyễn Văn An đã tạo nhóm "Phòng Kế hoạch"' });
  });

  it("NH-01-AC2 + lỗi: < 2 người, tên sai, người không tồn tại, có chính mình / trùng → không tạo gì", async () => {
    const before = await prisma().conversation.count({ where: { type: "group" } });
    const one = await createGroup("a", "Nhóm X", ["b"]);
    expect(one.status).toBe(400);
    expect(one.body.error).toMatchObject({ code: "GROUP_TOO_FEW_MEMBERS", message: M.M26 });
    for (const name of ["   ", "x".repeat(101)]) {
      const r = await createGroup("a", name, ["b", "c"]);
      expect(r.body.error).toMatchObject({ code: "GROUP_NAME_INVALID", message: M.M25 });
    }
    const ghost = await post("a", "/api/conversations/group", { name: "Nhóm ma", memberIds: [u.b.id, 999999] });
    expect(ghost.status).toBe(400);
    expect(ghost.body.error).toMatchObject({ code: "USERS_NOT_FOUND", message: M.M27 });
    expect((await post("a", "/api/conversations/group", { name: "Có mình", memberIds: [u.a.id, u.b.id, u.c.id] })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await post("a", "/api/conversations/group", { name: "Trùng", memberIds: [u.b.id, u.b.id] })).body.error.code).toBe("VALIDATION_ERROR");
    expect((await post("a", "/api/conversations/group", { name: "Lạ", memberIds: [u.b.id, u.c.id], ownerId: u.b.id })).status).toBe(400);
    expect(await prisma().conversation.count({ where: { type: "group" } })).toBe(before);
  });

  it("NH-01-AC3: tên `Nhóm Đổi Mới 2026` (kể cả nhập NFD) lưu và trả đúng", async () => {
    const r = await createGroup("a", "  " + "Nhóm Đổi Mới 2026".normalize("NFD") + " ", ["b", "c"]);
    expect(r.body.conversation.name).toBe("Nhóm Đổi Mới 2026");
  });
});

describe("Quyền nhóm – kiểm tra ở backend", () => {
  let gid: number;
  beforeAll(async () => { gid = (await createGroup("a", "Nhóm Quyền", ["b", "c"])).body.conversation.id; });

  it("NH-03-AC3: thành viên thường B đổi tên / thêm / xóa → 403 NOT_GROUP_OWNER, không đổi gì, không có tin hệ thống", async () => {
    const before = await systemTexts("a", gid);
    const r1 = await patch("b", `/api/conversations/${gid}`, { name: "B đổi tên" });
    const r2 = await post("b", `/api/conversations/${gid}/members`, { userIds: [u.d.id] });
    const r3 = await del("b", `/api/conversations/${gid}/members/${u.c.id}`);
    for (const r of [r1, r2, r3]) {
      expect(r.status).toBe(403);
      expect(r.body.error).toEqual({ code: "NOT_GROUP_OWNER", message: M.M29 });
    }
    expect(await systemTexts("a", gid)).toEqual(before);
    expect((await get("a", `/api/conversations/${gid}`)).body.conversation).toMatchObject({ name: "Nhóm Quyền", memberCount: 3 });
  });

  it("người ngoài E: C3/C4/C5/G2/G3/G4/G5 → 403 CONVERSATION_FORBIDDEN giống hệt nhóm không tồn tại, không lộ tin", async () => {
    const calls = (id: number) => [
      get("e", `/api/conversations/${id}`),
      get("e", `/api/conversations/${id}/messages`),
      post("e", `/api/conversations/${id}/read`),
      patch("e", `/api/conversations/${id}`, { name: "E chiếm nhóm" }),
      post("e", `/api/conversations/${id}/members`, { userIds: [u.e.id === u.d.id ? u.f.id : u.d.id] }),
      del("e", `/api/conversations/${id}/members/${u.b.id}`),
      post("e", `/api/conversations/${id}/leave`),
    ];
    const real = await Promise.all(calls(gid));
    const missing = await Promise.all(calls(987654));
    real.forEach((r, i) => {
      expect(r.status).toBe(403);
      expect(r.body).toEqual({ error: { code: "CONVERSATION_FORBIDDEN", message: M.M30 } });
      expect(missing[i].status).toBe(403);
      expect(missing[i].body).toEqual(r.body);
    });
    // E cũng không tự thêm mình được
    expect((await post("e", `/api/conversations/${gid}/members`, { userIds: [u.e.id] })).status).toBe(400); // chứa chính mình → VALIDATION trước
    expect((await get("a", `/api/conversations/${gid}`)).body.conversation.memberCount).toBe(3);
  });

  it("NOT_A_GROUP: đổi tên / thêm / rời trên hội thoại 1-1 → 400", async () => {
    const direct = (await post("a", "/api/conversations/direct", { userId: u.b.id })).body.conversation.id;
    expect((await patch("a", `/api/conversations/${direct}`, { name: "x" })).body.error.code).toBe("NOT_A_GROUP");
    expect((await post("a", `/api/conversations/${direct}/members`, { userIds: [u.c.id] })).body.error.code).toBe("NOT_A_GROUP");
    expect((await post("a", `/api/conversations/${direct}/leave`)).body.error.code).toBe("NOT_A_GROUP");
  });
});

describe("G2–G5 – NH-03 + NH-04 tin hệ thống", () => {
  let gid: number;
  beforeAll(async () => {
    gid = (await createGroup("a", "Phòng Kỹ thuật", ["b", "c"])).body.conversation.id;
    const b = await srv.connect(u.b.cookie);
    await send(b, { conversationId: gid, content: "Tin cũ trước khi D vào", clientMessageId: randomUUID() });
    b.disconnect();
  });

  it("G2 đổi tên → HT-05; tên giống cũ → 200, không thêm tin; tên sai → 400", async () => {
    const r = await patch("a", `/api/conversations/${gid}`, { name: "Phòng Kỹ thuật 2" });
    expect(r.status).toBe(200);
    expect(r.body.conversation.title).toBe("Phòng Kỹ thuật 2");
    const n = (await systemTexts("a", gid)).length;
    expect((await patch("a", `/api/conversations/${gid}`, { name: "  Phòng Kỹ thuật 2 " })).status).toBe(200);
    expect((await systemTexts("a", gid)).length).toBe(n);
    expect((await patch("a", `/api/conversations/${gid}`, { name: "" })).body.error.code).toBe("GROUP_NAME_INVALID");
    expect((await systemTexts("a", gid)).at(-1)).toBe('Nguyễn Văn An đã đổi tên nhóm thành "Phòng Kỹ thuật 2"');
  });

  it("G3 NH-03-AC1: thêm D (mặc định không xem lịch sử) → HT-02, D thấy nhóm nhưng KHÔNG thấy tin trước khi vào", async () => {
    const r = await post("a", `/api/conversations/${gid}/members`, { userIds: [u.d.id] });
    expect(r.status).toBe(201);
    expect(r.body.conversation.memberCount).toBe(4);
    expect(await listIds("d")).toContain(gid);
    const seen = await history("d", gid);
    expect(seen.map((m) => m.content)).toEqual(["Nguyễn Văn An đã thêm Phạm Dũng vào nhóm"]);
    expect((await history("b", gid)).map((m) => m.content)).toContain("Tin cũ trước khi D vào");
    // D chưa đọc = 0 (mốc đọc = HT-02)
    expect((await get("d", "/api/conversations")).body.conversations.find((c: any) => c.id === gid).unreadCount).toBe(0);
  });

  it("G3: thêm người đã trong nhóm hoặc không tồn tại → 409 M-36, không thêm ai (cả lần)", async () => {
    const r = await post("a", `/api/conversations/${gid}/members`, { userIds: [u.f.id, u.c.id] });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: "MEMBER_CONFLICT", message: M.M36 });
    expect((await post("a", `/api/conversations/${gid}/members`, { userIds: [u.f.id, 999999] })).status).toBe(409);
    expect(await listIds("f")).not.toContain(gid);
  });

  it("G3 showHistory: true → F xem được toàn bộ lịch sử (QĐ-08)", async () => {
    const r = await post("a", `/api/conversations/${gid}/members`, { userIds: [u.f.id], showHistory: true });
    expect(r.status).toBe(201);
    const seen = (await history("f", gid)).map((m) => m.content);
    expect(seen[0]).toBe('Nguyễn Văn An đã tạo nhóm "Phòng Kỹ thuật"');
    expect(seen).toContain("Tin cũ trước khi D vào");
  });

  it("G4 NH-03-AC2: xóa D → HT-03; D bị 403 ở mọi đường đọc (kể cả tin cũ), nhóm biến mất khỏi danh sách D", async () => {
    expect((await del("a", `/api/conversations/${gid}/members/${u.d.id}`)).status).toBe(204);
    expect((await systemTexts("a", gid)).slice(-2)).toEqual([
      "Nguyễn Văn An đã thêm Hoàng Phúc vào nhóm",
      "Nguyễn Văn An đã xóa Phạm Dũng khỏi nhóm",
    ]);
    expect((await get("d", `/api/conversations/${gid}`)).status).toBe(403);
    expect((await get("d", `/api/conversations/${gid}/messages`)).status).toBe(403);
    expect(await listIds("d")).not.toContain(gid);
    const row = await prisma().conversationMember.findUnique({ where: { conversationId_userId: { conversationId: gid, userId: u.d.id } } });
    expect(row).toMatchObject({ leftReason: "removed" });
  });

  it("NH-04-AC1: thứ tự tin hệ thống thêm D rồi xóa D đúng thứ tự trong lịch sử", async () => {
    const texts = await systemTexts("b", gid);
    const iAdd = texts.indexOf("Nguyễn Văn An đã thêm Phạm Dũng vào nhóm");
    const iDel = texts.indexOf("Nguyễn Văn An đã xóa Phạm Dũng khỏi nhóm");
    expect(iAdd).toBeGreaterThanOrEqual(0);
    expect(iDel).toBeGreaterThan(iAdd);
  });

  it("G4: tự xóa mình → 400; xóa người không còn trong nhóm → 404", async () => {
    expect((await del("a", `/api/conversations/${gid}/members/${u.a.id}`)).body.error.code).toBe("CANNOT_REMOVE_SELF");
    expect((await del("a", `/api/conversations/${gid}/members/${u.d.id}`)).body.error.code).toBe("TARGET_NOT_MEMBER");
  });

  it("thêm lại D sau khi bị xóa: được thêm, chỉ thấy từ lần thêm mới", async () => {
    expect((await post("a", `/api/conversations/${gid}/members`, { userIds: [u.d.id] })).status).toBe(201);
    const seen = (await history("d", gid)).map((m) => m.content);
    expect(seen).toEqual(["Nguyễn Văn An đã thêm Phạm Dũng vào nhóm"]);
    expect(seen).not.toContain("Nguyễn Văn An đã xóa Phạm Dũng khỏi nhóm");
  });

  it("G5 NH-04-AC2: thành viên C rời → HT-04 'Lê Văn Cường đã rời nhóm', C mất quyền xem", async () => {
    expect((await post("c", `/api/conversations/${gid}/leave`)).status).toBe(204);
    expect((await systemTexts("a", gid)).at(-1)).toBe("Lê Văn Cường đã rời nhóm");
    expect((await get("c", `/api/conversations/${gid}/messages`)).status).toBe(403);
  });

  it("G5 NH-03-AC4: trưởng nhóm rời không chọn người → 400 M-37; chọn B → HT-06 rồi HT-04, B là trưởng nhóm", async () => {
    const r0 = await post("a", `/api/conversations/${gid}/leave`);
    expect(r0.body.error).toMatchObject({ code: "NEW_OWNER_REQUIRED", message: M.M37 });
    expect((await post("a", `/api/conversations/${gid}/leave`, { newOwnerId: u.c.id })).body.error.code).toBe("NEW_OWNER_REQUIRED"); // C đã rời
    expect((await post("a", `/api/conversations/${gid}/leave`, { newOwnerId: u.b.id })).status).toBe(204);
    expect((await systemTexts("b", gid)).slice(-2)).toEqual([
      "Nguyễn Văn An đã chuyển quyền trưởng nhóm cho Trần Thị Bình",
      "Nguyễn Văn An đã rời nhóm",
    ]);
    const detail = (await get("b", `/api/conversations/${gid}`)).body.conversation;
    expect(detail.myRole).toBe("owner");
    expect(detail.members.filter((m: any) => m.role === "owner")).toHaveLength(1);
    expect((await get("a", `/api/conversations/${gid}`)).status).toBe(403);
  });

  it("G5 GĐ-18: trưởng nhóm là người cuối cùng → 409 M-28", async () => {
    await del("b", `/api/conversations/${gid}/members/${u.d.id}`);
    await del("b", `/api/conversations/${gid}/members/${u.f.id}`);
    const r = await post("b", `/api/conversations/${gid}/leave`, { newOwnerId: u.a.id });
    expect(r.status).toBe(409);
    expect(r.body.error).toMatchObject({ code: "LAST_MEMBER_CANNOT_LEAVE", message: M.M28 });
  });
});

describe("TB-01 trong nhóm + U3 excludeConversationId", () => {
  it("chỉ tin văn bản của người khác được tính chưa đọc; tin hệ thống không tính (NH-04 R6)", async () => {
    const gid = (await createGroup("a", "Đếm chưa đọc", ["b", "c"])).body.conversation.id;
    const a = await srv.connect(u.a.cookie);
    await send(a, { conversationId: gid, content: "1", clientMessageId: randomUUID() });
    await send(a, { conversationId: gid, content: "2", clientMessageId: randomUUID() });
    await patch("a", `/api/conversations/${gid}`, { name: "Đếm chưa đọc 2" });
    await post("a", `/api/conversations/${gid}/members`, { userIds: [u.d.id] });
    a.disconnect();
    const rowB = (await get("b", "/api/conversations")).body.conversations.find((c: any) => c.id === gid);
    expect(rowB.unreadCount).toBe(2);
    expect(rowB.lastMessage.type).toBe("system");
    expect((await get("a", "/api/conversations")).body.conversations.find((c: any) => c.id === gid).unreadCount).toBe(0);
  });

  it("GF-08: tìm người với excludeConversationId loại thành viên hiện tại; người ngoài gửi tham số thì bị bỏ qua", async () => {
    const gid = (await createGroup("a", "Tìm để thêm", ["b", "c"])).body.conversation.id;
    const names = async (who: string, q: string) =>
      (await srv.http.get("/api/users").query({ q, excludeConversationId: String(gid) }).set("Cookie", u[who].cookie)).body.users.map((x: any) => x.username);
    const fromA = await names("a", "grp.");
    expect(fromA).not.toContain("grp.b");
    expect(fromA).not.toContain("grp.c");
    expect(fromA).toContain("grp.d");
    const fromE = await names("e", "grp.");
    expect(fromE).toContain("grp.b"); // E không phải thành viên → không suy ra được ai trong nhóm
  });
});
