import { describe, expect, it } from "vitest";
import { loadEnv } from "../../src/config/env.js";

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
});
