-- Add media_url column to platform_posts table for Instagram and Threads support
ALTER TABLE "platform_posts" ADD COLUMN "media_url" TEXT;
