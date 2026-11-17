// Realtime 1-1 qua Socket.IO / WebSocket THẬT: hai client A, B và người ngoài C.
// CH-02, CH-06, TB-01, NFR-04; transport chỉ WebSocket; phiên bị hủy thì ngắt (TK-03 R4).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/storage/prisma.js";
import { M } from "../../src/common/messages.js";
import { ORIGIN, login, register } from "../helpers/app.js";
import { record, send, sleep, startServer, waitFor, type TestServer } from "../helpers/realtime.js";

let srv: TestServer;
const u: Record<string, { id: number; cookie: string }> = {};
let convAB: number;

beforeAll(async () => {
  srv = await startServer();
  for (const [name, display] of [["sock.a", "Nguyễn Văn An"], ["sock.b", "Đặng Thị Ẩn"], ["sock.c", "Người Ngoài"]]) {
    const r = await register(srv.http as never, { username: name, displayName: display });
    u[name] = { id: r.body.user.id, cookie: (await login(srv.http as never, name, "Matkhau123")).cookie };
  }
});
afterAll(async () => srv.close());

const countMessages = () => prisma().message.count({ where: { conversationId: convAB } });

describe("Kết nối – chỉ WebSocket, có xác thực", () => {
  it("ADR-03: transport là websocket; máy chủ từ chối long-polling", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    expect(a.io.engine.transport.name).toBe("websocket");
    const poll = await srv.http.get("/socket.io/?EIO=4&transport=polling").set("Origin", ORIGIN).set("Cookie", u["sock.a"].cookie);
    expect(poll.status).toBe(400);
    expect(poll.text).toMatch(/Transport unknown/);
    a.disconnect();
  });

  it("ST-SES-03/04: không cookie, cookie rác, Origin lạ → connect_error", async () => {
    for (const [cookie, origin] of [["", ORIGIN], ["sid=abc", ORIGIN], [u["sock.a"].cookie, "https://evil.example"]]) {
      const s = srv.rawSocket(cookie, origin);
      const err = await waitFor<Error>(s, "connect_error");
      expect(["UNAUTHENTICATED", "FORBIDDEN_ORIGIN"]).toContain(err.message);
      expect(s.connected).toBe(false);
    }
  });
});

describe("CH-01 + CH-02: hai client gửi/nhận realtime", () => {
  it("A mở 1-1 khi B đang online → socket của B được cho vào phòng, nhận tin đầu tiên ngay", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b = await srv.connect(u["sock.b"].cookie);
    const open = await srv.http.post("/api/conversations/direct").set("Origin", ORIGIN).set("Cookie", u["sock.a"].cookie).send({ userId: u["sock.b"].id });
    expect(open.status).toBe(201);
    convAB = open.body.conversation.id;

    const content = "Chào bạn, hôm nay họp lúc 14h nhé! Ừ, được.";
    const gotB = waitFor<any>(b, "message:new");
    const updB = waitFor<any>(b, "conversation:updated");
    const ack = await send(a, { conversationId: convAB, content, clientMessageId: randomUUID() });
    expect(ack.ok).toBe(true);
    expect(ack.duplicate).toBe(false);
    // CH-02 R5: khi đã ack thì tin ĐÃ nằm trong CSDL
    expect(await prisma().message.findUnique({ where: { id: ack.message.id } })).not.toBeNull();

    const { message } = await gotB;
    expect(message.content).toBe(content);
    expect(message.sender).toMatchObject({ id: u["sock.a"].id, displayName: "Nguyễn Văn An" });
    expect(message.id).toBe(ack.message.id);
    const { conversation } = await updB;
    expect(conversation).toMatchObject({ id: convAB, title: "Nguyễn Văn An", unreadCount: 1 });
    expect(conversation.lastMessage).toMatchObject({ isMine: false, preview: content });
    a.disconnect(); b.disconnect();
  });

  it("tin được lưu TRƯỚC khi phát: lúc B nhận message:new, dòng đã có trong CSDL", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b = await srv.connect(u["sock.b"].cookie);
    const seenInDb = new Promise<boolean>((resolve) => {
      b.once("message:new", async ({ message }) => resolve(!!(await prisma().message.findUnique({ where: { id: message.id } }))));
    });
    await send(a, { conversationId: convAB, content: "Kiểm tra thứ tự lưu → phát", clientMessageId: randomUUID() });
    expect(await seenInDb).toBe(true);
    a.disconnect(); b.disconnect();
  });

  it("CH-02-AC2/AC3/AC4: có dấu + xuống dòng + dòng trống, 5000 ký tự đạt, 5001 bị từ chối, <script> nguyên văn", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b = await srv.connect(u["sock.b"].cookie);
    const events = record(b);

    const multi = "Dòng một có dấu: Ẩ ỗ ữ\r\n\r\nDòng ba";
    const r1 = await send(a, { conversationId: convAB, content: multi, clientMessageId: randomUUID() });
    expect(r1.message.content).toBe("Dòng một có dấu: Ẩ ỗ ữ\n\nDòng ba"); // \r\n → \n, giữ dòng trống
    expect(r1.message.content.split("\n")).toHaveLength(3);

    const nfd = "Ẩ".normalize("NFD"); // 2 code unit trước NFC, 1 ký tự sau NFC
    const exact = nfd.repeat(4999) + "\n";
    const r2 = await send(a, { conversationId: convAB, content: exact, clientMessageId: randomUUID() });
    expect(r2.ok).toBe(true);
    expect(Array.from(r2.message.content)).toHaveLength(5000);

    const before = await countMessages();
    const r3 = await send(a, { conversationId: convAB, content: "a".repeat(5001), clientMessageId: randomUUID() });
    expect(r3).toEqual({ ok: false, error: { code: "MESSAGE_TOO_LONG", message: "Tin nhắn vượt quá 5.000 ký tự (hiện có 5.001 ký tự).", retryable: false } });
    const r4 = await send(a, { conversationId: convAB, content: " \n\t\r\n ", clientMessageId: randomUUID() });
    expect(r4.error.code).toBe("MESSAGE_EMPTY");
    expect(await countMessages()).toBe(before);

    const xss = "<script>alert(1)</script>";
    const r5 = await send(a, { conversationId: convAB, content: xss, clientMessageId: randomUUID() });
    expect(r5.message.content).toBe(xss);

    await sleep(200);
    const received = events.filter((e) => e.name === "message:new").map((e) => e.payload.message.content);
    expect(received).toEqual([r1.message.content, r2.message.content, xss]); // B nhận đủ, không nhận tin bị từ chối
    expect(Array.from(received[1])).toHaveLength(5000);
    a.disconnect(); b.disconnect();
  });

  it("không tin senderId từ client: payload có senderId bị từ chối, không lưu, không phát", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b = await srv.connect(u["sock.b"].cookie);
    const events = record(b);
    const before = await countMessages();
    // A cố giả làm B
    const r = await send(a, { conversationId: convAB, content: "giả mạo", clientMessageId: randomUUID(), senderId: u["sock.b"].id });
    expect(r).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    expect(await countMessages()).toBe(before);
    // Gửi hợp lệ: người gửi luôn là chủ phiên
    const ok = await send(a, { conversationId: convAB, content: "thật", clientMessageId: randomUUID() });
    expect(ok.message.sender.id).toBe(u["sock.a"].id);
    expect((await prisma().message.findUnique({ where: { id: ok.message.id } }))!.senderId).toBe(u["sock.a"].id);
    await sleep(150);
    expect(events.filter((e) => e.name === "message:new").map((e) => e.payload.message.content)).toEqual(["thật"]);
    a.disconnect(); b.disconnect();
  });

  it("idempotency: gửi lại cùng clientMessageId → duplicate: true, chỉ 1 dòng, không phát lại", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b = await srv.connect(u["sock.b"].cookie);
    const events = record(b);
    const cid = randomUUID();
    const [x, y] = await Promise.all([
      send(a, { conversationId: convAB, content: "gửi lại", clientMessageId: cid }),
      send(a, { conversationId: convAB, content: "gửi lại", clientMessageId: cid }),
    ]);
    expect([x.duplicate, y.duplicate].sort()).toEqual([false, true]);
    expect(x.message.id).toBe(y.message.id);
    expect(await prisma().message.count({ where: { clientMsgId: cid } })).toBe(1);
    await sleep(150);
    expect(events.filter((e) => e.name === "message:new")).toHaveLength(1);
    a.disconnect(); b.disconnect();
  });
});

describe("TB-01: số chưa đọc realtime và đồng bộ nhiều tab", () => {
  it("TB-01-AC1/AC2/AC3: B nhận 3 tin → unread 3; B đọc ở tab 1 → tab 2 nhận unread:update về 0", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b1 = await srv.connect(u["sock.b"].cookie);
    const b2 = await srv.connect(u["sock.b"].cookie); // tab thứ hai, cùng phiên
    await srv.http.post(`/api/conversations/${convAB}/read`).set("Origin", ORIGIN).set("Cookie", u["sock.b"].cookie).send({});
    const counts: number[] = [];
    b2.on("conversation:updated", ({ conversation }) => counts.push(conversation.unreadCount));
    for (let i = 1; i <= 3; i++) await send(a, { conversationId: convAB, content: `chưa đọc ${i}`, clientMessageId: randomUUID() });
    await sleep(200);
    expect(counts).toEqual([1, 2, 3]);

    const list = await srv.http.get("/api/conversations").set("Cookie", u["sock.b"].cookie);
    expect(list.body.conversations.find((c: any) => c.id === convAB).unreadCount).toBe(3);
    expect(list.body.totalUnread).toBe(3);

    const syncTab2 = waitFor<any>(b2, "unread:update", (p) => p.conversationId === convAB);
    const read = await srv.http.post(`/api/conversations/${convAB}/read`).set("Origin", ORIGIN).set("Cookie", u["sock.b"].cookie).send({});
    expect(read.body).toMatchObject({ unreadCount: 0, totalUnread: 0 });
    expect((await syncTab2).unreadCount).toBe(0);

    // Tin của A không tính chưa đọc cho chính A
    const listA = await srv.http.get("/api/conversations").set("Cookie", u["sock.a"].cookie);
    expect(listA.body.conversations.find((c: any) => c.id === convAB).unreadCount).toBe(0);
    a.disconnect(); b1.disconnect(); b2.disconnect();
  });
});

describe("Người ngoài C – từ chối ở socket (NFR-04, E-CH02-3)", () => {
  it("C không được vào phòng conv của A–B, không nhận tin; gửi vào hội thoại → bị từ chối, không lưu, không phát", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b = await srv.connect(u["sock.b"].cookie);
    const c = await srv.connect(u["sock.c"].cookie);
    const eventsA = record(a), eventsB = record(b), eventsC = record(c);

    await send(a, { conversationId: convAB, content: "Bí mật của A và B", clientMessageId: randomUUID() });
    const before = await countMessages();
    const r = await send(c, { conversationId: convAB, content: "C chen vào", clientMessageId: randomUUID() });
    expect(r).toEqual({ ok: false, error: { code: "CONVERSATION_FORBIDDEN", message: M.M30, retryable: false } });
    const r2 = await send(c, { conversationId: 987654, content: "hội thoại không tồn tại", clientMessageId: randomUUID() });
    expect(r2).toEqual(r); // cùng phản hồi – không lộ hội thoại có thật

    // C thử tự "join" phòng bằng sự kiện tùy ý: máy chủ không có handler nào → không vào được phòng
    c.emit("join", `conv:${convAB}`);
    c.emit("conversation:join", { conversationId: convAB });
    await sleep(100);
    await send(b, { conversationId: convAB, content: "Sau khi C cố vào phòng", clientMessageId: randomUUID() });
    await sleep(200);

    expect(await countMessages()).toBe(before + 1);
    expect(eventsC.filter((e) => e.name !== "ready")).toEqual([]); // C không nhận BẤT KỲ sự kiện nào của A–B
    const contentsA = eventsA.filter((e) => e.name === "message:new").map((e) => e.payload.message.content);
    expect(contentsA).not.toContain("C chen vào");
    expect(eventsB.filter((e) => e.name === "message:new").map((e) => e.payload.message.content)).toEqual(["Bí mật của A và B", "Sau khi C cố vào phòng"]);
    a.disconnect(); b.disconnect(); c.disconnect();
  });
});

describe("Phiên bị hủy → socket bị ngắt (TK-03 R4)", () => {
  it("ST-SES-01: đăng xuất → session:revoked(logout) rồi ngắt; cookie cũ không kết nối lại được", async () => {
    const { cookie } = await login(srv.http as never, "sock.b", "Matkhau123");
    const s = await srv.connect(cookie);
    const revoked = waitFor<any>(s, "session:revoked");
    const disconnected = waitFor<any>(s, "disconnect");
    await srv.http.post("/api/auth/logout").set("Origin", ORIGIN).set("Cookie", cookie);
    expect(await revoked).toEqual({ reason: "logout" });
    await disconnected;
    const again = srv.rawSocket(cookie);
    expect((await waitFor<Error>(again, "connect_error")).message).toBe("UNAUTHENTICATED");
  });

  it("ST-SES-02: đổi mật khẩu → phiên khác bị ngắt (password_change), phiên hiện tại vẫn gửi được", async () => {
    await register(srv.http as never, { username: "sock.pw", displayName: "Đổi Mật Khẩu" });
    const s1 = await login(srv.http as never, "sock.pw", "Matkhau123");
    const s2 = await login(srv.http as never, "sock.pw", "Matkhau123");
    const keep = await srv.connect(s1.cookie);
    const other = await srv.connect(s2.cookie);
    const revoked = waitFor<any>(other, "session:revoked");
    const res = await srv.http.put("/api/me/password").set("Origin", ORIGIN).set("Cookie", s1.cookie)
      .send({ currentPassword: "Matkhau123", newPassword: "Matkhau456", newPasswordConfirm: "Matkhau456" });
    expect(res.status).toBe(204);
    expect(await revoked).toEqual({ reason: "password_change" });
    await sleep(100);
    expect(other.connected).toBe(false);
    expect(keep.connected).toBe(true);
    keep.disconnect();
  });

  it("GL-04: phiên bị hủy trong lúc socket còn mở → message:send bị từ chối và socket bị ngắt", async () => {
    const { cookie } = await login(srv.http as never, "sock.a", "Matkhau123");
    const s = await srv.connect(cookie);
    // Hủy phiên trực tiếp trong CSDL (không qua đường logout) để kiểm tra lần kiểm tra lại mỗi lần gửi
    const sess = await prisma().session.findFirstOrThrow({ where: { userId: u["sock.a"].id, revokedAt: null }, orderBy: { id: "desc" } });
    await prisma().session.update({ where: { id: sess.id }, data: { revokedAt: new Date(), revokedReason: "logout" } });
    const before = await countMessages();
    const r = await send(s, { conversationId: convAB, content: "sau khi hủy phiên", clientMessageId: randomUUID() });
    expect(r.error.code).toBe("UNAUTHENTICATED");
    expect(await countMessages()).toBe(before);
  });
});

describe("Định dạng tin nhắn (phông, cỡ, màu chữ) – 2026-11-17", () => {
  it("người gửi chọn định dạng → lưu CSDL, ack và người nhận thấy đúng; khóa mặc định lưu là NULL", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const b = await srv.connect(u["sock.b"].cookie);
    const gotB = waitFor<any>(b, "message:new");
    const ack = await send(a, { conversationId: convAB, content: "Chữ đỏ, viết tay", clientMessageId: randomUUID(),
      format: { font: "viet-tay", size: "vua", color: "do" } });
    expect(ack.ok).toBe(true);
    expect(ack.message.format).toEqual({ font: "viet-tay", size: null, color: "do" });
    expect((await gotB).message.format).toEqual({ font: "viet-tay", size: null, color: "do" });
    const row = await prisma().message.findUnique({ where: { id: ack.message.id } });
    expect(row).toMatchObject({ fmtFont: "viet-tay", fmtSize: null, fmtColor: "do" });

    const plain = await send(a, { conversationId: convAB, content: "Tin thường", clientMessageId: randomUUID() });
    expect(plain.message.format).toBeNull();
    a.disconnect(); b.disconnect();
  });

  it("khóa ngoài danh mục (mã màu tùy ý, phông lạ, trường lạ) → VALIDATION_ERROR, không lưu", async () => {
    const a = await srv.connect(u["sock.a"].cookie);
    const before = await countMessages();
    for (const format of [{ color: "#ff0000" }, { font: "Comic Sans" }, { size: "lon", css: "x" }]) {
      const ack = await send(a, { conversationId: convAB, content: "x", clientMessageId: randomUUID(), format });
      expect(ack).toMatchObject({ ok: false, error: { code: "VALIDATION_ERROR" } });
    }
    expect(await countMessages()).toBe(before);
    a.disconnect();
  });
});
