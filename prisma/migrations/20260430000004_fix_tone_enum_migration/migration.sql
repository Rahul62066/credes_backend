-- Safe Tone enum migration for PostgreSQL
--
-- Old values map as follows:
-- HUMOROUS -> WITTY
-- EDUCATIONAL -> PROFESSIONAL
-- INSPIRATIONAL -> FRIENDLY
-- STORYTELLING -> CASUAL

DROP TYPE IF EXISTS "Tone_new" CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'posts'
      AND column_name = 'tone'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "posts" ALTER COLUMN "tone" TYPE TEXT USING "tone"::text;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'default_tone'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE "users" ALTER COLUMN "default_tone" TYPE TEXT USING "default_tone"::text;
  END IF;
END $$;

DROP TYPE IF EXISTS "Tone" CASCADE;

CREATE TYPE "Tone" AS ENUM (
  'PROFESSIONAL',
  'CASUAL',
  'WITTY',
  'AUTHORITATIVE',
  'FRIENDLY'
);

ALTER TABLE "posts"
  ALTER COLUMN "tone" TYPE "Tone"
  USING CASE
    WHEN tone = 'HUMOROUS' THEN 'WITTY'::"Tone"
    WHEN tone = 'EDUCATIONAL' THEN 'PROFESSIONAL'::"Tone"
    WHEN tone = 'INSPIRATIONAL' THEN 'FRIENDLY'::"Tone"
    WHEN tone = 'STORYTELLING' THEN 'CASUAL'::"Tone"
    WHEN tone = 'PROFESSIONAL' THEN 'PROFESSIONAL'::"Tone"
    WHEN tone = 'CASUAL' THEN 'CASUAL'::"Tone"
    WHEN tone = 'WITTY' THEN 'WITTY'::"Tone"
    WHEN tone = 'AUTHORITATIVE' THEN 'AUTHORITATIVE'::"Tone"
    WHEN tone = 'FRIENDLY' THEN 'FRIENDLY'::"Tone"
    ELSE 'PROFESSIONAL'::"Tone"
  END;

ALTER TABLE "users"
  ALTER COLUMN "default_tone" TYPE "Tone"
  USING CASE
    WHEN default_tone IS NULL THEN NULL
    WHEN default_tone = 'HUMOROUS' THEN 'WITTY'::"Tone"
    WHEN default_tone = 'EDUCATIONAL' THEN 'PROFESSIONAL'::"Tone"
    WHEN default_tone = 'INSPIRATIONAL' THEN 'FRIENDLY'::"Tone"
    WHEN default_tone = 'STORYTELLING' THEN 'CASUAL'::"Tone"
    WHEN default_tone = 'PROFESSIONAL' THEN 'PROFESSIONAL'::"Tone"
    WHEN default_tone = 'CASUAL' THEN 'CASUAL'::"Tone"
    WHEN default_tone = 'WITTY' THEN 'WITTY'::"Tone"
    WHEN default_tone = 'AUTHORITATIVE' THEN 'AUTHORITATIVE'::"Tone"
    WHEN default_tone = 'FRIENDLY' THEN 'FRIENDLY'::"Tone"
    ELSE 'PROFESSIONAL'::"Tone"
  END;

ALTER TABLE "posts" ALTER COLUMN "tone" SET DEFAULT 'PROFESSIONAL'::"Tone";
ALTER TABLE "users" ALTER COLUMN "default_tone" SET DEFAULT 'PROFESSIONAL'::"Tone";