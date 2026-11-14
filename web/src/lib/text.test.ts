import { describe, expect, it } from "vitest";
import { M, avatarColorVar, checkDisplayName, checkPassword, checkUsername, countChars, passwordRules } from "./text";

// Cùng bộ ca với server/test/unit/validation.test.ts để bảo đảm hai bên GIỐNG HỆT.
describe("lib/text (giống server)", () => {
  it("TK-02: abc12345 đạt; abcdefgh, 12345678, abc1234 không đạt", () => {
    expect(checkPassword("abc12345")).toBeNull();
    expect(checkPassword("abcdefgh")).toBe(M.M07);
    expect(checkPassword("12345678")).toBe(M.M07);
    expect(checkPassword("abc1234")).toBe(M.M06);
    expect(checkPassword("a1" + "x".repeat(63))).toBe(M.M08);
  });
  it("passwordRules đếm chữ có dấu là chữ cái", () => {
    expect(passwordRules("ăăăăăăă1")).toEqual({ minLength: true, maxLength: true, hasLetter: true, hasDigit: true });
  });
  it("username: NhanVien01 đạt (tự đổi chữ thường), an-nguyen không", () => {
    expect(checkUsername("NhanVien01")).toBeNull();
    expect(checkUsername("an-nguyen")).toBe(M.M02);
  });
  it("displayName: chỉ khoảng trắng không đạt; NFD được chuẩn hóa trước khi đếm", () => {
    expect(checkDisplayName("   ")).toBe(M.M03);
    expect(checkDisplayName("Ẩ".normalize("NFD").repeat(50))).toBeNull();
    expect(countChars("😀")).toBe(1);
  });
  it("màu avatar cố định theo id % 6", () => {
    expect(avatarColorVar(0)).toBe("var(--avatar-1)");
    expect(avatarColorVar(7)).toBe("var(--avatar-2)");
  });
});
