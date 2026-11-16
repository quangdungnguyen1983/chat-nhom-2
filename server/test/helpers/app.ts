import request from "supertest";
import { createApp } from "../../src/app.js";
import { initDatabase } from "../../src/storage/prisma.js";

export const ORIGIN = "http://localhost:5173";

let ready: Promise<void> | null = null;
export async function makeAgent() {
  ready ??= initDatabase();
  await ready;
  return request(createApp());
}

export type Agent = Awaited<ReturnType<typeof makeAgent>>;

export function registerBody(over: Partial<Record<string, string>> = {}) {
  return {
    username: "nhanvien01",
    password: "Matkhau123",
    passwordConfirm: "Matkhau123",
    displayName: "Nguyễn Văn An",
    ...over,
  };
}

export async function register(agent: Agent, over: Partial<Record<string, string>> = {}) {
  return agent.post("/api/auth/register").set("Origin", ORIGIN).send(registerBody(over));
}

/** Đăng nhập và trả chuỗi cookie "sid=…" để gửi lại ở các yêu cầu sau. */
export async function login(agent: Agent, username: string, password: string) {
  const res = await agent.post("/api/auth/login").set("Origin", ORIGIN).send({ username, password });
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookie = raw?.[0]?.split(";")[0] ?? "";
  return { res, cookie };
}
