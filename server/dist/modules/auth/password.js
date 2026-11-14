// Băm mật khẩu bằng argon2id (09-detailed-design.md mục 4.3, GT-01).
// PDF TK-02 cho phép bcrypt hoặc argon2. 09 chọn argon2id vì bcrypt chỉ dùng 72 byte đầu
// (mật khẩu 64 ký tự tiếng Việt có dấu có thể vượt 72 byte) – chờ duyệt OQ-36.
import { hash, verify } from "@node-rs/argon2";
import { randomBytes } from "node:crypto";
const OPTIONS = { algorithm: 2 /* Algorithm.Argon2id */ }; // tham số mặc định của thư viện, không tự hạ
export function hashPassword(plain) {
    return hash(plain, OPTIONS);
}
export async function verifyPassword(hashed, plain) {
    try {
        return await verify(hashed, plain);
    }
    catch {
        return false;
    }
}
// Băm giả để so khớp khi tên đăng nhập không tồn tại → thời gian phản hồi tương đương (09 A2).
let dummyHash = null;
export function getDummyHash() {
    if (!dummyHash)
        dummyHash = hashPassword(randomBytes(16).toString("hex") + "a1");
    return dummyHash;
}
