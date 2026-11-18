// Kiểm tra tệp phía trình duyệt – cùng quy tắc với server/src/common/attachments.ts
// (máy chủ vẫn kiểm tra lại; đây chỉ để báo lỗi sớm, không tốn băng thông).
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_CAPTION_CHARS = 1000;
export const ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z";
const EXT = new Set(ACCEPT.split(",").map((e) => e.slice(1)));

export const M40 = "Tệp quá lớn. Mỗi tệp tối đa 4 MB.";
export const M41 = "Loại tệp này chưa được hỗ trợ. Hãy gửi ảnh (JPG, PNG, GIF, WebP), PDF, Word, Excel, PowerPoint, TXT, CSV hoặc tệp nén (ZIP, RAR, 7Z).";
export const M42 = "Tệp rỗng hoặc không đọc được.";

export function checkFile(f: File): string | null {
  const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase() : "";
  if (!EXT.has(ext)) return M41;
  if (f.size === 0) return M42;
  if (f.size > MAX_FILE_BYTES) return M40;
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} KB`;
  return `${(n / 1024 / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
}

/** Biểu tượng theo loại tệp. */
export function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "📕";
  if (["doc", "docx", "txt"].includes(ext)) return "📘";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
  if (["ppt", "pptx"].includes(ext)) return "📙";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "🖼️";
  return "📄";
}
