import { AppError } from "../../common/errors.js";
import { env } from "../../config/env.js";
import { resolveSession } from "./session.service.js";
export async function requireAuth(req, _res, next) {
    try {
        const token = req.cookies?.[env().COOKIE_NAME];
        req.auth = await resolveSession(token);
        next();
    }
    catch (err) {
        next(err);
    }
}
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** Chống giả mạo yêu cầu từ trang khác: POST/PUT/PATCH/DELETE phải có Origin đúng APP_ORIGIN. */
export function checkOrigin(req, _res, next) {
    if (!UNSAFE.has(req.method))
        return next();
    const origin = req.get("origin");
    if (origin !== env().APP_ORIGIN)
        return next(new AppError("FORBIDDEN_ORIGIN"));
    next();
}
