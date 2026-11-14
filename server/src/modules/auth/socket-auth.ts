// Middleware bắt tay Socket.IO (cửa G1, 09 mục 7.1): Origin đúng APP_ORIGIN + cookie phiên còn hiệu lực.
import type { Socket } from "socket.io";
import { env } from "../../config/env.js";
import { resolveSession } from "./session.service.js";

/** Đọc một cookie từ header Cookie (không phụ thuộc thư viện ngoài). */
export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}

export type SocketData = { userId: number; sessionId: number; expiresAt: Date };

export async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  try {
    const origin = socket.handshake.headers.origin;
    if (origin !== env().APP_ORIGIN) return next(new Error("FORBIDDEN_ORIGIN"));
    const auth = await resolveSession(readCookie(socket.handshake.headers.cookie, env().COOKIE_NAME));
    (socket.data as SocketData) = { userId: auth.userId, sessionId: auth.sessionId, expiresAt: auth.expiresAt };
    next();
  } catch {
    next(new Error("UNAUTHENTICATED"));
  }
}
