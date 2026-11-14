// Kết nối Socket.IO CHỈ qua WebSocket (ADR-03), cùng địa chỉ với trang; cookie HttpOnly tự đi kèm.
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function connectSocket(onRevoked: () => void): Socket {
  socket?.disconnect();
  const s = io({ transports: ["websocket"], withCredentials: true, reconnectionDelay: 1000, reconnectionDelayMax: 30000 });
  s.on("session:revoked", () => onRevoked());
  s.on("connect_error", (err) => {
    if (err.message === "UNAUTHENTICATED") { s.disconnect(); onRevoked(); }
  });
  socket = s;
  return s;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
