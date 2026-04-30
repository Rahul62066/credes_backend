-- Fix the failed PostType enum migration by using a more robust approach
-- This migration assumes 20260430000001 partially failed and needs cleanup

-- Step 1: Check if the new PostType_new enum exists (from failed migration) and drop it if so
DROP TYPE IF EXISTS "PostType_new" CASCADE;

-- Step 2: Convert post_type column to TEXT to allow enum type change
ALTER TABLE "posts" ALTER COLUMN "post_type" TYPE TEXT;

-- Step 3: Drop the old enum type (may fail if still in use, which is expected)
DROP TYPE IF EXISTS "PostType" CASCADE;

-- Step 4: Create the new enum type with semantic values
CREATE TYPE "PostType" AS ENUM ('ANNOUNCEMENT', 'THREAD', 'STORY', 'PROMOTIONAL', 'EDUCATIONAL', 'OPINION');

-- Step 5: Convert post_type column back to the new enum type with data migration
ALTER TABLE "posts" 
  ALTER COLUMN "post_type" TYPE "PostType"
    USING CASE 
      WHEN post_type = 'SHORT' THEN 'ANNOUNCEMENT'::"PostType"
      WHEN post_type = 'LONG' THEN 'ANNOUNCEMENT'::"PostType"
      WHEN post_type = 'THREAD' THEN 'THREAD'::"PostType"
      WHEN post_type = 'POLL' THEN 'PROMOTIONAL'::"PostType"
      WHEN post_type = 'CAROUSEL' THEN 'PROMOTIONAL'::"PostType"
      ELSE 'ANNOUNCEMENT'::"PostType"
    END;

-- Step 6: Set the default value
ALTER TABLE "posts" ALTER COLUMN "post_type" SET DEFAULT 'ANNOUNCEMENT'::"PostType";
