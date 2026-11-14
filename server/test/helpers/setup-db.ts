// Chạy trước MỖI file test: tạo CSDL SQLite tạm riêng, áp migration thật (09 mục 13.2).
// Không dùng seed. File được xóa sau khi file test chạy xong.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll } from "vitest";

const dir = mkdtempSync(path.join(tmpdir(), "chat-test-"));
const dbFile = path.join(dir, "test.db");

Object.assign(process.env, {
  NODE_ENV: "test",
  PORT: "3999",
  APP_ORIGIN: "http://localhost:5173",
  DATABASE_URL: `file:${dbFile}`,
  // Giá trị CHỈ dùng cho test, không phải mã thật.
  REGISTRATION_CODE: "test-only-registration-code",
  SESSION_TTL_HOURS: "8",
  COOKIE_SECURE: "false",
  COOKIE_NAME: "sid",
  LOG_LEVEL: process.env.TEST_LOG_LEVEL ?? "silent",
});

execFileSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: path.resolve(import.meta.dirname, "../.."),
  env: process.env,
  stdio: "pipe",
});

afterAll(async () => {
  const { closeDatabase } = await import("../../src/storage/prisma.js");
  await closeDatabase();
  rmSync(dir, { recursive: true, force: true });
});
