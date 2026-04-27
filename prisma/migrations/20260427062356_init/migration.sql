-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'THREADS');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('SHORT', 'LONG', 'THREAD', 'POLL', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "Tone" AS ENUM ('PROFESSIONAL', 'CASUAL', 'HUMOROUS', 'INSPIRATIONAL', 'EDUCATIONAL', 'STORYTELLING');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PROCESSING', 'PUBLISHED', 'PARTIALLY_PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlatformPostStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "bio" TEXT,
    "default_tone" "Tone" DEFAULT 'PROFESSIONAL',
    "default_language" TEXT NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "access_token_enc" TEXT NOT NULL,
    "refresh_token_enc" TEXT,
    "handle" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "openai_key_enc" TEXT,
    "anthropic_key_enc" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "post_type" "PostType" NOT NULL DEFAULT 'SHORT',
    "tone" "Tone" NOT NULL DEFAULT 'PROFESSIONAL',
    "language" TEXT NOT NULL DEFAULT 'en',
    "model_used" TEXT,
    "publish_at" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_posts" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PlatformPostStatus" NOT NULL DEFAULT 'PENDING',
    "published_at" TIMESTAMP(3),
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "social_accounts_user_id_idx" ON "social_accounts"("user_id");

-- CreateIndex
CREATE INDEX "social_accounts_platform_idx" ON "social_accounts"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_user_id_platform_key" ON "social_accounts"("user_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ai_keys_user_id_key" ON "ai_keys"("user_id");

-- CreateIndex
CREATE INDEX "posts_user_id_idx" ON "posts"("user_id");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "posts"("status");

-- CreateIndex
CREATE INDEX "posts_publish_at_idx" ON "posts"("publish_at");

-- CreateIndex
CREATE INDEX "posts_user_id_status_idx" ON "posts"("user_id", "status");

-- CreateIndex
CREATE INDEX "platform_posts_post_id_idx" ON "platform_posts"("post_id");

-- CreateIndex
CREATE INDEX "platform_posts_platform_idx" ON "platform_posts"("platform");

-- CreateIndex
CREATE INDEX "platform_posts_status_idx" ON "platform_posts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_posts_post_id_platform_key" ON "platform_posts"("post_id", "platform");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_keys" ADD CONSTRAINT "ai_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_posts" ADD CONSTRAINT "platform_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
