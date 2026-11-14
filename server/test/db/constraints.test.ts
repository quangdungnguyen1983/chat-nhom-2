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
