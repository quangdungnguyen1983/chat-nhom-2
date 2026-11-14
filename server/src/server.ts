// Tạo HTTP server và lắng nghe PORT. (Socket.IO sẽ được gắn vào đây ở slice realtime.)
import http from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closeDatabase, initDatabase } from "./storage/prisma.js";
import { log } from "./common/logger.js";

async function main() {
  const e = env(); // dừng ngay nếu thiếu biến bắt buộc
  await initDatabase();
  const server = http.createServer(createApp());
  server.listen(e.PORT, () => log("info", `Máy chủ chạy tại cổng ${e.PORT} (${e.NODE_ENV})`));

  const shutdown = () => {
    server.close(() => void closeDatabase().then(() => process.exit(0)));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
