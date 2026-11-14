// Tạo Express app: json limit, cookie, kiểm tra Origin, routes, xử lý lỗi, phục vụ web/dist.
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { AppError } from "./common/errors.js";
import { env } from "./config/env.js";
import { checkOrigin } from "./modules/auth/session.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { conversationsRouter } from "./modules/chat/conversations.routes.js";
import { readRouter } from "./modules/notifications/read.routes.js";
import { groupsRouter } from "./modules/groups/groups.routes.js";
import { log } from "./common/logger.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("query parser", "simple"); // không cho ?q[a]=… thành object

  // Ghi log CHỈ phương thức, đường dẫn (không query), mã trạng thái, thời gian.
  // Không bao giờ ghi body, cookie, mật khẩu hay token (TK-02-AC4).
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => log("info", `${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`));
    next();
  });

  app.use((_req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "same-origin");
    res.set("X-Frame-Options", "DENY");
    next();
  });

  app.use(express.json({ limit: "32kb" }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(checkOrigin);
  api.use(authRouter);
  api.use(usersRouter);
  api.use(readRouter);
  api.use(groupsRouter);
  api.use(conversationsRouter);
  api.use((_req, _res, next) => next(new AppError("NOT_FOUND")));
  app.use("/api", api);

  // Demo/production: phục vụ giao diện đã đóng gói cùng địa chỉ với API (GH-02).
  const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
  if (env().NODE_ENV === "production" && fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) return res.status(err.status).json(err.toBody());
    // Lỗi đọc JSON của express.json()
    if (typeof err === "object" && err && "type" in err && (err as { type: string }).type === "entity.parse.failed") {
      return res.status(400).json(new AppError("VALIDATION_ERROR").toBody());
    }
    if (typeof err === "object" && err && "type" in err && (err as { type: string }).type === "entity.too.large") {
      return res.status(413).json(new AppError("VALIDATION_ERROR").toBody());
    }
    log("error", `Lỗi không lường trước: ${err instanceof Error ? err.name + ": " + err.message.split("\n")[0] : "unknown"}`);
    res.status(500).json(new AppError("INTERNAL").toBody());
  });

  return app;
}
