// DB-01, DB-02, DB-08 (09 mục 13.2): ràng buộc thật sự có trong CSDL.
import { beforeAll, describe, expect, it } from "vitest";
import { initDatabase, prisma } from "../../src/storage/prisma.js";

beforeAll(async () => {
  await initDatabase();
});

const insertUser = (username: string, displayName = "Tên") =>
  prisma().$executeRawUnsafe(
    `INSERT INTO users (username, password_hash, display_name, display_name_search, updated_at) VALUES (?, 'h', ?, lower(?), CURRENT_TIMESTAMP)`,
    username, displayName, displayName,
  );

describe("ràng buộc CSDL", () => {
  it("DB-01: khóa ngoại đang bật", async () => {
    const rows = await prisma().$queryRawUnsafe<Array<{ foreign_keys: bigint | number }>>("PRAGMA foreign_keys");
    expect(Number(rows[0].foreign_keys)).toBe(1);
    await expect(
      prisma().session.create({ data: { userId: 999999, tokenHash: "x", expiresAt: new Date(Date.now() + 1000) } }),
    ).rejects.toThrow();
  });

  it("DB-08: CHECK mẫu username (chữ thường, a–z0–9._, 3–30)", async () => {
    await expect(insertUser("hople.01")).resolves.toBe(1);
    for (const bad of ["HoaChu", "ab", "co-gach", "cό.dấu", "a".repeat(31)]) {
      await expect(insertUser(bad)).rejects.toThrow();
    }
  });

  it("CHECK tên hiển thị không rỗng / ≤ 50 ký tự", async () => {
    await expect(insertUser("rong01", "   ")).rejects.toThrow();
    await expect(insertUser("dai01", "Ẩ".repeat(51))).rejects.toThrow();
    await expect(insertUser("vua01", "Ẩ".repeat(50))).resolves.toBe(1);
  });

  it("UNIQUE username", async () => {
    await expect(insertUser("trung01")).resolves.toBe(1);
    await expect(insertUser("trung01")).rejects.toThrow();
  });

  it("CHECK cặp revoked_at / revoked_reason trong sessions", async () => {
    const u = await prisma().user.findFirstOrThrow({ where: { username: "hople.01" } });
    const base = { userId: u.id, expiresAt: new Date(Date.now() + 3600_000) };
    await expect(prisma().session.create({ data: { ...base, tokenHash: "t1", revokedAt: new Date() } })).rejects.toThrow();
    await expect(prisma().session.create({ data: { ...base, tokenHash: "t2", revokedAt: new Date(), revokedReason: "khac" } })).rejects.toThrow();
    await expect(prisma().session.create({ data: { ...base, tokenHash: "t3", revokedAt: new Date(), revokedReason: "logout" } })).resolves.toBeTruthy();
    await expect(prisma().session.create({ data: { ...base, tokenHash: "t4", expiresAt: new Date(Date.now() - 3600_000) } })).rejects.toThrow();
  });
});

describe("ràng buộc CSDL – bảng chat (slice 2)", () => {
  const mkUser = async (username: string) => {
    await insertUser(username);
    return (await prisma().user.findUniqueOrThrow({ where: { username } })).id;
  };

  it("UK cặp 1-1 và CHECK low < high, hình dạng direct", async () => {
    const x = await mkUser("db.x"), y = await mkUser("db.y");
    const [lo, hi] = [Math.min(x, y), Math.max(x, y)];
    await prisma().conversation.create({ data: { type: "direct", directUserLowId: lo, directUserHighId: hi, createdById: lo } });
    await expect(prisma().conversation.create({ data: { type: "direct", directUserLowId: lo, directUserHighId: hi, createdById: hi } })).rejects.toThrow();
    await expect(prisma().conversation.create({ data: { type: "direct", directUserLowId: hi, directUserHighId: lo, createdById: hi } })).rejects.toThrow();
    await expect(prisma().conversation.create({ data: { type: "direct", directUserLowId: lo, directUserHighId: hi, name: "x", createdById: lo } })).rejects.toThrow();
    await expect(prisma().conversation.create({ data: { type: "khac", createdById: lo } })).rejects.toThrow();
  });

  it("khóa ngoại kép: tác giả tin phải là thành viên hội thoại; CHECK tin trắng, > 5000, tin hệ thống", async () => {
    const x = await mkUser("db.m1"), y = await mkUser("db.m2"), z = await mkUser("db.m3");
    const [lo, hi] = [Math.min(x, y), Math.max(x, y)];
    const conv = await prisma().conversation.create({ data: { type: "direct", directUserLowId: lo, directUserHighId: hi, createdById: lo } });
    for (const uid of [lo, hi]) await prisma().conversationMember.create({ data: { conversationId: conv.id, userId: uid } });
    const msg = (senderId: number | null, content: string, extra: object = {}) =>
      prisma().message.create({ data: { conversationId: conv.id, senderId, type: "text", content, ...extra } });

    await expect(msg(x, "hợp lệ\n\ncó dấu")).resolves.toBeTruthy();
    await expect(msg(z, "người ngoài")).rejects.toThrow();                 // z không phải thành viên
    await expect(msg(x, " \n\t\r ")).rejects.toThrow();                     // chỉ khoảng trắng
    await expect(msg(x, "Ẩ".repeat(5000))).resolves.toBeTruthy();          // đúng 5000 ký tự
    await expect(msg(x, "Ẩ".repeat(5001))).rejects.toThrow();               // 5001
    await expect(msg(null, "không tác giả")).rejects.toThrow();
    await expect(prisma().message.create({ data: { conversationId: conv.id, type: "system", content: "x", eventType: "khac" } })).rejects.toThrow();
  });

  it("UK (sender_id, client_msg_id) chống tin trùng", async () => {
    const m = await prisma().message.findFirstOrThrow({ where: { type: "text" } });
    const cid = "11111111-1111-4111-8111-111111111111";
    await prisma().message.create({ data: { conversationId: m.conversationId, senderId: m.senderId, type: "text", content: "a", clientMsgId: cid } });
    await expect(prisma().message.create({ data: { conversationId: m.conversationId, senderId: m.senderId, type: "text", content: "b", clientMsgId: cid } })).rejects.toThrow();
  });
});
