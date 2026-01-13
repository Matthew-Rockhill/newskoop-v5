-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Show
CREATE TABLE IF NOT EXISTS "Show" (
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
    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Episode
CREATE TABLE IF NOT EXISTS "Episode" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "episodeNumber" INTEGER NOT NULL,
    "content" TEXT,
    "coverImage" TEXT,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "duration" INTEGER,
    "scheduledPublishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ShowTag
CREATE TABLE IF NOT EXISTS "ShowTag" (
    "showId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    CONSTRAINT "ShowTag_pkey" PRIMARY KEY ("showId","tagId")
);

-- CreateIndex: Show
CREATE UNIQUE INDEX IF NOT EXISTS "Show_slug_key" ON "Show"("slug");
CREATE INDEX IF NOT EXISTS "Show_slug_idx" ON "Show"("slug");
CREATE INDEX IF NOT EXISTS "Show_categoryId_idx" ON "Show"("categoryId");
CREATE INDEX IF NOT EXISTS "Show_isPublished_idx" ON "Show"("isPublished");
CREATE INDEX IF NOT EXISTS "Show_isActive_idx" ON "Show"("isActive");
CREATE INDEX IF NOT EXISTS "Show_createdById_idx" ON "Show"("createdById");

-- CreateIndex: Episode
CREATE UNIQUE INDEX IF NOT EXISTS "Episode_slug_key" ON "Episode"("slug");
CREATE INDEX IF NOT EXISTS "Episode_showId_idx" ON "Episode"("showId");
CREATE INDEX IF NOT EXISTS "Episode_status_idx" ON "Episode"("status");
CREATE INDEX IF NOT EXISTS "Episode_publishedAt_idx" ON "Episode"("publishedAt");
CREATE INDEX IF NOT EXISTS "Episode_createdById_idx" ON "Episode"("createdById");

-- CreateIndex: ShowTag
CREATE INDEX IF NOT EXISTS "ShowTag_tagId_idx" ON "ShowTag"("tagId");

-- AddForeignKey: Show -> Category
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Show_categoryId_fkey') THEN
        ALTER TABLE "Show" ADD CONSTRAINT "Show_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Show -> User (createdBy)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Show_createdById_fkey') THEN
        ALTER TABLE "Show" ADD CONSTRAINT "Show_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Episode -> Show
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Episode_showId_fkey') THEN
        ALTER TABLE "Episode" ADD CONSTRAINT "Episode_showId_fkey"
        FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Episode -> User (publisher)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Episode_publishedBy_fkey') THEN
        ALTER TABLE "Episode" ADD CONSTRAINT "Episode_publishedBy_fkey"
        FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Episode -> User (createdBy)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Episode_createdById_fkey') THEN
        ALTER TABLE "Episode" ADD CONSTRAINT "Episode_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ShowTag -> Show
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShowTag_showId_fkey') THEN
        ALTER TABLE "ShowTag" ADD CONSTRAINT "ShowTag_showId_fkey"
        FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ShowTag -> Tag
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShowTag_tagId_fkey') THEN
        ALTER TABLE "ShowTag" ADD CONSTRAINT "ShowTag_tagId_fkey"
        FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ShowClassification -> Show (only if ShowClassification table exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ShowClassification') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShowClassification_showId_fkey') THEN
            ALTER TABLE "ShowClassification" ADD CONSTRAINT "ShowClassification_showId_fkey"
            FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Add episodeId to AudioClip if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'AudioClip' AND column_name = 'episodeId') THEN
        ALTER TABLE "AudioClip" ADD COLUMN "episodeId" TEXT;
    END IF;
END $$;

-- AddForeignKey: AudioClip -> Episode
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AudioClip_episodeId_fkey') THEN
        ALTER TABLE "AudioClip" ADD CONSTRAINT "AudioClip_episodeId_fkey"
        FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex: AudioClip episodeId
CREATE INDEX IF NOT EXISTS "AudioClip_episodeId_idx" ON "AudioClip"("episodeId");
