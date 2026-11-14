// requireAuth cho REST (cửa G1) và kiểm tra Origin cho yêu cầu thay đổi dữ liệu (GH-03).
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors.js";
import { env, isAllowedOrigin } from "../../config/env.js";
import { resolveSession } from "./session.service.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[env().COOKIE_NAME] as string | undefined;
    req.auth = await resolveSession(token);
    next();
  } catch (err) {
    next(err);
  }
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Chống giả mạo yêu cầu từ trang khác: POST/PUT/PATCH/DELETE phải có Origin đúng APP_ORIGIN
 * (hoặc tên miền của chính bản deploy trên Vercel – xem allowedOrigins).
 */
export function checkOrigin(req: Request, _res: Response, next: NextFunction) {
  if (!UNSAFE.has(req.method)) return next();
  if (!isAllowedOrigin(req.get("origin"))) return next(new AppError("FORBIDDEN_ORIGIN"));
  next();
}
