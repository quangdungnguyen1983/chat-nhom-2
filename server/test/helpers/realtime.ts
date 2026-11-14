// Máy chủ HTTP THẬT (Express + Socket.IO) trên cổng ngẫu nhiên, client socket.io-client chỉ dùng WebSocket.
import http from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import { io as ioClient, type Socket } from "socket.io-client";
import { createApp } from "../../src/app.js";
import { attachRealtime } from "../../src/realtime-server.js";
import { initDatabase } from "../../src/storage/prisma.js";
import { setIo } from "../../src/modules/notifications/realtime.js";
import { ORIGIN } from "./app.js";

export async function startServer() {
  await initDatabase();
  const server = http.createServer(createApp());
  const io = attachRealtime(server);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const sockets: Socket[] = [];
  return {
    url,
    http: request(url),
    /** Kết nối socket với cookie phiên; chờ sự kiện "ready" (đã vào phòng). */
    async connect(cookie: string, origin = ORIGIN): Promise<Socket> {
      const s = ioClient(url, {
        transports: ["websocket"],
        extraHeaders: { Cookie: cookie, Origin: origin },
        reconnection: false,
        forceNew: true,
      });
      sockets.push(s);
      await new Promise<void>((resolve, reject) => {
        s.once("ready", () => resolve());
        s.once("connect_error", (e) => reject(e));
      });
      return s;
    },
    rawSocket(cookie: string, origin = ORIGIN): Socket {
      const s = ioClient(url, { transports: ["websocket"], extraHeaders: { Cookie: cookie, Origin: origin }, reconnection: false, forceNew: true });
      sockets.push(s);
      return s;
    },
    async close() {
      for (const s of sockets) s.disconnect();
      setIo(null);
      await io.close();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}

export type TestServer = Awaited<ReturnType<typeof startServer>>;

/** Ghi lại mọi sự kiện một socket nhận được. */
export function record(s: Socket) {
  const events: Array<{ name: string; payload: any }> = [];
  s.onAny((name, payload) => events.push({ name, payload }));
  return events;
}

export function waitFor<T = any>(s: Socket, event: string, pred: (p: T) => boolean = () => true, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { s.off(event, h); reject(new Error(`Hết giờ chờ ${event}`)); }, ms);
    const h = (p: T) => { if (pred(p)) { clearTimeout(t); s.off(event, h); resolve(p); } };
    s.on(event, h);
  });
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function send(s: Socket, payload: Record<string, unknown>): Promise<any> {
  return s.timeout(5000).emitWithAck("message:send", payload);
}
