-- Bản PostgreSQL của hai migration SQLite (20261114034331_init_users_sessions + 20261114035720_chat_direct),
-- gộp làm một vì CSDL Postgres trên Vercel bắt đầu trống. Cùng bảng, cột, khóa, ràng buộc CHECK và
-- index có điều kiện như bản SQLite (09-detailed-design.md mục 3.3, 06-erd.md mục 6).
-- Khác biệt cú pháp: SERIAL thay AUTOINCREMENT; TIMESTAMP(3) thay DATETIME; biểu thức chính quy (~)
-- thay GLOB; chr() thay char(); btrim() thay trim(x, ký tự).

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "display_name_search" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_users_username" CHECK (length("username") BETWEEN 3 AND 30 AND "username" = lower("username") AND "username" ~ '^[a-z0-9._]+$'),
    CONSTRAINT "ck_users_display_name" CHECK (length(trim("display_name")) BETWEEN 1 AND 50)
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_sessions_expiry" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "ck_sessions_revoked" CHECK (("revoked_at" IS NULL AND "revoked_reason" IS NULL) OR ("revoked_at" IS NOT NULL AND "revoked_reason" IS NOT NULL AND "revoked_reason" IN ('logout','password_change')))
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "direct_user_low_id" INTEGER,
    "direct_user_high_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_id" INTEGER,
    "last_message_at" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ck_conversations_type" CHECK ("type" IN ('direct','group')),
    CONSTRAINT "ck_conversations_shape" CHECK (
      ("type" = 'direct' AND "name" IS NULL AND "direct_user_low_id" IS NOT NULL AND "direct_user_high_id" IS NOT NULL
         AND "direct_user_low_id" < "direct_user_high_id")
      OR ("type" = 'group' AND "name" IS NOT NULL AND length(trim("name")) BETWEEN 1 AND 100
         AND "direct_user_low_id" IS NULL AND "direct_user_high_id" IS NULL))
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "conversation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visible_from_message_id" INTEGER NOT NULL DEFAULT 0,
    "added_by" INTEGER,
    "left_at" TIMESTAMP(3),
    "left_reason" TEXT,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("conversation_id","user_id"),
    CONSTRAINT "ck_members_role" CHECK ("role" IN ('owner','member')),
    CONSTRAINT "ck_members_left" CHECK (("left_at" IS NULL AND "left_reason" IS NULL)
      OR ("left_at" IS NOT NULL AND "left_reason" IS NOT NULL AND "left_reason" IN ('left','removed')))
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "client_msg_id" TEXT,
    "event_type" TEXT,
    "event_actor_id" INTEGER,
    "event_target_id" INTEGER,
    "event_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    -- Tin văn bản có tác giả, có ký tự khác khoảng trắng, tối đa 5000 ký tự (CH-02)
    CONSTRAINT "ck_messages_type" CHECK ("type" IN ('text','system')),
    CONSTRAINT "ck_messages_text" CHECK ("type" <> 'text' OR ("sender_id" IS NOT NULL AND "event_type" IS NULL
      AND length(btrim("content", ' ' || chr(9) || chr(10) || chr(13))) > 0 AND length("content") <= 5000)),
    CONSTRAINT "ck_messages_system" CHECK ("type" <> 'system' OR ("sender_id" IS NULL AND "client_msg_id" IS NULL
      AND "event_type" IS NOT NULL AND "event_type" IN ('group_created','member_added','member_removed','member_left','group_renamed','owner_transferred')))
);

-- CreateTable
CREATE TABLE "message_read_cursors" (
    "conversation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_read_message_id" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_read_cursors_pkey" PRIMARY KEY ("conversation_id","user_id"),
    CONSTRAINT "ck_read_cursor" CHECK ("last_read_message_id" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_last_message_id_key" ON "conversations"("last_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_direct_user_low_id_direct_user_high_id_key" ON "conversations"("direct_user_low_id", "direct_user_high_id");

-- CreateIndex
CREATE INDEX "conversation_members_user_id_idx" ON "conversation_members"("user_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_id_idx" ON "messages"("conversation_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_sender_id_client_msg_id_key" ON "messages"("sender_id", "client_msg_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_direct_user_low_id_fkey" FOREIGN KEY ("direct_user_low_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_direct_user_high_id_fkey" FOREIGN KEY ("direct_user_high_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_sender_id_fkey" FOREIGN KEY ("conversation_id", "sender_id") REFERENCES "conversation_members"("conversation_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_event_actor_id_fkey" FOREIGN KEY ("event_actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_event_target_id_fkey" FOREIGN KEY ("event_target_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_read_cursors" ADD CONSTRAINT "message_read_cursors_conversation_id_user_id_fkey" FOREIGN KEY ("conversation_id", "user_id") REFERENCES "conversation_members"("conversation_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bổ sung tay: index có điều kiện (09 mục 3.3)
CREATE INDEX "ix_sessions_user_active" ON "sessions"("user_id") WHERE "revoked_at" IS NULL;
CREATE UNIQUE INDEX "uq_members_one_active_owner" ON "conversation_members"("conversation_id") WHERE "role" = 'owner' AND "left_at" IS NULL;
CREATE INDEX "ix_members_user_active" ON "conversation_members"("user_id", "conversation_id") WHERE "left_at" IS NULL;
CREATE INDEX "ix_messages_conv_unread" ON "messages"("conversation_id", "id", "sender_id") WHERE "type" = 'text';
