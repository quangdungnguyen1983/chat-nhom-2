// /api/auth/* và /api/me/password – chỉ đọc tham số → gọi service → trả kết quả (09 mục 2.2).
import { Router, type Response } from "express";
import { env } from "../../config/env.js";
import { parseStrict, str } from "../../common/input.js";
import { M } from "../../common/messages.js";
import * as auth from "./auth.service.js";
import { requireAuth } from "./session.middleware.js";

function cookieOptions(maxAgeMs?: number) {
  const e = env();
  return { httpOnly: true, sameSite: "lax" as const, secure: e.COOKIE_SECURE, path: "/", ...(maxAgeMs ? { maxAge: maxAgeMs } : {}) };
}

function clearSessionCookie(res: Response) {
  res.clearCookie(env().COOKIE_NAME, cookieOptions());
}

export const authRouter = Router();

// A1 – TK-01, TK-02
authRouter.post("/auth/register", async (req, res) => {
  const body = parseStrict(
    { username: str(), password: str(), passwordConfirm: str(), displayName: str() },
    req.body,
  );
  const user = await auth.register(body);
  res.status(201).json({ user });
});

// A2 – TK-03
authRouter.post("/auth/login", async (req, res) => {
  const body = parseStrict({ username: str(), password: str() }, req.body, M.M35);
  const result = await auth.login(body.username, body.password, env().SESSION_TTL_HOURS);
  res.cookie(env().COOKIE_NAME, result.token, cookieOptions(result.expiresAt.getTime() - Date.now()));
  res.json({ user: result.user, session: { expiresAt: result.expiresAt.toISOString() } });
});

// A3 – TK-03: hủy phiên phía máy chủ
authRouter.post("/auth/logout", requireAuth, async (req, res) => {
  await auth.logout(req.auth!);
  clearSessionCookie(res);
  res.status(204).end();
});

// A4 – TK-04
authRouter.put("/me/password", requireAuth, async (req, res) => {
  const body = parseStrict({ currentPassword: str(), newPassword: str(), newPasswordConfirm: str() }, req.body);
  await auth.changePassword(req.auth!, body);
  res.status(204).end();
});
