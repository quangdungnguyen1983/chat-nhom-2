-- Bảng phụ của @socket.io/postgres-adapter (chỉ bản PostgreSQL trên Vercel – OQ-28).
-- NOTIFY của PostgreSQL giới hạn khoảng 8000 byte; gói tin lớn hơn (ví dụ tin dài 5000 ký tự)
-- được adapter ghi tạm vào đây rồi tự xóa sau một thời gian ngắn. Không chứa dữ liệu nghiệp vụ lâu dài.
-- Bảng này không khai báo trong schema.prisma (Prisma không cần đọc/ghi nó).
CREATE TABLE IF NOT EXISTS "socket_io_attachments" (
    "id" BIGSERIAL UNIQUE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "payload" BYTEA
);
