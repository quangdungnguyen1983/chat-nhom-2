// postinstall: sinh Prisma Client đúng loại CSDL.
// Trên Vercel (biến VERCEL có sẵn khi build) dùng lược đồ PostgreSQL; nơi khác dùng SQLite (ADR-01).
// Cần vì Vercel chạy lại `npm install` sau bước build khi đóng gói Function – nếu luôn sinh bản
// SQLite thì Prisma Client trong Function sẽ sai loại CSDL.
import { spawnSync } from "node:child_process";

const args = ["prisma", "generate"];
if (process.env.VERCEL) args.push("--schema", "prisma/postgres/schema.prisma");
const r = spawnSync("npx", args, { stdio: "inherit" });
process.exit(r.status ?? 1);
