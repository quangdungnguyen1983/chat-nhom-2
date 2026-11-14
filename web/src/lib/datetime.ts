// Định dạng thời gian theo giờ máy người dùng (GS-26, 10-ui-ux.md mục 9 và 11.1).
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

/** Số ngày lịch giữa `d` và `now` (0 = hôm nay, 1 = hôm qua). */
export const daysAgo = (d: Date, now = new Date()) => Math.round((startOfDay(now) - startOfDay(d)) / DAY);

export const hhmm = (iso: string) => { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const ddmmyyyy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

/** Thời gian ở danh sách hội thoại: "14:05" · "Hôm qua" · "12/11/2026". */
export function listTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const n = daysAgo(d, now);
  return n === 0 ? hhmm(iso) : n === 1 ? "Hôm qua" : ddmmyyyy(d);
}

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Dòng ngày trong khung chat: "Hôm nay" · "Hôm qua" · "Thứ Năm, 12/11/2026". */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const n = daysAgo(d, now);
  return n === 0 ? "Hôm nay" : n === 1 ? "Hôm qua" : `${WEEKDAYS[d.getDay()]}, ${ddmmyyyy(d)}`;
}

export const sameDay = (a: string, b: string) => startOfDay(new Date(a)) === startOfDay(new Date(b));
