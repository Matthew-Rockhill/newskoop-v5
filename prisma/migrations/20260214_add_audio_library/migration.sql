-- Add library metadata columns to AudioClip
ALTER TABLE "AudioClip" ADD COLUMN "title" TEXT;
ALTER TABLE "AudioClip" ADD COLUMN "description" TEXT;
ALTER TABLE "AudioClip" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AudioClip" ADD COLUMN "sourceStoryId" TEXT;

-- Create StoryAudioClip join table
CREATE TABLE "StoryAudioClip" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "audioClipId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAudioClip_pkey" PRIMARY KEY ("id")
);

-- Create indexes on StoryAudioClip
CREATE INDEX "StoryAudioClip_storyId_idx" ON "StoryAudioClip"("storyId");
CREATE INDEX "StoryAudioClip_audioClipId_idx" ON "StoryAudioClip"("audioClipId");
CREATE UNIQUE INDEX "StoryAudioClip_storyId_audioClipId_key" ON "StoryAudioClip"("storyId", "audioClipId");

-- Migrate existing data: create StoryAudioClip records from existing storyId references
INSERT INTO "StoryAudioClip" ("id", "storyId", "audioClipId", "addedBy", "createdAt")
SELECT
    gen_random_uuid()::text,
    "storyId",
    "id",
    "uploadedBy",
    "createdAt"
FROM "AudioClip"
WHERE "storyId" IS NOT NULL;

-- Set sourceStoryId for provenance tracking on existing clips
UPDATE "AudioClip" SET "sourceStoryId" = "storyId" WHERE "storyId" IS NOT NULL;

-- Drop the old storyId foreign key and index
ALTER TABLE "AudioClip" DROP CONSTRAINT IF EXISTS "AudioClip_storyId_fkey";
DROP INDEX IF EXISTS "AudioClip_storyId_idx";

-- Drop the storyId column
ALTER TABLE "AudioClip" DROP COLUMN "storyId";

-- Add new foreign keys
ALTER TABLE "AudioClip" ADD CONSTRAINT "AudioClip_sourceStoryId_fkey" FOREIGN KEY ("sourceStoryId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoryAudioClip" ADD CONSTRAINT "StoryAudioClip_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAudioClip" ADD CONSTRAINT "StoryAudioClip_audioClipId_fkey" FOREIGN KEY ("audioClipId") REFERENCES "AudioClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryAudioClip" ADD CONSTRAINT "StoryAudioClip_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create index on sourceStoryId
CREATE INDEX "AudioClip_sourceStoryId_idx" ON "AudioClip"("sourceStoryId");
