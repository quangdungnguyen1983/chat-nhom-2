// Tạo HTTP server, gắn Express + Socket.IO (cùng một tiến trình – ADR-03), lắng nghe PORT.
import http from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { closeDatabase, initDatabase } from "./storage/prisma.js";
import { log } from "./common/logger.js";
import { attachRealtime } from "./realtime-server.js";

async function main() {
  const e = env(); // dừng ngay nếu thiếu biến bắt buộc
  await initDatabase();
  const server = http.createServer(createApp());
  const io = attachRealtime(server);
  server.listen(e.PORT, () => log("info", `Máy chủ chạy tại cổng ${e.PORT} (${e.NODE_ENV})`));

  const shutdown = () => {
    void io.close();
    server.close(() => void closeDatabase().then(() => process.exit(0)));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
