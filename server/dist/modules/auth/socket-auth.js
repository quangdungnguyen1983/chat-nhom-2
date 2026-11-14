import { env } from "../../config/env.js";
import { resolveSession } from "./session.service.js";
/** Đọc một cookie từ header Cookie (không phụ thuộc thư viện ngoài). */
export function readCookie(header, name) {
    for (const part of (header ?? "").split(";")) {
        const i = part.indexOf("=");
        if (i > 0 && part.slice(0, i).trim() === name) {
            try {
                return decodeURIComponent(part.slice(i + 1).trim());
            }
            catch {
                return undefined;
            }
        }
    }
    return undefined;
}
export async function socketAuth(socket, next) {
    try {
        const origin = socket.handshake.headers.origin;
        if (origin !== env().APP_ORIGIN)
            return next(new Error("FORBIDDEN_ORIGIN"));
        const auth = await resolveSession(readCookie(socket.handshake.headers.cookie, env().COOKIE_NAME));
        socket.data = { userId: auth.userId, sessionId: auth.sessionId, expiresAt: auth.expiresAt };
        next();
    }
    catch {
        next(new Error("UNAUTHENTICATED"));
    }
}
