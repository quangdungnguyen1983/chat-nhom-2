// Chữ cái avatar (SRS TK-05 R3, GS-11): chữ cái đầu của TỪ CUỐI tên hiển thị, viết hoa, giữ dấu.
// "Nguyễn Văn Ẩn" → "Ẩ".
/** Avatar nhóm: chữ cái đầu của TÊN NHÓM (ui-design.html: "Phòng Kế hoạch" → P, "Nhóm Đổi Mới 2026" → N). */
export function groupInitial(name: string): string {
  const first = Array.from(name.normalize("NFC").trim())[0];
  return first ? first.toLocaleUpperCase("vi").normalize("NFC") : "?";
}

export function avatarInitial(displayName: string): string {
  const words = displayName.normalize("NFC").trim().split(/\s+/u).filter(Boolean);
  const last = words[words.length - 1];
  if (!last) return "?";
  const first = Array.from(last)[0] ?? "?";
  return first.toLocaleUpperCase("vi").normalize("NFC");
}
