import { describe, expect, it } from "vitest";
import { allowedOrigins, dbProvider, isAllowedOrigin, loadEnv } from "../../src/config/env.js";

const base = {
  NODE_ENV: "test", PORT: "3000", APP_ORIGIN: "http://localhost:5173", DATABASE_URL: "file:x.db",
  REGISTRATION_CODE: "abcdefgh", SESSION_TTL_HOURS: "8", COOKIE_SECURE: "false",
};

describe("config/env", () => {
  it("đọc được cấu hình hợp lệ", () => {
    const e = loadEnv(base);
    expect(e.COOKIE_SECURE).toBe(false);
    expect(e.COOKIE_NAME).toBe("sid");
  });
  it("dừng khi thiếu REGISTRATION_CODE và không in giá trị bí mật", () => {
    const { REGISTRATION_CODE: _omit, ...rest } = base;
    expect(() => loadEnv(rest)).toThrow(/REGISTRATION_CODE/);
    try { loadEnv({ ...base, REGISTRATION_CODE: "short" }); } catch (e) {
      expect(String(e)).not.toContain("short");
    }
  });
  it("Vercel: chấp nhận Origin của chính bản deploy, không chấp nhận trang khác", () => {
    const e = loadEnv({ ...base, VERCEL: "1", VERCEL_URL: "chat-abc123.vercel.app" });
    expect(allowedOrigins(e).has("https://chat-abc123.vercel.app")).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173", e)).toBe(true);
    expect(isAllowedOrigin("https://evil.example", e)).toBe(false);
    expect(isAllowedOrigin(undefined, e)).toBe(false);
  });
  it("nhận diện loại CSDL theo DATABASE_URL", () => {
    expect(dbProvider(loadEnv(base))).toBe("sqlite");
    expect(dbProvider(loadEnv({ ...base, DATABASE_URL: "postgresql://u:p@h/db" }))).toBe("postgresql");
  });
  it("dùng KV_URL làm REDIS_URL khi kho Redis chỉ cấp KV_URL", () => {
    expect(loadEnv({ ...base, KV_URL: "rediss://x" }).REDIS_URL).toBe("rediss://x");
  });
});
