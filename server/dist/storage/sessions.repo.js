import { prisma } from "./prisma.js";
export function createSession(userId, tokenHash, expiresAt) {
    return prisma().session.create({ data: { userId, tokenHash, expiresAt } });
}
/** Phiên còn hiệu lực: đúng bản băm, chưa hủy, chưa hết hạn (cửa G1). */
export function findActiveByTokenHash(tokenHash, now) {
    return prisma().session.findFirst({
        where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
        include: { user: true },
    });
}
/** Kiểm tra lại phiên của socket mỗi lần gửi tin (GL-04). */
export function findActiveById(id, now) {
    return prisma().session.findFirst({ where: { id, revokedAt: null, expiresAt: { gt: now } }, select: { id: true } });
}
export function revokeSession(id, reason, now) {
    return prisma().session.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: now, revokedReason: reason },
    });
}
/** Hủy mọi phiên CHƯA hủy của người dùng, trừ phiên `keepSessionId`. */
export async function revokeOtherSessions(userId, keepSessionId, reason, now, tx) {
    const db = tx ?? prisma();
    const targets = await db.session.findMany({
        where: { userId, revokedAt: null, id: { not: keepSessionId } },
        select: { id: true },
    });
    await db.session.updateMany({
        where: { id: { in: targets.map((t) => t.id) } },
        data: { revokedAt: now, revokedReason: reason },
    });
    return targets.map((t) => t.id);
}
