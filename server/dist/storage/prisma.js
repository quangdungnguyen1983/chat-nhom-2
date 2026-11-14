// PrismaClient DUY NHẤT của ứng dụng. Chỉ thư mục storage/ được import Prisma (08 mục 4.3).
import { PrismaClient, Prisma } from "@prisma/client";
let client = null;
export function prisma() {
    if (!client)
        client = new PrismaClient({ log: [] }); // không log câu truy vấn (có thể chứa dữ liệu người dùng)
    return client;
}
/** Thiết lập kết nối SQLite (09 mục 3.4). Gọi một lần khi khởi động. */
export async function initDatabase() {
    const db = prisma();
    await db.$connect();
    // PRAGMA trả về dòng kết quả nên dùng $queryRawUnsafe.
    await db.$queryRawUnsafe("PRAGMA foreign_keys = ON");
    await db.$queryRawUnsafe("PRAGMA journal_mode = WAL");
    await db.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
}
export async function closeDatabase() {
    if (client) {
        await client.$disconnect();
        client = null;
    }
}
export function isUniqueViolation(err) {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}
// Khóa ghi trong tiến trình (09 mục 10.1): các giao dịch ghi xếp hàng, tránh SQLite báo "đang bận"
// và bảo đảm hai yêu cầu mở 1-1 đồng thời không cùng tạo hội thoại (CH-01 R4).
let writeQueue = Promise.resolve();
/** Giao dịch ghi (09 mục 10.1). */
export function withWriteTx(fn) {
    const run = writeQueue.then(() => prisma().$transaction(fn));
    writeQueue = run.catch(() => undefined);
    return run;
}
