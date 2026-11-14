// Kiểm tra dữ liệu dùng chung (09-detailed-design.md mục 4).
// web/src/lib/text.ts dùng CÙNG thuật toán để báo lỗi sớm; máy chủ luôn kiểm tra lại (FRS NT-01).
import { M } from "./messages.js";
export const nfc = (s) => s.normalize("NFC");
/** Số điểm mã Unicode – KHÔNG dùng s.length (đếm theo UTF-16). */
export const countChars = (s) => Array.from(s).length;
/** Khóa tìm kiếm: NFC → trim → chữ thường (JS đổi đúng chữ có dấu: "Đặng" → "đặng"). */
export const searchKey = (s) => nfc(s).trim().toLowerCase();
export const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
export function normalizeUsername(raw) {
    return nfc(raw).trim().toLowerCase();
}
/** Trả câu lỗi M-02 nếu sai, null nếu đúng. Nhận giá trị ĐÃ chuẩn hóa. */
export function checkUsername(normalized) {
    return USERNAME_RE.test(normalized) ? null : M.M02;
}
export function normalizeDisplayName(raw) {
    return nfc(raw).trim();
}
export function checkDisplayName(normalized) {
    const n = countChars(normalized);
    return n >= 1 && n <= 50 ? null : M.M03;
}
/** Mật khẩu: NFC, KHÔNG trim (FRS NT-03). */
export function normalizePassword(raw) {
    return nfc(raw);
}
export function passwordRules(pw) {
    const n = countChars(pw);
    return {
        minLength: n >= 8,
        maxLength: n <= 64,
        hasLetter: /\p{L}/u.test(pw),
        hasDigit: /[0-9]/.test(pw),
    };
}
/** Thứ tự báo lỗi: thiếu độ dài (M-06) → quá dài (M-08) → thiếu thành phần (M-07). */
export function checkPassword(pw) {
    const r = passwordRules(pw);
    if (!r.minLength)
        return M.M06;
    if (!r.maxLength)
        return M.M08;
    if (!r.hasLetter || !r.hasDigit)
        return M.M07;
    return null;
}
/** Đổi \r\n và \r thành \n – mỗi lần xuống dòng tính 1 ký tự (GS-18). */
export const normalizeNewlines = (s) => s.replace(/\r\n?/g, "\n");
export const hasVisibleChar = (s) => /\S/u.test(s);
export const MAX_MESSAGE_CHARS = 5000; // PDF CH-02
/** Tên nhóm: NFC → trim, 1–100 ký tự (NH-01 R1, GS-28). Trả tên đã chuẩn hóa hoặc null nếu sai. */
export function normalizeGroupName(raw) {
    const name = nfc(raw).trim();
    const n = countChars(name);
    return n >= 1 && n <= 100 ? name : null;
}
/** Nội dung tin: NFC → chuẩn hóa xuống dòng; KHÔNG trim (FRS NT-03). */
export const normalizeContent = (raw) => normalizeNewlines(nfc(raw));
/** Thoát ký tự đặc biệt của LIKE (`\`, `%`, `_`) để dùng với ESCAPE '\' (GT-09). */
export function escapeLike(s) {
    return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
