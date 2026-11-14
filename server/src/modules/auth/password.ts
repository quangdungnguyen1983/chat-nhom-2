// Băm mật khẩu bằng argon2id (09-detailed-design.md mục 4.3, GT-01).
// PDF TK-02 cho phép bcrypt hoặc argon2. 09 chọn argon2id vì bcrypt chỉ dùng 72 byte đầu
// (mật khẩu 64 ký tự tiếng Việt có dấu có thể vượt 72 byte) – chờ duyệt OQ-36.
import { hash, verify, Algorithm } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";

const OPTIONS = { algorithm: Algorithm.Argon2id } as const; // tham số mặc định của thư viện, không tự hạ

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    return false;
  }
}

// Băm giả để so khớp khi tên đăng nhập không tồn tại → thời gian phản hồi tương đương (09 A2).
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString("hex") + "a1");
  return dummyHash;
}
