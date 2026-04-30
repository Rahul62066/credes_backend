-- Add provider_post_id and provider_raw_response to platform_posts
ALTER TABLE "platform_posts" ADD COLUMN "provider_post_id" TEXT;
ALTER TABLE "platform_posts" ADD COLUMN "provider_raw_response" JSONB;