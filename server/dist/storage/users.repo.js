import { prisma } from "./prisma.js";
const db = (tx) => tx ?? prisma();
export function findByUsername(username) {
    return prisma().user.findUnique({ where: { username } });
}
export function findById(id) {
    return prisma().user.findUnique({ where: { id } });
}
export function createUser(data) {
    return prisma().user.create({ data });
}
export function updateDisplayName(id, displayName, displayNameSearch) {
    return prisma().user.update({ where: { id }, data: { displayName, displayNameSearch } });
}
export function updatePasswordHash(id, passwordHash, tx) {
    return db(tx).user.update({ where: { id }, data: { passwordHash } });
}
/**
 * Tìm theo tên đăng nhập hoặc display_name_search CHỨA từ khóa (TK-06, GT-09).
 * `pattern` đã được thoát ký tự LIKE và bọc %…% ở tầng service.
 * Cả hai cột và từ khóa đều đã ở chữ thường nên kết quả không phụ thuộc chế độ
 * phân biệt hoa thường của LIKE trong SQLite (chỉ áp dụng A–Z).
 */
export function searchUsers(pattern, excludeUserId, limit, excludeConversationId = 0) {
    return prisma().$queryRaw `
    SELECT id, username, display_name AS displayName
    FROM users
    WHERE id <> ${excludeUserId}
      AND (username LIKE ${pattern} ESCAPE '\\' OR display_name_search LIKE ${pattern} ESCAPE '\\')
      AND id NOT IN (SELECT user_id FROM conversation_members
                     WHERE conversation_id = ${excludeConversationId} AND left_at IS NULL)
    ORDER BY display_name_search ASC, id ASC
    LIMIT ${limit}`;
}
