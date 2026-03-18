-- CreateTable: EpisodeAudioClip join table (mirrors StoryAudioClip)
CREATE TABLE "EpisodeAudioClip" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "audioClipId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeAudioClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpisodeAudioClip_episodeId_idx" ON "EpisodeAudioClip"("episodeId");
CREATE INDEX "EpisodeAudioClip_audioClipId_idx" ON "EpisodeAudioClip"("audioClipId");
CREATE UNIQUE INDEX "EpisodeAudioClip_episodeId_audioClipId_key" ON "EpisodeAudioClip"("episodeId", "audioClipId");

-- Migrate existing data: copy AudioClip.episodeId -> EpisodeAudioClip rows
INSERT INTO "EpisodeAudioClip" ("id", "episodeId", "audioClipId", "addedBy", "createdAt")
SELECT
    gen_random_uuid()::text,
    "episodeId",
    "id",
    "uploadedBy",
    "createdAt"
FROM "AudioClip"
WHERE "episodeId" IS NOT NULL;

-- Drop the old direct FK from AudioClip
ALTER TABLE "AudioClip" DROP CONSTRAINT IF EXISTS "AudioClip_episodeId_fkey";
DROP INDEX IF EXISTS "AudioClip_episodeId_idx";
ALTER TABLE "AudioClip" DROP COLUMN "episodeId";

-- AddForeignKey
ALTER TABLE "EpisodeAudioClip" ADD CONSTRAINT "EpisodeAudioClip_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EpisodeAudioClip" ADD CONSTRAINT "EpisodeAudioClip_audioClipId_fkey" FOREIGN KEY ("audioClipId") REFERENCES "AudioClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EpisodeAudioClip" ADD CONSTRAINT "EpisodeAudioClip_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
