// Câu tin hệ thống HT-01…HT-06 (03-frs.md FRS-14). Tên là tên hiển thị TẠI THỜI ĐIỂM sự kiện (GS-32).
export type SystemEvent =
  | { type: "group_created"; actor: string; groupName: string }
  | { type: "member_added"; actor: string; target: string }
  | { type: "member_removed"; actor: string; target: string }
  | { type: "member_left"; target: string }
  | { type: "group_renamed"; actor: string; newName: string }
  | { type: "owner_transferred"; actor: string; target: string };

export function systemText(e: SystemEvent): string {
  switch (e.type) {
    case "group_created": return `${e.actor} đã tạo nhóm "${e.groupName}"`;          // HT-01
    case "member_added": return `${e.actor} đã thêm ${e.target} vào nhóm`;           // HT-02
    case "member_removed": return `${e.actor} đã xóa ${e.target} khỏi nhóm`;         // HT-03
    case "member_left": return `${e.target} đã rời nhóm`;                            // HT-04
    case "group_renamed": return `${e.actor} đã đổi tên nhóm thành "${e.newName}"`;  // HT-05
    case "owner_transferred": return `${e.actor} đã chuyển quyền trưởng nhóm cho ${e.target}`; // HT-06
  }
}
