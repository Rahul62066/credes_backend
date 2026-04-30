-- Fix the failed PostType enum migration by using a more robust approach
-- This migration safely handles any partial state from the failed 20260430000001 migration

-- Step 1: Clean up any orphaned enum types from the failed migration
DROP TYPE IF EXISTS "PostType_new" CASCADE;

-- Step 2: Convert post_type column to TEXT (safe intermediary state)
-- This works whether column is currently enum or already text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'post_type' AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "posts" ALTER COLUMN "post_type" TYPE TEXT;
  END IF;
END $$;

-- Step 3: Drop old enum type if it exists (CASCADE to handle dependencies)
DROP TYPE IF EXISTS "PostType" CASCADE;

-- Step 4: Create the new enum type with semantic values only
CREATE TYPE "PostType" AS ENUM ('ANNOUNCEMENT', 'THREAD', 'STORY', 'PROMOTIONAL', 'EDUCATIONAL', 'OPINION');

-- Step 5: Convert post_type column to new enum type with intelligent data mapping
ALTER TABLE "posts" 
  ALTER COLUMN "post_type" TYPE "PostType"
    USING CASE 
      WHEN post_type IN ('SHORT', 'LONG') THEN 'ANNOUNCEMENT'::"PostType"
      WHEN post_type = 'THREAD' THEN 'THREAD'::"PostType"
      WHEN post_type IN ('POLL', 'CAROUSEL') THEN 'PROMOTIONAL'::"PostType"
      ELSE 'ANNOUNCEMENT'::"PostType"
    END;

-- Step 6: Set the default value to ANNOUNCEMENT
ALTER TABLE "posts" ALTER COLUMN "post_type" SET DEFAULT 'ANNOUNCEMENT'::"PostType";
