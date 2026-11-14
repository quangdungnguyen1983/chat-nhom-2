-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "display_name_search" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    -- Bổ sung tay theo 09-detailed-design.md mục 3.3 (QĐ-07, GS-02)
    CONSTRAINT "ck_users_username" CHECK (length("username") BETWEEN 3 AND 30 AND "username" = lower("username") AND "username" NOT GLOB '*[^a-z0-9._]*'),
    CONSTRAINT "ck_users_display_name" CHECK (length(trim("display_name")) BETWEEN 1 AND 50)
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "revoked_reason" TEXT,
    -- Bổ sung tay theo 09-detailed-design.md mục 3.3 / 06-erd.md mục 6.2
    CONSTRAINT "ck_sessions_expiry" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "ck_sessions_revoked" CHECK (("revoked_at" IS NULL AND "revoked_reason" IS NULL) OR ("revoked_at" IS NOT NULL AND "revoked_reason" IS NOT NULL AND "revoked_reason" IN ('logout','password_change'))),
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- Bổ sung tay: index phiên còn hiệu lực (09 mục 3.3)
CREATE INDEX "ix_sessions_user_active" ON "sessions"("user_id") WHERE "revoked_at" IS NULL;
