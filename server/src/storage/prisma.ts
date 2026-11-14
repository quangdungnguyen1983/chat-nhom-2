// PrismaClient DUY NHẤT của ứng dụng. Chỉ thư mục storage/ được import Prisma (08 mục 4.3).
import { PrismaClient, Prisma } from "@prisma/client";
import { dbProvider, env } from "../config/env.js";

let client: PrismaClient | null = null;

export function prisma(): PrismaClient {
  // PostgreSQL: dùng chuỗi kết nối đã chuẩn hóa ở config/env.ts (tên biến của Neon có thể có tiền tố).
  // SQLite giữ cách đọc DATABASE_URL cũ (đường dẫn tương đối tính theo thư mục prisma/).
  // Không log câu truy vấn (có thể chứa dữ liệu người dùng).
  if (!client) client = new PrismaClient({ log: [], ...(isPostgres() ? { datasourceUrl: env().DATABASE_URL } : {}) });
  return client;
}

/** CSDL đang dùng có phải PostgreSQL (bản Vercel) không. Local/test mặc định SQLite (ADR-01). */
export function isPostgres(): boolean {
  return dbProvider(env()) === "postgresql";
}

/** Thiết lập kết nối (09 mục 3.4). Gọi một lần khi khởi động. PRAGMA chỉ áp dụng cho SQLite. */
export async function initDatabase(): Promise<void> {
  const db = prisma();
  await db.$connect();
  if (isPostgres()) return;
  // PRAGMA trả về dòng kết quả nên dùng $queryRawUnsafe.
  await db.$queryRawUnsafe("PRAGMA foreign_keys = ON");
  await db.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  await db.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = null;
  }
}

export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export type Tx = Prisma.TransactionClient;

// Khóa ghi trong tiến trình (09 mục 10.1): các giao dịch ghi xếp hàng, tránh SQLite báo "đang bận"
// và bảo đảm hai yêu cầu mở 1-1 đồng thời không cùng tạo hội thoại (CH-01 R4).
let writeQueue: Promise<unknown> = Promise.resolve();

export type WriteTxOptions = {
  /**
   * Hội thoại cần khóa trong suốt giao dịch. Trên PostgreSQL có thể có NHIỀU bản máy chủ cùng ghi
   * (Vercel), nên khóa dòng `conversations` (SELECT … FOR UPDATE) để tin trong một hội thoại được
   * ghi và xác nhận lần lượt (GE-10) và các thao tác nhóm không chen nhau. SQLite: hàng đợi trên đã đủ.
   */
  lockConversationId?: number;
};

/** Giao dịch ghi (09 mục 10.1). */
export function withWriteTx<T>(fn: (tx: Tx) => Promise<T>, opts: WriteTxOptions = {}): Promise<T> {
  if (isPostgres()) {
    // Neon có thể "ngủ" khi rảnh: cho chờ lâu hơn mặc định (2 s / 5 s) của Prisma.
    return prisma().$transaction(async (tx) => {
      if (opts.lockConversationId !== undefined) {
        await tx.$queryRaw`SELECT id FROM conversations WHERE id = ${opts.lockConversationId} FOR UPDATE`;
      }
      return fn(tx);
    }, { maxWait: 10_000, timeout: 15_000 });
  }
  const run = writeQueue.then(() => prisma().$transaction(fn));
  writeQueue = run.catch(() => undefined);
  return run;
}
