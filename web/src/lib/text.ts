// GIỐNG HỆT thuật toán ở server/src/common/validation.ts (09 mục 4.1).
// Chỉ để báo lỗi sớm; máy chủ luôn kiểm tra lại (FRS NT-01).
export const M = {
  M02: "Tên đăng nhập dài 3–30 ký tự, chỉ gồm chữ không dấu (a–z), số (0–9), dấu chấm (.) hoặc gạch dưới (_).",
  M03: "Tên hiển thị không được để trống và tối đa 50 ký tự.",
  M04: "Mật khẩu nhập lại không khớp.",
  M05: "Mã đăng ký tổ chức không đúng. Vui lòng liên hệ đầu mối của tổ chức để nhận mã.",
  M06: "Mật khẩu phải có ít nhất 8 ký tự.",
  M07: "Mật khẩu phải có cả chữ cái và chữ số.",
  M08: "Mật khẩu tối đa 64 ký tự.",
  M09: "Tên đăng nhập hoặc mật khẩu không đúng.",
  M14: "Không tìm thấy người dùng phù hợp.",
  M31: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  M34: "Không kết nối được máy chủ. Vui lòng thử lại.",
  M35: "Vui lòng nhập đủ tên đăng nhập và mật khẩu.",
  M40: "Đăng ký thành công. Vui lòng đăng nhập.",
  M41: "Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.",
  M42: "Đã lưu tên hiển thị.",
} as const;

export const nfc = (s: string) => s.normalize("NFC");
export const countChars = (s: string) => Array.from(s).length;

export const normalizeUsername = (s: string) => nfc(s).trim().toLowerCase();
export const checkUsername = (s: string) => (/^[a-z0-9._]{3,30}$/.test(normalizeUsername(s)) ? null : M.M02);

export const checkDisplayName = (s: string) => {
  const n = countChars(nfc(s).trim());
  return n >= 1 && n <= 50 ? null : M.M03;
};

export function passwordRules(raw: string) {
  const pw = nfc(raw);
  const n = countChars(pw);
  return { minLength: n >= 8, maxLength: n <= 64, hasLetter: /\p{L}/u.test(pw), hasDigit: /[0-9]/.test(pw) };
}

export function checkPassword(raw: string): string | null {
  const r = passwordRules(raw);
  if (!r.minLength) return M.M06;
  if (!r.maxLength) return M.M08;
  if (!r.hasLetter || !r.hasDigit) return M.M07;
  return null;
}

/** Màu nền avatar cố định theo tài khoản: --avatar-(id % 6 + 1) (10-ui-ux.md mục 8.1). */
export const avatarColorVar = (id: number) => `var(--avatar-${(id % 6) + 1})`;
