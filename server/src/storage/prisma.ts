// PrismaClient DUY NHẤT của ứng dụng. Chỉ thư mục storage/ được import Prisma (08 mục 4.3).
import { PrismaClient, Prisma } from "@prisma/client";

let client: PrismaClient | null = null;

export function prisma(): PrismaClient {
  if (!client) client = new PrismaClient({ log: [] }); // không log câu truy vấn (có thể chứa dữ liệu người dùng)
  return client;
}

/** Thiết lập kết nối SQLite (09 mục 3.4). Gọi một lần khi khởi động. */
export async function initDatabase(): Promise<void> {
  const db = prisma();
  await db.$connect();
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

/** Giao dịch ghi (09 mục 10.1 – bản rút gọn cho slice 1). */
export function withWriteTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma().$transaction(fn);
}
