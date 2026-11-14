// Đọc và kiểm tra biến môi trường (09-detailed-design.md mục 11).
// Thiếu biến bắt buộc thì dừng khởi động, không chạy với giá trị đoán.
import { z } from "zod";

const boolStr = z.enum(["true", "false"]).transform((v) => v === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  // Vercel Function không cần PORT (nền tảng tự nhận kết nối) nên có giá trị mặc định.
  PORT: z.coerce.number().int().positive().default(3000),
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  REGISTRATION_CODE: z.string().trim().min(8, "REGISTRATION_CODE phải có ít nhất 8 ký tự"),
  SESSION_TTL_HOURS: z.coerce.number().positive(),
  COOKIE_SECURE: boolStr,
  COOKIE_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("sid"),
  LOG_LEVEL: z.enum(["silent", "error", "info", "debug"]).default("info"),
  // Redis cho Socket.IO khi chạy nhiều bản máy chủ (Vercel Function) – OQ-28. Không có thì phòng chỉ nằm trong bộ nhớ.
  REDIS_URL: z.string().min(1).optional(),
  // Biến hệ thống do Vercel tự đặt (không cần khai báo): tên miền của bản deploy, nhánh và bản chính thức.
  VERCEL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const input: NodeJS.ProcessEnv = { ...source };
  // Trên Vercel không đặt NODE_ENV thủ công (đặt sẽ làm bước cài bỏ qua devDependencies khi build).
  if (!input.NODE_ENV && input.VERCEL) input.NODE_ENV = "production";
  // Kho Redis/Upstash trên Vercel Marketplace có thể chỉ cấp KV_URL.
  if (!input.REDIS_URL && input.KV_URL) input.REDIS_URL = input.KV_URL;
  if (!input.REDIS_URL) delete input.REDIS_URL; // "REDIS_URL=" để trống = không dùng Redis
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    // Chỉ in TÊN biến lỗi, không in giá trị (có thể là bí mật).
    const names = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Cấu hình môi trường không hợp lệ – ${names}`);
  }
  return parsed.data;
}

export function env(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

/**
 * Địa chỉ được phép làm Origin (chống giả mạo yêu cầu – GH-03): APP_ORIGIN, cộng các tên miền
 * của CHÍNH bản deploy này trên Vercel (bản xem trước có tên miền riêng cho mỗi lần deploy).
 */
export function allowedOrigins(e: Env = env()): Set<string> {
  const set = new Set<string>([e.APP_ORIGIN]);
  for (const host of [e.VERCEL_URL, e.VERCEL_BRANCH_URL, e.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) set.add(`https://${host}`);
  }
  return set;
}

export function isAllowedOrigin(origin: string | undefined, e: Env = env()): boolean {
  return origin !== undefined && allowedOrigins(e).has(origin);
}

/** Loại CSDL theo chuỗi kết nối: SQLite (mặc định, local/test) hoặc PostgreSQL (Vercel). */
export function dbProvider(e: Env = env()): "sqlite" | "postgresql" {
  return /^postgres(ql)?:\/\//.test(e.DATABASE_URL) ? "postgresql" : "sqlite";
}
