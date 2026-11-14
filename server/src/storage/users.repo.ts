import { prisma, type Tx } from "./prisma.js";

export type UserRow = {
  id: number;
  username: string;
  passwordHash: string;
  displayName: string;
  displayNameSearch: string;
};

const db = (tx?: Tx) => tx ?? prisma();

export function findByUsername(username: string): Promise<UserRow | null> {
  return prisma().user.findUnique({ where: { username } });
}

export function findById(id: number): Promise<UserRow | null> {
  return prisma().user.findUnique({ where: { id } });
}

export function createUser(data: Omit<UserRow, "id">): Promise<UserRow> {
  return prisma().user.create({ data });
}

export function updateDisplayName(id: number, displayName: string, displayNameSearch: string): Promise<UserRow> {
  return prisma().user.update({ where: { id }, data: { displayName, displayNameSearch } });
}

export function updatePasswordHash(id: number, passwordHash: string, tx?: Tx): Promise<UserRow> {
  return db(tx).user.update({ where: { id }, data: { passwordHash } });
}

/**
 * Tìm theo tên đăng nhập hoặc display_name_search CHỨA từ khóa (TK-06, GT-09).
 * `pattern` đã được thoát ký tự LIKE và bọc %…% ở tầng service.
 * Cả hai cột và từ khóa đều đã ở chữ thường nên kết quả không phụ thuộc chế độ
 * phân biệt hoa thường của LIKE (SQLite: chỉ A–Z; PostgreSQL: luôn phân biệt).
 * Bí danh cột đặt trong ngoặc kép để PostgreSQL giữ nguyên chữ hoa "displayName".
 */
export function searchUsers(pattern: string, excludeUserId: number, limit: number, excludeConversationId = 0) {
  return prisma().$queryRaw<Array<{ id: number; username: string; displayName: string }>>`
    SELECT id, username, display_name AS "displayName"
    FROM users
    WHERE id <> ${excludeUserId}
      AND (username LIKE ${pattern} ESCAPE '\\' OR display_name_search LIKE ${pattern} ESCAPE '\\')
      AND id NOT IN (SELECT user_id FROM conversation_members
                     WHERE conversation_id = ${excludeConversationId} AND left_at IS NULL)
    ORDER BY display_name_search ASC, id ASC
    LIMIT ${limit}`;
}
