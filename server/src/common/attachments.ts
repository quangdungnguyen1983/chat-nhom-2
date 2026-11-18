// Tệp đính kèm (yêu cầu 2026-11-18). Danh mục loại tệp cho phép xác định theo PHẦN MỞ RỘNG
// (không tin Content-Type do trình duyệt gửi). Ảnh được kiểm thêm chữ ký nhị phân để không thể
// đổi tên tệp HTML thành .png rồi cho trình duyệt hiển thị.
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // Vercel Function nhận tối đa 4,5 MB mỗi yêu cầu
export const MAX_CAPTION_CHARS = 1000;

export const ALLOWED_TYPES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
  zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed",
};

export const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

/** Bỏ đường dẫn, ký tự điều khiển và ký tự cấm trong tên tệp; giữ tối đa 200 ký tự. */
export function sanitizeFileName(raw: string): string {
  const base = raw.normalize("NFC").split(/[\\/]/).pop() ?? "";
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= 200) return clean;
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? clean.slice(dot) : "";
  return clean.slice(0, 200 - ext.length) + ext;
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/** Nội dung có đúng là ảnh như phần mở rộng nói không (chữ ký đầu tệp). */
export function imageSignatureMatches(mime: string, b: Uint8Array): boolean {
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  switch (mime) {
    case "image/png": return at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/jpeg": return at(0, 0xff, 0xd8, 0xff);
    case "image/gif": return at(0, 0x47, 0x49, 0x46, 0x38);
    case "image/webp": return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
    default: return true;
  }
}

/** Dòng tóm tắt dùng làm nội dung tin khi người gửi không ghi chú thích. */
export const fileLabel = (fileName: string) => `📎 ${fileName}`;
