// Điểm vào khi chạy trên Vercel Functions (Fluid compute): tạo HTTP server gồm Express + Socket.IO
// rồi XUẤT server ra (không gọi listen – nền tảng tự nhận kết nối, kể cả WebSocket).
// Mỗi instance chạy tệp này một lần. Bản chạy local / một tiến trình vẫn dùng server.ts.
import http from "node:http";
import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { initDatabase, isPostgres } from "./storage/prisma.js";
import { attachRealtime, usePostgresAdapter } from "./realtime-server.js";

const e = env(); // dừng ngay nếu thiếu biến bắt buộc
await initDatabase();
const server = http.createServer(createApp());
const io = attachRealtime(server);
if (isPostgres() && e.DATABASE_URL_UNPOOLED) await usePostgresAdapter(io, e.DATABASE_URL_UNPOOLED);

export default server;
