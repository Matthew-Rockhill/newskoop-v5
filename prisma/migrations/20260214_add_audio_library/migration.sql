-- Add library metadata columns to AudioClip (IF NOT EXISTS for idempotency)
ALTER TABLE "AudioClip" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "AudioClip" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "AudioClip" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AudioClip" ADD COLUMN IF NOT EXISTS "sourceStoryId" TEXT;

-- Create StoryAudioClip join table
CREATE TABLE IF NOT EXISTS "StoryAudioClip" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "audioClipId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAudioClip_pkey" PRIMARY KEY ("id")
);

-- Create indexes on StoryAudioClip
CREATE INDEX IF NOT EXISTS "StoryAudioClip_storyId_idx" ON "StoryAudioClip"("storyId");
CREATE INDEX IF NOT EXISTS "StoryAudioClip_audioClipId_idx" ON "StoryAudioClip"("audioClipId");
CREATE UNIQUE INDEX IF NOT EXISTS "StoryAudioClip_storyId_audioClipId_key" ON "StoryAudioClip"("storyId", "audioClipId");

-- Migrate existing data: create StoryAudioClip records from existing storyId references
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AudioClip' AND column_name = 'storyId') THEN
        INSERT INTO "StoryAudioClip" ("id", "storyId", "audioClipId", "addedBy", "createdAt")
        SELECT
            gen_random_uuid()::text,
            "storyId",
            "id",
            "uploadedBy",
            "createdAt"
        FROM "AudioClip"
        WHERE "storyId" IS NOT NULL
        ON CONFLICT DO NOTHING;

        -- Set sourceStoryId for provenance tracking on existing clips
        UPDATE "AudioClip" SET "sourceStoryId" = "storyId" WHERE "storyId" IS NOT NULL AND "sourceStoryId" IS NULL;

        -- Drop the old storyId foreign key and index
        ALTER TABLE "AudioClip" DROP CONSTRAINT IF EXISTS "AudioClip_storyId_fkey";
        DROP INDEX IF EXISTS "AudioClip_storyId_idx";

        -- Drop the storyId column
        ALTER TABLE "AudioClip" DROP COLUMN "storyId";
    END IF;
END $$;

-- Add new foreign keys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AudioClip_sourceStoryId_fkey') THEN
        ALTER TABLE "AudioClip" ADD CONSTRAINT "AudioClip_sourceStoryId_fkey" FOREIGN KEY ("sourceStoryId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryAudioClip_storyId_fkey') THEN
        ALTER TABLE "StoryAudioClip" ADD CONSTRAINT "StoryAudioClip_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryAudioClip_audioClipId_fkey') THEN
        ALTER TABLE "StoryAudioClip" ADD CONSTRAINT "StoryAudioClip_audioClipId_fkey" FOREIGN KEY ("audioClipId") REFERENCES "AudioClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryAudioClip_addedBy_fkey') THEN
        ALTER TABLE "StoryAudioClip" ADD CONSTRAINT "StoryAudioClip_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index on sourceStoryId
CREATE INDEX IF NOT EXISTS "AudioClip_sourceStoryId_idx" ON "AudioClip"("sourceStoryId");
