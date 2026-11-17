-- Định dạng tin nhắn (yêu cầu 2026-11-17): phông, cỡ, màu chữ do người gửi chọn.
-- NULL = mặc định. Chỉ nhận khóa trong danh mục (server/src/common/message-format.ts).
ALTER TABLE "messages" ADD COLUMN "fmt_font" TEXT CHECK ("fmt_font" IS NULL OR "fmt_font" IN ('co-chan','viet-tay','but-long','danh-may'));
ALTER TABLE "messages" ADD COLUMN "fmt_size" TEXT CHECK ("fmt_size" IS NULL OR "fmt_size" IN ('nho','lon','rat-lon'));
ALTER TABLE "messages" ADD COLUMN "fmt_color" TEXT CHECK ("fmt_color" IS NULL OR "fmt_color" IN ('do','cam','xanh-la','xanh-duong','tim','hong','nau'));
