// Bước build trên Vercel: chạy `prisma migrate deploy` cho CSDL PostgreSQL (Neon).
// Tên biến của Neon có thể kèm tiền tố, nên dùng cùng hàm chuẩn hóa với máy chủ (dist/config/db-url.js)
// rồi truyền DATABASE_URL / DATABASE_URL_UNPOOLED cho Prisma. Không in giá trị – chỉ in tên biến.
import { spawnSync } from "node:child_process";
import { DIRECT_URL_NAMES, POOLED_URL_NAMES, resolveDatabaseEnv } from "../dist/config/db-url.js";

const db = resolveDatabaseEnv(process.env);
if (!db.DATABASE_URL?.startsWith("postgres") || !db.DATABASE_URL_UNPOOLED) {
  console.error(
    "Thiếu chuỗi kết nối PostgreSQL. Hãy kết nối kho Neon với dự án trên Vercel.\n" +
      `Đã tìm các biến: ${[...POOLED_URL_NAMES, ...DIRECT_URL_NAMES].join(", ")}`,
  );
  process.exit(1);
}
const r = spawnSync("npx", ["prisma", "migrate", "deploy", "--schema", "prisma/postgres/schema.prisma"], {
  stdio: "inherit",
  env: { ...process.env, ...db },
});
process.exit(r.status ?? 1);
