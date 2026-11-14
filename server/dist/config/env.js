// Đọc và kiểm tra biến môi trường (09-detailed-design.md mục 11).
// Thiếu biến bắt buộc thì dừng khởi động, không chạy với giá trị đoán.
import { z } from "zod";
const boolStr = z.enum(["true", "false"]).transform((v) => v === "true");
const schema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().int().positive(),
    APP_ORIGIN: z.url(),
    DATABASE_URL: z.string().min(1),
    REGISTRATION_CODE: z.string().trim().min(8, "REGISTRATION_CODE phải có ít nhất 8 ký tự"),
    SESSION_TTL_HOURS: z.coerce.number().positive(),
    COOKIE_SECURE: boolStr,
    COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("sid"),
    LOG_LEVEL: z.enum(["silent", "error", "info", "debug"]).default("info"),
});
let cached = null;
export function loadEnv(source = process.env) {
    const parsed = schema.safeParse(source);
    if (!parsed.success) {
        // Chỉ in TÊN biến lỗi, không in giá trị (có thể là bí mật).
        const names = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        throw new Error(`Cấu hình môi trường không hợp lệ – ${names}`);
    }
    return parsed.data;
}
export function env() {
    if (!cached)
        cached = loadEnv();
    return cached;
}
