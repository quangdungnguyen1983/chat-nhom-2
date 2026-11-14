// UT-VAL-01…08, UT-AVT-01 (09 mục 13.2)
import { describe, expect, it } from "vitest";
import {
  checkDisplayName, checkPassword, checkUsername, countChars, escapeLike, nfc, normalizeDisplayName,
  normalizeUsername, searchKey,
} from "../../src/common/validation.js";
import { avatarInitial } from "../../src/common/avatar.js";
import { M } from "../../src/common/messages.js";

describe("countChars / nfc", () => {
  it("chữ có dấu dạng tổ hợp (NFD) và dựng sẵn (NFC) cho cùng kết quả sau nfc", () => {
    const nfd = "Ẩn".normalize("NFD");
    expect(nfd.length).toBeGreaterThan(2);
    expect(countChars(nfc(nfd))).toBe(2);
    expect(countChars(nfc("Ẩn"))).toBe(2);
  });
  it("đếm theo điểm mã, không theo UTF-16", () => {
    expect("😀".length).toBe(2);
    expect(countChars("😀")).toBe(1);
  });
});

describe("TK-02 – quy tắc mật khẩu", () => {
  it("TK-02-AC1: abc12345 đạt", () => expect(checkPassword("abc12345")).toBeNull());
  it("TK-02-AC2: abcdefgh, 12345678, abc1234 bị từ chối với đúng câu", () => {
    expect(checkPassword("abcdefgh")).toBe(M.M07);
    expect(checkPassword("12345678")).toBe(M.M07);
    expect(checkPassword("abc1234")).toBe(M.M06);
  });
  it("chữ tiếng Việt có dấu được tính là chữ cái", () => expect(checkPassword("đđđđđđđ1")).toBeNull());
  it("tối đa 64 ký tự (M-08)", () => {
    expect(checkPassword("a1" + "x".repeat(62))).toBeNull();
    expect(checkPassword("a1" + "x".repeat(63))).toBe(M.M08);
  });
});

describe("TK-01 – tên đăng nhập, tên hiển thị", () => {
  it("NhanVien01 → nhanvien01 và hợp lệ", () => {
    const u = normalizeUsername("  NhanVien01 ");
    expect(u).toBe("nhanvien01");
    expect(checkUsername(u)).toBeNull();
  });
  it("an-nguyen, ab, chữ có dấu, quá 30 ký tự không đạt", () => {
    for (const bad of ["an-nguyen", "ab", "nguyễn", "a".repeat(31), "an nguyen"]) {
      expect(checkUsername(normalizeUsername(bad))).toBe(M.M02);
    }
  });
  it("tên hiển thị: trim, 1–50 ký tự", () => {
    expect(checkDisplayName(normalizeDisplayName("   "))).toBe(M.M03);
    expect(checkDisplayName(normalizeDisplayName("Đặng Thị Ẩn"))).toBeNull();
    expect(checkDisplayName("Ẩ".repeat(50))).toBeNull();
    expect(checkDisplayName("Ẩ".repeat(51))).toBe(M.M03);
  });
});

describe("TK-06 – searchKey, escapeLike", () => {
  it("đổi hoa thường đúng với chữ có dấu", () => expect(searchKey(" Đặng ")).toBe("đặng"));
  it("thoát ký tự đặc biệt của LIKE", () => expect(escapeLike("a_b%c\\")).toBe("a\\_b\\%c\\\\"));
});

describe("UT-AVT-01 – avatar", () => {
  it("Nguyễn Văn Ẩn → Ẩ", () => expect(avatarInitial("Nguyễn Văn Ẩn")).toBe("Ẩ"));
  it("Nguyễn Văn An → A; tên một từ; chữ thường → hoa", () => {
    expect(avatarInitial("Nguyễn Văn An")).toBe("A");
    expect(avatarInitial("bình")).toBe("B");
    expect(avatarInitial("đức".normalize("NFD"))).toBe("Đ");
  });
});
