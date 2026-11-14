export function systemText(e) {
    switch (e.type) {
        case "group_created": return `${e.actor} đã tạo nhóm "${e.groupName}"`; // HT-01
        case "member_added": return `${e.actor} đã thêm ${e.target} vào nhóm`; // HT-02
        case "member_removed": return `${e.actor} đã xóa ${e.target} khỏi nhóm`; // HT-03
        case "member_left": return `${e.target} đã rời nhóm`; // HT-04
        case "group_renamed": return `${e.actor} đã đổi tên nhóm thành "${e.newName}"`; // HT-05
        case "owner_transferred": return `${e.actor} đã chuyển quyền trưởng nhóm cho ${e.target}`; // HT-06
    }
}
