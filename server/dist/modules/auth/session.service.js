// Phiên: token ngẫu nhiên, chỉ lưu SHA-256 trong bảng sessions (ADR-02).
// Đăng xuất / đổi mật khẩu ghi revoked_at → token cũ không dùng lại được dù còn hạn (TK-03 R3).
import { createHash, randomBytes } from "node:crypto";
import * as sessions from "../../storage/sessions.repo.js";
import { AppError } from "../../common/errors.js";
import { disconnectSession } from "../notifications/realtime.js";
export const hashToken = (token) => createHash("sha256").update(token).digest("hex");
export async function createSession(userId, ttlHours, now = new Date()) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + ttlHours * 3600_000);
    const row = await sessions.createSession(userId, hashToken(token), expiresAt);
    return { token, sessionId: row.id, expiresAt };
}
/** Cửa G1: trả AuthContext hoặc ném UNAUTHENTICATED. */
export async function resolveSession(token, now = new Date()) {
    if (!token || typeof token !== "string" || token.length > 200)
        throw new AppError("UNAUTHENTICATED");
    const row = await sessions.findActiveByTokenHash(hashToken(token), now);
    if (!row)
        throw new AppError("UNAUTHENTICATED");
    return {
        sessionId: row.id,
        userId: row.userId,
        expiresAt: row.expiresAt,
        user: { id: row.user.id, username: row.user.username, displayName: row.user.displayName },
    };
}
export async function revoke(sessionId, reason, now = new Date()) {
    await sessions.revokeSession(sessionId, reason, now);
    disconnectSession(sessionId, reason); // TK-03 R4: đóng kết nối realtime của phiên
}
