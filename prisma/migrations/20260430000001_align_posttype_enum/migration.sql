-- Align PostType enum from format types (SHORT, LONG, THREAD, POLL, CAROUSEL) 
-- to semantic types (ANNOUNCEMENT, THREAD, STORY, PROMOTIONAL, EDUCATIONAL, OPINION)

-- Create new enum type with semantic types
CREATE TYPE "PostType_new" AS ENUM ('ANNOUNCEMENT', 'THREAD', 'STORY', 'PROMOTIONAL', 'EDUCATIONAL', 'OPINION');

-- Alter the column to use the new enum type
-- First convert to text, then cast to new type, handling old values:
-- SHORT, LONG -> ANNOUNCEMENT (default content type)
-- THREAD -> THREAD (matches)
-- POLL, CAROUSEL -> PROMOTIONAL (marketing-oriented)
ALTER TABLE "posts" 
  ALTER COLUMN "post_type" TYPE "PostType_new" 
    USING CASE 
      WHEN "post_type"::text = 'SHORT' THEN 'ANNOUNCEMENT'::"PostType_new"
      WHEN "post_type"::text = 'LONG' THEN 'ANNOUNCEMENT'::"PostType_new"
      WHEN "post_type"::text = 'THREAD' THEN 'THREAD'::"PostType_new"
      WHEN "post_type"::text = 'POLL' THEN 'PROMOTIONAL'::"PostType_new"
      WHEN "post_type"::text = 'CAROUSEL' THEN 'PROMOTIONAL'::"PostType_new"
      ELSE 'ANNOUNCEMENT'::"PostType_new"
    END;

-- Drop old enum type
DROP TYPE "PostType";

-- Rename new enum type to original name
ALTER TYPE "PostType_new" RENAME TO "PostType";

-- Update default value to ANNOUNCEMENT
ALTER TABLE "posts" ALTER COLUMN "post_type" SET DEFAULT 'ANNOUNCEMENT'::"PostType";
