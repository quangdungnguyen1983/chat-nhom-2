// Định dạng tin nhắn văn bản (yêu cầu 2026-11-17): người gửi chọn phông, cỡ, màu chữ cho từng tin;
// người nhận thấy đúng như vậy. Chỉ cho phép các KHÓA trong danh mục dưới đây (không nhận mã màu
// hay tên phông tùy ý) để giữ chữ dễ đọc và không chèn được CSS lạ. Danh mục phải khớp
// web/src/lib/message-format.ts và ràng buộc CHECK trong migration.
import { z } from "zod";

export const MESSAGE_FONTS = ["mac-dinh", "co-chan", "viet-tay", "but-long", "danh-may"] as const;
export const MESSAGE_SIZES = ["nho", "vua", "lon", "rat-lon"] as const;
export const MESSAGE_COLORS = ["mac-dinh", "do", "cam", "xanh-la", "xanh-duong", "tim", "hong", "nau"] as const;

export type MessageFormat = {
  font: (typeof MESSAGE_FONTS)[number] | null;
  size: (typeof MESSAGE_SIZES)[number] | null;
  color: (typeof MESSAGE_COLORS)[number] | null;
};

export const formatSchema = z.object({
  font: z.enum(MESSAGE_FONTS).optional(),
  size: z.enum(MESSAGE_SIZES).optional(),
  color: z.enum(MESSAGE_COLORS).optional(),
}).strict();

export type MessageFormatInput = z.infer<typeof formatSchema>;

/** Giá trị mặc định lưu là NULL để tin thường không tốn chỗ và hiển thị như cũ. */
export function toStoredFormat(f: MessageFormatInput | undefined) {
  return {
    fmtFont: f?.font && f.font !== "mac-dinh" ? f.font : null,
    fmtSize: f?.size && f.size !== "vua" ? f.size : null,
    fmtColor: f?.color && f.color !== "mac-dinh" ? f.color : null,
  };
}

export function toFormatDto(row: { fmtFont?: string | null; fmtSize?: string | null; fmtColor?: string | null }): MessageFormat | null {
  const font = (row.fmtFont ?? null) as MessageFormat["font"];
  const size = (row.fmtSize ?? null) as MessageFormat["size"];
  const color = (row.fmtColor ?? null) as MessageFormat["color"];
  return font || size || color ? { font, size, color } : null;
}
