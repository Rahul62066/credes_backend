-- Run this in your Render PostgreSQL console to clear the failed migration block
-- This allows Prisma to proceed with the corrected migration

-- Option 1: Mark the failed migration as rolled back (Prisma-tracked)
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20260430000001_align_posttype_enum';

-- Option 2: If the column is partially converted, clean up any orphaned enum types
-- Uncomment below if needed:
-- DROP TYPE IF EXISTS "PostType_new" CASCADE;
