// Danh mục định dạng tin nhắn – phải khớp server/src/common/message-format.ts.
// Màu chữ đều đạt tương phản ≥ 4,5:1 trên nền bong bóng trắng.
export type FontKey = "mac-dinh" | "co-chan" | "viet-tay" | "but-long" | "danh-may";
export type SizeKey = "nho" | "vua" | "lon" | "rat-lon";
export type ColorKey = "mac-dinh" | "do" | "cam" | "xanh-la" | "xanh-duong" | "tim" | "hong" | "nau";
export type MessageFormat = { font: FontKey | null; size: SizeKey | null; color: ColorKey | null };

export const FONTS: { key: FontKey; name: string }[] = [
  { key: "mac-dinh", name: "Mặc định" },
  { key: "co-chan", name: "Có chân" },
  { key: "viet-tay", name: "Viết tay" },
  { key: "but-long", name: "Bút lông" },
  { key: "danh-may", name: "Đánh máy" },
];
export const SIZES: { key: SizeKey; name: string }[] = [
  { key: "nho", name: "Nhỏ" },
  { key: "vua", name: "Vừa" },
  { key: "lon", name: "Lớn" },
  { key: "rat-lon", name: "Rất lớn" },
];
export const COLORS: { key: ColorKey; name: string; hex: string }[] = [
  { key: "mac-dinh", name: "Mặc định", hex: "#1F2937" },
  { key: "do", name: "Đỏ", hex: "#C62828" },
  { key: "cam", name: "Cam", hex: "#B45309" },
  { key: "xanh-la", name: "Xanh lá", hex: "#15803D" },
  { key: "xanh-duong", name: "Xanh dương", hex: "#1D4ED8" },
  { key: "tim", name: "Tím", hex: "#7E22CE" },
  { key: "hong", name: "Hồng", hex: "#BE185D" },
  { key: "nau", name: "Nâu", hex: "#7C4A1E" },
];

export const DEFAULT_FORMAT: MessageFormat = { font: null, size: null, color: null };

/** Lớp CSS cho nội dung tin / ô soạn tin. */
export function formatClass(f: MessageFormat | null | undefined): string {
  if (!f) return "";
  return [f.font && `fmt-font-${f.font}`, f.size && `fmt-size-${f.size}`, f.color && `fmt-color-${f.color}`].filter(Boolean).join(" ");
}

export const isDefault = (f: MessageFormat) => !f.font && !f.size && !f.color;

/** Dữ liệu gửi qua socket: bỏ trường mặc định; không có gì thì không gửi. */
export function toPayload(f: MessageFormat): Partial<Record<"font" | "size" | "color", string>> | undefined {
  if (isDefault(f)) return undefined;
  return { ...(f.font && { font: f.font }), ...(f.size && { size: f.size }), ...(f.color && { color: f.color }) };
}

/** Chuẩn hóa lựa chọn: khóa mặc định → null. */
export function normalize(f: { font?: FontKey | null; size?: SizeKey | null; color?: ColorKey | null }): MessageFormat {
  return {
    font: f.font && f.font !== "mac-dinh" ? f.font : null,
    size: f.size && f.size !== "vua" ? f.size : null,
    color: f.color && f.color !== "mac-dinh" ? f.color : null,
  };
}

const key = (userId: number) => `msg-fmt:${userId}`;
/** Định dạng đang chọn được nhớ trên trình duyệt để lần sau soạn tin vẫn giữ. */
export function loadFormat(userId: number): MessageFormat {
  try {
    const raw = JSON.parse(localStorage.getItem(key(userId)) ?? "null") as Partial<MessageFormat> | null;
    if (!raw) return DEFAULT_FORMAT;
    return normalize({
      font: FONTS.some((x) => x.key === raw.font) ? raw.font : null,
      size: SIZES.some((x) => x.key === raw.size) ? raw.size : null,
      color: COLORS.some((x) => x.key === raw.color) ? raw.color : null,
    });
  } catch {
    return DEFAULT_FORMAT;
  }
}
export function saveFormat(userId: number, f: MessageFormat): void {
  try { localStorage.setItem(key(userId), JSON.stringify(f)); } catch { /* bỏ qua */ }
}
