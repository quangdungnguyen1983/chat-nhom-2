// Tìm chuỗi kết nối PostgreSQL theo các TÊN BIẾN mà kho Neon trên Vercel Marketplace có thể tạo.
// Neon cho đặt tiền tố tùy ý khi kết nối dự án (ví dụ tiền tố "DATABASE_URL" sinh ra
// DATABASE_URL_DATABASE_URL, DATABASE_URL_POSTGRES_PRISMA_URL…), nên không thể chỉ đọc DATABASE_URL.
// Dùng chung cho máy chủ (config/env.ts) và bước migration khi build (scripts/migrate-postgres.mjs).
// KHÔNG BAO GIỜ in giá trị (có mật khẩu) – chỉ in tên biến.

/** Kết nối qua pooler – dùng khi chạy truy vấn. Thứ tự = ưu tiên. */
export const POOLED_URL_NAMES = [
  "DATABASE_URL",
  "DATABASE_URL_POSTGRES_PRISMA_URL",
  "DATABASE_URL_DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
] as const;

/** Kết nối trực tiếp (không qua pooler) – dùng cho migration và LISTEN/NOTIFY của Socket.IO. */
export const DIRECT_URL_NAMES = [
  "DATABASE_URL_UNPOOLED",
  "DATABASE_URL_POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NON_POOLING",
] as const;

type Source = Record<string, string | undefined>;

function first(src: Source, names: readonly string[]): string | undefined {
  for (const n of names) {
    const v = src[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

const isPg = (url: string) => /^postgres(ql)?:\/\//.test(url);

/**
 * Pooler của Neon (tên máy có "-pooler") chạy PgBouncer chế độ transaction: báo Prisma bằng
 * pgbouncer=true để không dùng lại prepared statement giữa các kết nối.
 */
function forPrisma(url: string): string {
  if (!isPg(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("-pooler") && !u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true");
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Trả DATABASE_URL (pooled, cho Prisma) và DATABASE_URL_UNPOOLED (trực tiếp) đã chuẩn hóa.
 * Local SQLite (`file:…`) giữ nguyên.
 */
export function resolveDatabaseEnv(src: Source): { DATABASE_URL?: string; DATABASE_URL_UNPOOLED?: string } {
  const pooled = first(src, POOLED_URL_NAMES);
  const direct = first(src, DIRECT_URL_NAMES);
  const out: { DATABASE_URL?: string; DATABASE_URL_UNPOOLED?: string } = {};
  if (pooled) out.DATABASE_URL = forPrisma(pooled);
  else if (direct) out.DATABASE_URL = direct; // chỉ có kết nối trực tiếp: vẫn chạy được
  if (direct) out.DATABASE_URL_UNPOOLED = direct;
  else if (pooled && isPg(pooled) && !pooled.includes("-pooler")) out.DATABASE_URL_UNPOOLED = pooled;
  return out;
}
