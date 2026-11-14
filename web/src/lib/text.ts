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
  M17: "Tin nhắn vượt quá 5.000 ký tự (hiện có {n} ký tự).",
  M20: "Gửi không thành công.",
  M21: "Đã hiển thị toàn bộ lịch sử.",
  M22: "Không tải được tin nhắn cũ.",
  M23: "Bạn chưa có cuộc trò chuyện nào. Hãy tìm đồng nghiệp ở ô phía trên để bắt đầu.",
  M24: "Không tải được danh sách hội thoại.",
  M25: "Tên nhóm không được để trống và tối đa 100 ký tự.",
  M26: "Hãy chọn ít nhất 2 thành viên.",
  M28: "Bạn là thành viên duy nhất của nhóm nên chưa thể rời nhóm.",
  M30: "Không tìm thấy hội thoại hoặc bạn không có quyền truy cập.",
  M32: "Bạn không còn là thành viên của nhóm này.",
  M37: "Hãy chọn người nhận quyền trưởng nhóm trước khi rời nhóm.",
  M43: "Xóa {tên} khỏi nhóm? Người này sẽ không xem được lịch sử nhóm nữa.",
  M44: "Rời nhóm \"{tên nhóm}\"? Bạn sẽ không xem được lịch sử nhóm nữa.",
  M33: "Mất kết nối. Đang thử kết nối lại…",
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

// Nội dung tin – GIỐNG server (09 mục 4.1): NFC, \r\n → \n, không trim.
export const MAX_MESSAGE_CHARS = 5000;
export const normalizeContent = (s: string) => nfc(s).replace(/\r\n?/g, "\n");
export const hasVisibleChar = (s: string) => /\S/u.test(s);
export const formatCount = (n: number) => n.toLocaleString("vi-VN");
export const tooLongMessage = (n: number) => M.M17.replace("{n}", formatCount(n));
/** Badge: > 99 hiện "99+" (TB-01 R6). */
export const badgeText = (n: number) => (n > 99 ? "99+" : String(n));

export const checkGroupName = (s: string) => {
  const n = countChars(nfc(s).trim());
  return n >= 1 && n <= 100 ? null : M.M25;
};

/** Màu nền avatar cố định theo tài khoản: --avatar-(id % 6 + 1) (10-ui-ux.md mục 8.1). */
export const avatarColorVar = (id: number) => `var(--avatar-${(id % 6) + 1})`;
