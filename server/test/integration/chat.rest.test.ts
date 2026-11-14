// REST chat 1-1: C1–C5 (CH-01, CH-03, CH-06, TB-01) + người ngoài nhận 403.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/storage/prisma.js";
import { M } from "../../src/common/messages.js";
import { ORIGIN, login, register } from "../helpers/app.js";
import { send, startServer, type TestServer } from "../helpers/realtime.js";

let srv: TestServer;
const u: Record<string, { id: number; cookie: string }> = {};

beforeAll(async () => {
  srv = await startServer();
  for (const [name, display] of [["user.a", "Nguyễn Văn An"], ["user.b", "Trần Thị Bình"], ["user.c", "Lê Văn Cường"], ["user.d", "Phạm Dũng"]]) {
    const r = await register(srv.http as never, { username: name, displayName: display });
    u[name] = { id: r.body.user.id, cookie: (await login(srv.http as never, name, "Matkhau123")).cookie };
  }
});
afterAll(async () => srv.close());

const openDirect = (who: string, userId: number) =>
  srv.http.post("/api/conversations/direct").set("Origin", ORIGIN).set("Cookie", u[who].cookie).send({ userId });
const get = (who: string, path: string) => srv.http.get(path).set("Cookie", u[who].cookie);

describe("C1 POST /api/conversations/direct – CH-01", () => {
  it("CH-01-AC1/AC2/AC3: mở 2 lần và mở ngược chiều đều cùng một hội thoại; CSDL chỉ có 1", async () => {
    const first = await openDirect("user.a", u["user.b"].id);
    expect(first.status).toBe(201);
    const c = first.body.conversation;
    expect(c).toMatchObject({ type: "direct", title: "Trần Thị Bình", memberCount: 2, unreadCount: 0, lastMessage: null });
    expect(c.otherUser.username).toBe("user.b");
    expect(c.members.map((m: any) => m.user.username).sort()).toEqual(["user.a", "user.b"]);

    const again = await openDirect("user.a", u["user.b"].id);
    expect(again.status).toBe(200);
    expect(again.body.conversation.id).toBe(c.id);
    const reverse = await openDirect("user.b", u["user.a"].id);
    expect(reverse.status).toBe(200);
    expect(reverse.body.conversation.id).toBe(c.id);
    expect(reverse.body.conversation.title).toBe("Nguyễn Văn An");

    const lo = Math.min(u["user.a"].id, u["user.b"].id), hi = Math.max(u["user.a"].id, u["user.b"].id);
    expect(await prisma().conversation.count({ where: { directUserLowId: lo, directUserHighId: hi } })).toBe(1);
  });

  it("CH-01 R4 / IT-CONV-03: 10 yêu cầu đồng thời theo cả hai chiều chỉ tạo MỘT hội thoại", async () => {
    const reqs = Array.from({ length: 10 }, (_, i) => (i % 2 ? openDirect("user.c", u["user.d"].id) : openDirect("user.d", u["user.c"].id)));
    const res = await Promise.all(reqs);
    expect(res.filter((r) => r.status === 201)).toHaveLength(1);
    expect(res.every((r) => r.status === 200 || r.status === 201)).toBe(true);
    expect(new Set(res.map((r) => r.body.conversation.id)).size).toBe(1);
    const lo = Math.min(u["user.c"].id, u["user.d"].id), hi = Math.max(u["user.c"].id, u["user.d"].id);
    expect(await prisma().conversation.count({ where: { directUserLowId: lo, directUserHighId: hi } })).toBe(1);
    expect(await prisma().conversationMember.count({ where: { conversation: { directUserLowId: lo, directUserHighId: hi } } })).toBe(2);
  });

  it("E-CH01-1/2: tự chat với mình → 400 M-15; người không tồn tại → 404 M-16; userId từ body sai kiểu → 400", async () => {
    const self = await openDirect("user.a", u["user.a"].id);
    expect(self.status).toBe(400);
    expect(self.body.error).toMatchObject({ code: "CANNOT_CHAT_SELF", message: M.M15 });
    const none = await openDirect("user.a", 999999);
    expect(none.status).toBe(404);
    expect(none.body.error).toMatchObject({ code: "USER_NOT_FOUND", message: M.M16 });
    const bad = await srv.http.post("/api/conversations/direct").set("Origin", ORIGIN).set("Cookie", u["user.a"].cookie).send({ userId: "2" });
    expect(bad.status).toBe(400);
  });

  it("chưa đăng nhập → 401; Origin lạ → 403 FORBIDDEN_ORIGIN", async () => {
    expect((await srv.http.post("/api/conversations/direct").set("Origin", ORIGIN).send({ userId: 1 })).status).toBe(401);
    const evil = await srv.http.post("/api/conversations/direct").set("Origin", "https://evil.example").set("Cookie", u["user.a"].cookie).send({ userId: u["user.b"].id });
    expect(evil.body.error.code).toBe("FORBIDDEN_ORIGIN");
  });
});

describe("C4 GET /api/conversations/:id/messages – CH-03 (phân trang 50)", () => {
  let convId: number;
  beforeAll(async () => {
    convId = (await openDirect("user.a", u["user.b"].id)).body.conversation.id;
    const a = await srv.connect(u["user.a"].cookie);
    for (let i = 1; i <= 120; i++) {
      const r = await send(a, { conversationId: convId, content: `Tin số ${i}`, clientMessageId: randomUUID() });
      expect(r.ok).toBe(true);
    }
    a.disconnect();
  });

  it("CH-03-AC1: 120 tin → 50 (71–120) + 50 (21–70) + 20 (1–20), không trùng, không sót, cũ → mới", async () => {
    const p1 = await get("user.b", `/api/conversations/${convId}/messages`);
    expect(p1.status).toBe(200);
    expect(p1.body.messages).toHaveLength(50);
    expect(p1.body.messages[0].content).toBe("Tin số 71");
    expect(p1.body.messages[49].content).toBe("Tin số 120");
    expect(p1.body.hasMore).toBe(true);
    const p2 = await get("user.b", `/api/conversations/${convId}/messages?before=${p1.body.nextCursor}`);
    expect(p2.body.messages.map((m: any) => m.content)).toEqual(Array.from({ length: 50 }, (_, i) => `Tin số ${i + 21}`));
    expect(p2.body.hasMore).toBe(true);
    const p3 = await get("user.b", `/api/conversations/${convId}/messages?before=${p2.body.nextCursor}`);
    expect(p3.body.messages).toHaveLength(20);
    expect(p3.body.messages[0].content).toBe("Tin số 1");
    expect(p3.body.hasMore).toBe(false);
    const all = [...p3.body.messages, ...p2.body.messages, ...p1.body.messages].map((m: any) => m.id);
    expect(new Set(all).size).toBe(120);
    expect([...all].sort((x, y) => x - y)).toEqual(all);
    expect(p1.body.messages[0].sender).toMatchObject({ username: "user.a", displayName: "Nguyễn Văn An" });
  });

  it("after: trả tin bị lỡ; limit > 50 → 400; before + after → 400; giá trị sai → 400", async () => {
    const p1 = await get("user.b", `/api/conversations/${convId}/messages?limit=5`);
    const firstOfPage = p1.body.messages[0].id;
    const after = await get("user.b", `/api/conversations/${convId}/messages?after=${firstOfPage}`);
    expect(after.body.messages).toHaveLength(4);
    expect(after.body.hasMore).toBe(false);
    expect((await get("user.b", `/api/conversations/${convId}/messages?limit=51`)).status).toBe(400);
    expect((await get("user.b", `/api/conversations/${convId}/messages?before=5&after=1`)).status).toBe(400);
    expect((await get("user.b", `/api/conversations/${convId}/messages?before=abc`)).status).toBe(400);
    expect((await get("user.b", `/api/conversations/abc/messages`)).status).toBe(400);
  });
});

describe("C2 GET /api/conversations – CH-06 + TB-01", () => {
  it("chỉ hội thoại đã có tin, mới nhất trước, unreadCount tính riêng, totalUnread", async () => {
    // a–c: tạo hội thoại nhưng chưa gửi → KHÔNG hiện (CH-01 R3)
    const ac = (await openDirect("user.a", u["user.c"].id)).body.conversation.id;
    let list = await get("user.c", "/api/conversations");
    expect(list.body.conversations.map((c: any) => c.id)).not.toContain(ac);

    // b gửi a 2 tin trong hội thoại a–b; d gửi a qua a–d mới hơn → a–d đứng đầu danh sách của a
    const ab = (await openDirect("user.b", u["user.a"].id)).body.conversation.id;
    const ad = (await openDirect("user.d", u["user.a"].id)).body.conversation.id;
    const b = await srv.connect(u["user.b"].cookie);
    const d = await srv.connect(u["user.d"].cookie);
    await srv.http.post(`/api/conversations/${ab}/read`).set("Origin", ORIGIN).set("Cookie", u["user.a"].cookie).send({});
    await send(b, { conversationId: ab, content: "Chào An", clientMessageId: randomUUID() });
    await send(b, { conversationId: ab, content: "Họp lúc 14h nhé", clientMessageId: randomUUID() });
    await send(d, { conversationId: ad, content: "Tin mới nhất", clientMessageId: randomUUID() });

    list = await get("user.a", "/api/conversations");
    expect(list.status).toBe(200);
    const ids = list.body.conversations.map((c: any) => c.id);
    expect(ids.slice(0, 2)).toEqual([ad, ab]);
    expect(ids).not.toContain(ac);
    const rowAb = list.body.conversations.find((c: any) => c.id === ab);
    expect(rowAb).toMatchObject({ title: "Trần Thị Bình", unreadCount: 2 });
    expect(rowAb.lastMessage).toMatchObject({ preview: "Họp lúc 14h nhé", isMine: false, senderDisplayName: "Trần Thị Bình" });
    expect(list.body.conversations.find((c: any) => c.id === ad).unreadCount).toBe(1);
    expect(list.body.totalUnread).toBe(list.body.conversations.reduce((s: number, c: any) => s + c.unreadCount, 0));

    // Tin của chính mình không tính chưa đọc (TB-01 R1)
    const listB = await get("user.b", "/api/conversations");
    expect(listB.body.conversations.find((c: any) => c.id === ab).lastMessage.isMine).toBe(true);
    b.disconnect(); d.disconnect();
  });
});

describe("C5 POST /api/conversations/:id/read – TB-01", () => {
  it("TB-01-AC2: về 0; mốc không lùi; không vượt tin mới nhất", async () => {
    const ab = (await openDirect("user.a", u["user.b"].id)).body.conversation.id;
    const read = (body: object) => srv.http.post(`/api/conversations/${ab}/read`).set("Origin", ORIGIN).set("Cookie", u["user.a"].cookie).send(body);
    const r1 = await read({});
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ conversationId: ab, unreadCount: 0 });
    const top = r1.body.lastReadMessageId;
    expect((await read({ lastMessageId: 1 })).body.lastReadMessageId).toBe(top);       // không lùi
    expect((await read({ lastMessageId: 99999999 })).body.lastReadMessageId).toBe(top); // không vượt
    const list = await get("user.a", "/api/conversations");
    expect(list.body.conversations.find((c: any) => c.id === ab).unreadCount).toBe(0);
  });
});

describe("Người ngoài hội thoại → 403 (NFR-04, QT-CHUNG-2)", () => {
  it("C (không phải thành viên) nhận 403 M-30 ở C3, C4, C5 – GIỐNG HỆT hội thoại không tồn tại; không trả tin nào", async () => {
    const ab = (await openDirect("user.a", u["user.b"].id)).body.conversation.id;
    const outsider = [
      await get("user.c", `/api/conversations/${ab}`),
      await get("user.c", `/api/conversations/${ab}/messages`),
      await srv.http.post(`/api/conversations/${ab}/read`).set("Origin", ORIGIN).set("Cookie", u["user.c"].cookie).send({}),
    ];
    const missing = [
      await get("user.c", `/api/conversations/987654`),
      await get("user.c", `/api/conversations/987654/messages`),
      await srv.http.post(`/api/conversations/987654/read`).set("Origin", ORIGIN).set("Cookie", u["user.c"].cookie).send({}),
    ];
    for (let i = 0; i < 3; i++) {
      expect(outsider[i].status).toBe(403);
      expect(outsider[i].body).toEqual({ error: { code: "CONVERSATION_FORBIDDEN", message: M.M30 } });
      expect(missing[i].status).toBe(outsider[i].status);
      expect(missing[i].body).toEqual(outsider[i].body);
      expect(JSON.stringify(outsider[i].body)).not.toContain("Tin số");
    }
    // Danh sách của C không có hội thoại a–b
    expect((await get("user.c", "/api/conversations")).body.conversations.map((c: any) => c.id)).not.toContain(ab);
  });
});
