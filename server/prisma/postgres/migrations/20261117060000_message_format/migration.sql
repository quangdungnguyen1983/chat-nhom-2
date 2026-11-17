-- Định dạng tin nhắn (yêu cầu 2026-11-17): phông, cỡ, màu chữ do người gửi chọn.
-- NULL = mặc định. Chỉ nhận khóa trong danh mục (server/src/common/message-format.ts).
-- Tin hệ thống không có định dạng.
ALTER TABLE "messages" ADD COLUMN "fmt_font" TEXT;
ALTER TABLE "messages" ADD COLUMN "fmt_size" TEXT;
ALTER TABLE "messages" ADD COLUMN "fmt_color" TEXT;
ALTER TABLE "messages" ADD CONSTRAINT "ck_messages_fmt_font" CHECK ("fmt_font" IS NULL OR "fmt_font" IN ('co-chan','viet-tay','but-long','danh-may'));
ALTER TABLE "messages" ADD CONSTRAINT "ck_messages_fmt_size" CHECK ("fmt_size" IS NULL OR "fmt_size" IN ('nho','lon','rat-lon'));
ALTER TABLE "messages" ADD CONSTRAINT "ck_messages_fmt_color" CHECK ("fmt_color" IS NULL OR "fmt_color" IN ('do','cam','xanh-la','xanh-duong','tim','hong','nau'));
ALTER TABLE "messages" ADD CONSTRAINT "ck_messages_fmt_text_only" CHECK ("type" = 'text' OR ("fmt_font" IS NULL AND "fmt_size" IS NULL AND "fmt_color" IS NULL));
