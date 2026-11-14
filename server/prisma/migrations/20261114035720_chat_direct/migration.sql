-- CreateTable
CREATE TABLE "conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "direct_user_low_id" INTEGER,
    "direct_user_high_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_id" INTEGER,
    "last_message_at" DATETIME,
    -- Bổ sung tay (09 mục 3.3, Phụ lục A)
    CONSTRAINT "ck_conversations_type" CHECK ("type" IN ('direct','group')),
    CONSTRAINT "ck_conversations_shape" CHECK (
      ("type" = 'direct' AND "name" IS NULL AND "direct_user_low_id" IS NOT NULL AND "direct_user_high_id" IS NOT NULL
         AND "direct_user_low_id" < "direct_user_high_id")
      OR ("type" = 'group' AND "name" IS NOT NULL AND length(trim("name")) BETWEEN 1 AND 100
         AND "direct_user_low_id" IS NULL AND "direct_user_high_id" IS NULL)),
    CONSTRAINT "conversations_direct_user_low_id_fkey" FOREIGN KEY ("direct_user_low_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversations_direct_user_high_id_fkey" FOREIGN KEY ("direct_user_high_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversations_last_message_id_fkey" FOREIGN KEY ("last_message_id") REFERENCES "messages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "conversation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visible_from_message_id" INTEGER NOT NULL DEFAULT 0,
    "added_by" INTEGER,
    "left_at" DATETIME,
    "left_reason" TEXT,

    -- Bổ sung tay (09 mục 3.3)
    CONSTRAINT "ck_members_role" CHECK ("role" IN ('owner','member')),
    CONSTRAINT "ck_members_left" CHECK (("left_at" IS NULL AND "left_reason" IS NULL)
      OR ("left_at" IS NOT NULL AND "left_reason" IS NOT NULL AND "left_reason" IN ('left','removed'))),
    PRIMARY KEY ("conversation_id", "user_id"),
    CONSTRAINT "conversation_members_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "conversation_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "client_msg_id" TEXT,
    "event_type" TEXT,
    "event_actor_id" INTEGER,
    "event_target_id" INTEGER,
    "event_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Bổ sung tay (09 mục 3.3): tin văn bản có tác giả, có ký tự khác khoảng trắng, tối đa 5000 ký tự (CH-02)
    CONSTRAINT "ck_messages_type" CHECK ("type" IN ('text','system')),
    CONSTRAINT "ck_messages_text" CHECK ("type" <> 'text' OR ("sender_id" IS NOT NULL AND "event_type" IS NULL
      AND length(trim("content", ' ' || char(9) || char(10) || char(13))) > 0 AND length("content") <= 5000)),
    CONSTRAINT "ck_messages_system" CHECK ("type" <> 'system' OR ("sender_id" IS NULL AND "client_msg_id" IS NULL
      AND "event_type" IS NOT NULL AND "event_type" IN ('group_created','member_added','member_removed','member_left','group_renamed','owner_transferred'))),
    CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "messages_conversation_id_sender_id_fkey" FOREIGN KEY ("conversation_id", "sender_id") REFERENCES "conversation_members" ("conversation_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "messages_event_actor_id_fkey" FOREIGN KEY ("event_actor_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "messages_event_target_id_fkey" FOREIGN KEY ("event_target_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "message_read_cursors" (
    "conversation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_read_message_id" INTEGER NOT NULL DEFAULT 0,
    "updated_at" DATETIME NOT NULL,

    CONSTRAINT "ck_read_cursor" CHECK ("last_read_message_id" >= 0),
    PRIMARY KEY ("conversation_id", "user_id"),
    CONSTRAINT "message_read_cursors_conversation_id_user_id_fkey" FOREIGN KEY ("conversation_id", "user_id") REFERENCES "conversation_members" ("conversation_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- Bổ sung tay: index có điều kiện (09 mục 3.3)
CREATE UNIQUE INDEX "uq_members_one_active_owner" ON "conversation_members"("conversation_id") WHERE "role" = 'owner' AND "left_at" IS NULL;
CREATE INDEX "ix_members_user_active" ON "conversation_members"("user_id", "conversation_id") WHERE "left_at" IS NULL;
CREATE INDEX "ix_messages_conv_unread" ON "messages"("conversation_id", "id", "sender_id") WHERE "type" = 'text';
