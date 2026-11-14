import { prisma, type Tx } from "./prisma.js";

export type RevokedReason = "logout" | "password_change";

export function createSession(userId: number, tokenHash: string, expiresAt: Date) {
  return prisma().session.create({ data: { userId, tokenHash, expiresAt } });
}

/** Phiên còn hiệu lực: đúng bản băm, chưa hủy, chưa hết hạn (cửa G1). */
export function findActiveByTokenHash(tokenHash: string, now: Date) {
  return prisma().session.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
    include: { user: true },
  });
}

export function revokeSession(id: number, reason: RevokedReason, now: Date) {
  return prisma().session.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: now, revokedReason: reason },
  });
}

/** Hủy mọi phiên CHƯA hủy của người dùng, trừ phiên `keepSessionId`. */
export async function revokeOtherSessions(userId: number, keepSessionId: number, reason: RevokedReason, now: Date, tx?: Tx) {
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
