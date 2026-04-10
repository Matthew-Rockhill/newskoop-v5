-- CreateEnum: PodcastEpisodeStatus
DO $$ BEGIN
    CREATE TYPE "PodcastEpisodeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new values to MenuItemType enum
DO $$ BEGIN
    ALTER TYPE "MenuItemType" ADD VALUE IF NOT EXISTS 'SHOW';
    ALTER TYPE "MenuItemType" ADD VALUE IF NOT EXISTS 'BULLETIN';
    ALTER TYPE "MenuItemType" ADD VALUE IF NOT EXISTS 'PODCAST';
    ALTER TYPE "MenuItemType" ADD VALUE IF NOT EXISTS 'STORY';
END $$;

-- CreateTable: Podcast
CREATE TABLE IF NOT EXISTS "Podcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "categoryId" TEXT,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Podcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PodcastEpisode
CREATE TABLE IF NOT EXISTS "PodcastEpisode" (
    "id" TEXT NOT NULL,
    "podcastId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "episodeNumber" INTEGER NOT NULL,
    "content" TEXT,
    "coverImage" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "PodcastEpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledPublishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PodcastEpisode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PodcastEpisodeAudioClip
CREATE TABLE IF NOT EXISTS "PodcastEpisodeAudioClip" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "audioClipId" TEXT NOT NULL,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodcastEpisodeAudioClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PodcastTag
CREATE TABLE IF NOT EXISTS "PodcastTag" (
    "podcastId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "PodcastTag_pkey" PRIMARY KEY ("podcastId","tagId")
);

-- CreateTable: PodcastClassification
CREATE TABLE IF NOT EXISTS "PodcastClassification" (
    "podcastId" TEXT NOT NULL,
    "classificationId" TEXT NOT NULL,

    CONSTRAINT "PodcastClassification_pkey" PRIMARY KEY ("podcastId","classificationId")
);

-- Add new columns to MenuItem
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "autoPopulate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "bulletinScheduleId" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "podcastId" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "showId" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "storyId" TEXT;

-- CreateIndexes: Podcast
CREATE UNIQUE INDEX IF NOT EXISTS "Podcast_slug_key" ON "Podcast"("slug");
CREATE INDEX IF NOT EXISTS "Podcast_slug_idx" ON "Podcast"("slug");
CREATE INDEX IF NOT EXISTS "Podcast_categoryId_idx" ON "Podcast"("categoryId");
CREATE INDEX IF NOT EXISTS "Podcast_isPublished_idx" ON "Podcast"("isPublished");
CREATE INDEX IF NOT EXISTS "Podcast_isActive_idx" ON "Podcast"("isActive");
CREATE INDEX IF NOT EXISTS "Podcast_createdById_idx" ON "Podcast"("createdById");

-- CreateIndexes: PodcastEpisode
CREATE UNIQUE INDEX IF NOT EXISTS "PodcastEpisode_slug_key" ON "PodcastEpisode"("slug");
CREATE INDEX IF NOT EXISTS "PodcastEpisode_podcastId_idx" ON "PodcastEpisode"("podcastId");
CREATE INDEX IF NOT EXISTS "PodcastEpisode_createdById_idx" ON "PodcastEpisode"("createdById");
CREATE INDEX IF NOT EXISTS "PodcastEpisode_status_idx" ON "PodcastEpisode"("status");
CREATE INDEX IF NOT EXISTS "PodcastEpisode_publishedAt_idx" ON "PodcastEpisode"("publishedAt");
CREATE INDEX IF NOT EXISTS "PodcastEpisode_scheduledPublishAt_idx" ON "PodcastEpisode"("scheduledPublishAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PodcastEpisode_podcastId_episodeNumber_key" ON "PodcastEpisode"("podcastId", "episodeNumber");

-- CreateIndexes: PodcastEpisodeAudioClip
CREATE INDEX IF NOT EXISTS "PodcastEpisodeAudioClip_episodeId_idx" ON "PodcastEpisodeAudioClip"("episodeId");
CREATE INDEX IF NOT EXISTS "PodcastEpisodeAudioClip_audioClipId_idx" ON "PodcastEpisodeAudioClip"("audioClipId");
CREATE UNIQUE INDEX IF NOT EXISTS "PodcastEpisodeAudioClip_episodeId_audioClipId_key" ON "PodcastEpisodeAudioClip"("episodeId", "audioClipId");

-- CreateIndexes: PodcastClassification
CREATE INDEX IF NOT EXISTS "PodcastClassification_classificationId_idx" ON "PodcastClassification"("classificationId");

-- CreateIndexes: MenuItem new columns
CREATE INDEX IF NOT EXISTS "MenuItem_isVisible_idx" ON "MenuItem"("isVisible");

-- AddForeignKeys: Podcast
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Podcast_categoryId_fkey') THEN
        ALTER TABLE "Podcast" ADD CONSTRAINT "Podcast_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Podcast_createdById_fkey') THEN
        ALTER TABLE "Podcast" ADD CONSTRAINT "Podcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKeys: PodcastEpisode
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastEpisode_podcastId_fkey') THEN
        ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastEpisode_createdById_fkey') THEN
        ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastEpisode_publishedBy_fkey') THEN
        ALTER TABLE "PodcastEpisode" ADD CONSTRAINT "PodcastEpisode_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKeys: PodcastEpisodeAudioClip
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastEpisodeAudioClip_episodeId_fkey') THEN
        ALTER TABLE "PodcastEpisodeAudioClip" ADD CONSTRAINT "PodcastEpisodeAudioClip_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "PodcastEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastEpisodeAudioClip_audioClipId_fkey') THEN
        ALTER TABLE "PodcastEpisodeAudioClip" ADD CONSTRAINT "PodcastEpisodeAudioClip_audioClipId_fkey" FOREIGN KEY ("audioClipId") REFERENCES "AudioClip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastEpisodeAudioClip_addedBy_fkey') THEN
        ALTER TABLE "PodcastEpisodeAudioClip" ADD CONSTRAINT "PodcastEpisodeAudioClip_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKeys: PodcastTag
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastTag_podcastId_fkey') THEN
        ALTER TABLE "PodcastTag" ADD CONSTRAINT "PodcastTag_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastTag_tagId_fkey') THEN
        ALTER TABLE "PodcastTag" ADD CONSTRAINT "PodcastTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKeys: PodcastClassification
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastClassification_podcastId_fkey') THEN
        ALTER TABLE "PodcastClassification" ADD CONSTRAINT "PodcastClassification_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PodcastClassification_classificationId_fkey') THEN
        ALTER TABLE "PodcastClassification" ADD CONSTRAINT "PodcastClassification_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKeys: MenuItem new columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuItem_showId_fkey') THEN
        ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuItem_podcastId_fkey') THEN
        ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_podcastId_fkey" FOREIGN KEY ("podcastId") REFERENCES "Podcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuItem_storyId_fkey') THEN
        ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuItem_bulletinScheduleId_fkey') THEN
        ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_bulletinScheduleId_fkey" FOREIGN KEY ("bulletinScheduleId") REFERENCES "BulletinSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
