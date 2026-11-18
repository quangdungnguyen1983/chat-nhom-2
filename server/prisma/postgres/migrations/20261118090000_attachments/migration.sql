-- Tệp đính kèm (yêu cầu 2026-11-18): mỗi tin văn bản có tối đa một tệp, tối đa 4 MB.
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "message_id" INTEGER NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "uploader_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_attachments_size" CHECK ("size_bytes" BETWEEN 1 AND 4194304),
    CONSTRAINT "ck_attachments_name" CHECK (length("file_name") BETWEEN 1 AND 200)
);
CREATE UNIQUE INDEX "attachments_message_id_key" ON "attachments"("message_id");
CREATE INDEX "attachments_conversation_id_idx" ON "attachments"("conversation_id");
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
