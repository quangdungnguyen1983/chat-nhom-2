// Gắn Socket.IO vào HTTP server. CHỈ transport WebSocket – không long-polling (ADR-03, GH-04).
import type http from "node:http";
import { Server } from "socket.io";
import { socketAuth, type SocketData } from "./modules/auth/socket-auth.js";
import { registerChatHandlers } from "./modules/chat/chat.socket.js";
import * as realtime from "./modules/notifications/realtime.js";
import * as members from "./storage/members.repo.js";

const MAX_TIMER_MS = 2_147_483_647;

export function attachRealtime(httpServer: http.Server): Server {
  const io = new Server(httpServer, {
    transports: ["websocket"],
    allowUpgrades: false,
    maxHttpBufferSize: 65_536,
    serveClient: false,
  });
  io.use(socketAuth);
  io.on("connection", async (socket) => {
    const data = socket.data as SocketData;
    // Chỉ vào phòng của hội thoại mà người này ĐANG là thành viên; không có sự kiện nào cho phép trình duyệt tự xin vào phòng.
    // Vào phòng user/session TRƯỚC, để lệnh socketsLeave (khi bị xóa / rời nhóm) tới được socket này ngay.
    socket.join([realtime.rooms.user(data.userId), realtime.rooms.session(data.sessionId)]);
    const convIds = await members.activeConversationIds(data.userId);
    socket.join(convIds.map(realtime.rooms.conv));
    // Đọc lại sau khi join: nếu vừa bị xóa khỏi nhóm trong lúc đang kết nối thì rời phòng đó (tránh race).
    const still = new Set(await members.activeConversationIds(data.userId));
    for (const id of convIds) if (!still.has(id)) socket.leave(realtime.rooms.conv(id));

    // Hết hạn phiên → session:revoked (expired) rồi ngắt (GT-14).
    const ms = data.expiresAt.getTime() - Date.now();
    const timer = setTimeout(() => {
      socket.emit("session:revoked", { reason: "expired" });
      socket.disconnect(true);
    }, Math.max(0, Math.min(ms, MAX_TIMER_MS)));
    socket.on("disconnect", () => clearTimeout(timer));

    registerChatHandlers(socket);
    socket.emit("ready", { conversationIds: convIds.filter((id) => still.has(id)) });
  });
  realtime.setIo(io);
  return io;
}
