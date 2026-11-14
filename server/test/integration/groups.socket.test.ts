// Realtime nhóm qua WebSocket thật: NH-01 (nhóm xuất hiện realtime), NH-02 (gửi/nhận), NH-03/NH-04 (tin hệ thống,
// vào/rời phòng do MÁY CHỦ quyết), người ngoài E và người bị xóa D.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type { Socket } from "socket.io-client";
import { prisma } from "../../src/storage/prisma.js";
import { M } from "../../src/common/messages.js";
import { ORIGIN, login, register } from "../helpers/app.js";
import { record, send, sleep, startServer, waitFor, type TestServer } from "../helpers/realtime.js";

let srv: TestServer;
const u: Record<string, { id: number; cookie: string }> = {};
const NAMES: Record<string, string> = { a: "Nguyễn Văn An", b: "Trần Thị Bình", c: "Lê Văn Cường", d: "Phạm Dũng", e: "Người Ngoài" };
const s: Record<string, Socket> = {};
let ev: Record<string, ReturnType<typeof record>> = {};
let gid: number;

beforeAll(async () => {
  srv = await startServer();
  for (const k of Object.keys(NAMES)) {
    const r = await register(srv.http as never, { username: `gs.${k}`, displayName: NAMES[k] });
    u[k] = { id: r.body.user.id, cookie: (await login(srv.http as never, `gs.${k}`, "Matkhau123")).cookie };
    s[k] = await srv.connect(u[k].cookie);
  }
});
afterAll(async () => srv.close());

const api = (who: string) => ({
  post: (p: string, b: object = {}) => srv.http.post(p).set("Origin", ORIGIN).set("Cookie", u[who].cookie).send(b),
  patch: (p: string, b: object) => srv.http.patch(p).set("Origin", ORIGIN).set("Cookie", u[who].cookie).send(b),
  del: (p: string) => srv.http.delete(p).set("Origin", ORIGIN).set("Cookie", u[who].cookie),
});
const resetEvents = () => { ev = Object.fromEntries(Object.keys(s).map((k) => [k, record(s[k])])); };
const newMsgs = (k: string) => ev[k].filter((e) => e.name === "message:new").map((e) => e.payload.message);
const named = (k: string, name: string) => ev[k].filter((e) => e.name === name).map((e) => e.payload);
const forGroup = (k: string) => ev[k].filter((e) => JSON.stringify(e.payload).includes(`"conversationId":${gid}`) || e.payload?.conversation?.id === gid);

describe("NH-01 + NH-02 realtime", () => {
  it("A tạo nhóm khi B, C online → B, C nhận HT-01 và nhóm xuất hiện (conversation:updated); E không nhận gì", async () => {
    resetEvents();
    const r = await api("a").post("/api/conversations/group", { name: "Phòng Kế hoạch", memberIds: [u.b.id, u.c.id] });
    gid = r.body.conversation.id;
    await sleep(200);
    for (const k of ["a", "b", "c"]) {
      expect(newMsgs(k).map((m) => m.content)).toEqual(['Nguyễn Văn An đã tạo nhóm "Phòng Kế hoạch"']);
      const upd = named(k, "conversation:updated").map((p) => p.conversation);
      expect(upd.at(-1)).toMatchObject({ id: gid, type: "group", title: "Phòng Kế hoạch", memberCount: 3, unreadCount: 0 });
    }
    expect(ev.e).toEqual([]);
    expect(ev.d).toEqual([]);
  });

  it("NH-02-AC1: A gửi → B, C nhận kèm tên + avatar người gửi; unread của B tăng; E, D không nhận", async () => {
    resetEvents();
    const ack = await send(s.a, { conversationId: gid, content: "Họp nhóm lúc 15h\nmang laptop", clientMessageId: randomUUID() });
    expect(ack.ok).toBe(true);
    await sleep(200);
    for (const k of ["b", "c"]) {
      const [m] = newMsgs(k);
      expect(m).toMatchObject({ type: "text", content: "Họp nhóm lúc 15h\nmang laptop", sender: { id: u.a.id, displayName: "Nguyễn Văn An", avatarInitial: "A" } });
      expect(named(k, "conversation:updated").at(-1).conversation.unreadCount).toBe(1);
    }
    expect(named("a", "conversation:updated").at(-1).conversation.unreadCount).toBe(0);
    expect(ev.e).toEqual([]);
    expect(ev.d).toEqual([]);
  });
});

describe("NH-03 / NH-04: vào – rời phòng do máy chủ quyết", () => {
  it("thêm D (đang online) → D được cho vào phòng, nhận HT-02 rồi nhận tin kế tiếp; người khác nhận HT-02 + member:changed", async () => {
    resetEvents();
    expect((await api("a").post(`/api/conversations/${gid}/members`, { userIds: [u.d.id] })).status).toBe(201);
    await sleep(150);
    for (const k of ["a", "b", "c", "d"]) expect(newMsgs(k).map((m) => m.content)).toEqual(["Nguyễn Văn An đã thêm Phạm Dũng vào nhóm"]);
    expect(named("b", "member:changed")).toEqual([{ conversationId: gid, change: "added", userId: u.d.id, memberCount: 4 }]);
    expect(named("d", "conversation:updated").at(-1).conversation).toMatchObject({ id: gid, memberCount: 4 });
    await send(s.b, { conversationId: gid, content: "Chào D", clientMessageId: randomUUID() });
    await sleep(150);
    expect(newMsgs("d").map((m) => m.content)).toContain("Chào D");
    expect(ev.e).toEqual([]);
  });

  it("NH-02-AC2 + NH-03-AC2: xóa D → D nhận conversation:removed (removed), KHÔNG nhận HT-03; sau đó không nhận gì; D gửi → bị từ chối, không lưu, không phát", async () => {
    resetEvents();
    expect((await api("a").del(`/api/conversations/${gid}/members/${u.d.id}`)).status).toBe(204);
    await sleep(150);
    expect(named("d", "conversation:removed")).toEqual([{ conversationId: gid, reason: "removed" }]);
    expect(newMsgs("d")).toEqual([]);
    for (const k of ["a", "b", "c"]) expect(newMsgs(k).map((m) => m.content)).toEqual(["Nguyễn Văn An đã xóa Phạm Dũng khỏi nhóm"]);

    resetEvents();
    const before = await prisma().message.count({ where: { conversationId: gid } });
    const r = await send(s.d, { conversationId: gid, content: "D cố gửi", clientMessageId: randomUUID() });
    expect(r).toEqual({ ok: false, error: { code: "CONVERSATION_FORBIDDEN", message: M.M30, retryable: false } });
    await send(s.a, { conversationId: gid, content: "Sau khi D bị xóa", clientMessageId: randomUUID() });
    await sleep(150);
    expect(await prisma().message.count({ where: { conversationId: gid } })).toBe(before + 1);
    expect(forGroup("d")).toEqual([]);
    expect(newMsgs("b").map((m) => m.content)).toEqual(["Sau khi D bị xóa"]);
  });

  it("D kết nối lại → máy chủ KHÔNG cho vào phòng nhóm (danh sách phòng tính lại từ CSDL)", async () => {
    s.d.disconnect();
    s.d = srv.rawSocket(u.d.cookie);
    const ready = await waitFor<{ conversationIds: number[] }>(s.d, "ready");
    expect(ready.conversationIds).not.toContain(gid);
    const evD = record(s.d);
    await send(s.a, { conversationId: gid, content: "D vẫn không thấy", clientMessageId: randomUUID() });
    await sleep(150);
    expect(evD).toEqual([]);
  });

  it("người ngoài E: gửi vào nhóm bị từ chối; tự phát sự kiện join không vào được phòng", async () => {
    resetEvents();
    const r = await send(s.e, { conversationId: gid, content: "E chen vào", clientMessageId: randomUUID() });
    expect(r.error.code).toBe("CONVERSATION_FORBIDDEN");
    s.e.emit("join", `conv:${gid}`);
    s.e.emit("conversation:join", { conversationId: gid });
    await sleep(100);
    await send(s.b, { conversationId: gid, content: "Bí mật nhóm", clientMessageId: randomUUID() });
    await sleep(150);
    expect(ev.e).toEqual([]);
    expect(newMsgs("a").map((m) => m.content)).toEqual(["Bí mật nhóm"]);
  });

  it("đổi tên → HT-05 + member:changed(renamed) + tên mới trong conversation:updated của mọi thành viên", async () => {
    resetEvents();
    await api("a").patch(`/api/conversations/${gid}`, { name: "Phòng Kế hoạch 2" });
    await sleep(150);
    for (const k of ["a", "b", "c"]) {
      expect(newMsgs(k).map((m) => m.content)).toEqual(['Nguyễn Văn An đã đổi tên nhóm thành "Phòng Kế hoạch 2"']);
      expect(named(k, "conversation:updated").at(-1).conversation.title).toBe("Phòng Kế hoạch 2");
    }
    expect(named("b", "member:changed")).toEqual([{ conversationId: gid, change: "renamed", userId: null, memberCount: 3 }]);
  });

  it("C tự rời → C nhận conversation:removed(left), không nhận HT-04; A, B nhận 'Lê Văn Cường đã rời nhóm'", async () => {
    resetEvents();
    expect((await api("c").post(`/api/conversations/${gid}/leave`)).status).toBe(204);
    await sleep(150);
    expect(named("c", "conversation:removed")).toEqual([{ conversationId: gid, reason: "left" }]);
    expect(newMsgs("c")).toEqual([]);
    for (const k of ["a", "b"]) expect(newMsgs(k).map((m) => m.content)).toEqual(["Lê Văn Cường đã rời nhóm"]);
  });

  it("trưởng nhóm A rời và chuyển quyền cho B → B nhận HT-06 rồi HT-04 đúng thứ tự; A rời phòng", async () => {
    resetEvents();
    expect((await api("a").post(`/api/conversations/${gid}/leave`, { newOwnerId: u.b.id })).status).toBe(204);
    await sleep(150);
    expect(newMsgs("b").map((m) => m.content)).toEqual([
      "Nguyễn Văn An đã chuyển quyền trưởng nhóm cho Trần Thị Bình",
      "Nguyễn Văn An đã rời nhóm",
    ]);
    expect(named("b", "member:changed").map((p) => p.change)).toEqual(["owner_transferred", "left"]);
    expect(newMsgs("a")).toEqual([]);
    expect(named("a", "conversation:removed")).toEqual([{ conversationId: gid, reason: "left" }]);
    expect((await send(s.a, { conversationId: gid, content: "A đã rời", clientMessageId: randomUUID() })).error.code).toBe("CONVERSATION_FORBIDDEN");
  });
});
