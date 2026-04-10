-- This migration adds all tables/enums that were previously applied via db push
-- but never had migration files, breaking prisma migrate deploy on production.

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
    CREATE TYPE "EmailType" AS ENUM ('WELCOME', 'PASSWORD_RESET', 'MAGIC_LINK', 'NOTIFICATION', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'DELIVERED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AnnouncementTargetAudience" AS ENUM ('ALL', 'NEWSROOM', 'RADIO');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BulletinScheduleType" AS ENUM ('WEEKDAY', 'WEEKEND', 'PUBLIC_HOLIDAY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BulletinStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ContentType" AS ENUM ('STORY', 'BULLETIN', 'SHOW', 'EPISODE', 'PODCAST', 'PODCAST_EPISODE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PeriodType" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABLES
-- ============================================================

-- EmailLog
CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "from" TEXT,
    "subject" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "providerId" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "environment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- Announcement
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'MEDIUM',
    "targetAudience" "AnnouncementTargetAudience" NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- UserAnnouncementDismissal
CREATE TABLE IF NOT EXISTS "UserAnnouncementDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnnouncementDismissal_pkey" PRIMARY KEY ("id")
);

-- BulletinSchedule
CREATE TABLE IF NOT EXISTS "BulletinSchedule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "language" "StoryLanguage" NOT NULL,
    "scheduleType" "BulletinScheduleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulletinSchedule_pkey" PRIMARY KEY ("id")
);

-- Bulletin
CREATE TABLE IF NOT EXISTS "Bulletin" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "outro" TEXT NOT NULL,
    "language" "StoryLanguage" NOT NULL,
    "status" "BulletinStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduleId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "reviewChecklist" JSONB,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bulletin_pkey" PRIMARY KEY ("id")
);

-- BulletinStory
CREATE TABLE IF NOT EXISTS "BulletinStory" (
    "id" TEXT NOT NULL,
    "bulletinId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinStory_pkey" PRIMARY KEY ("id")
);

-- ContentView
CREATE TABLE IF NOT EXISTS "ContentView" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "userId" TEXT,
    "stationId" TEXT,
    "language" TEXT,
    "category" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentView_pkey" PRIMARY KEY ("id")
);

-- ContentAnalytics
CREATE TABLE IF NOT EXISTS "ContentAnalytics" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "stationId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "topLanguages" JSONB,
    "topStations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentAnalytics_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- INDEXES
-- ============================================================

-- EmailLog
CREATE INDEX IF NOT EXISTS "EmailLog_userId_idx" ON "EmailLog"("userId");
CREATE INDEX IF NOT EXISTS "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX IF NOT EXISTS "EmailLog_type_idx" ON "EmailLog"("type");
CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
CREATE INDEX IF NOT EXISTS "EmailLog_to_idx" ON "EmailLog"("to");

-- Announcement
CREATE INDEX IF NOT EXISTS "Announcement_isActive_idx" ON "Announcement"("isActive");
CREATE INDEX IF NOT EXISTS "Announcement_targetAudience_idx" ON "Announcement"("targetAudience");
CREATE INDEX IF NOT EXISTS "Announcement_priority_idx" ON "Announcement"("priority");
CREATE INDEX IF NOT EXISTS "Announcement_createdAt_idx" ON "Announcement"("createdAt");
CREATE INDEX IF NOT EXISTS "Announcement_expiresAt_idx" ON "Announcement"("expiresAt");

-- UserAnnouncementDismissal
CREATE INDEX IF NOT EXISTS "UserAnnouncementDismissal_userId_idx" ON "UserAnnouncementDismissal"("userId");
CREATE INDEX IF NOT EXISTS "UserAnnouncementDismissal_announcementId_idx" ON "UserAnnouncementDismissal"("announcementId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserAnnouncementDismissal_userId_announcementId_key" ON "UserAnnouncementDismissal"("userId", "announcementId");

-- BulletinSchedule
CREATE INDEX IF NOT EXISTS "BulletinSchedule_scheduleType_isActive_idx" ON "BulletinSchedule"("scheduleType", "isActive");

-- Bulletin
CREATE UNIQUE INDEX IF NOT EXISTS "Bulletin_slug_key" ON "Bulletin"("slug");
CREATE INDEX IF NOT EXISTS "Bulletin_status_language_idx" ON "Bulletin"("status", "language");
CREATE INDEX IF NOT EXISTS "Bulletin_scheduledFor_idx" ON "Bulletin"("scheduledFor");
CREATE INDEX IF NOT EXISTS "Bulletin_authorId_idx" ON "Bulletin"("authorId");
CREATE INDEX IF NOT EXISTS "Bulletin_reviewerId_idx" ON "Bulletin"("reviewerId");

-- BulletinStory
CREATE INDEX IF NOT EXISTS "BulletinStory_bulletinId_order_idx" ON "BulletinStory"("bulletinId", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "BulletinStory_bulletinId_storyId_key" ON "BulletinStory"("bulletinId", "storyId");
CREATE INDEX IF NOT EXISTS "BulletinStory_storyId_idx" ON "BulletinStory"("storyId");

-- ContentView
CREATE INDEX IF NOT EXISTS "ContentView_contentType_contentId_viewedAt_idx" ON "ContentView"("contentType", "contentId", "viewedAt");
CREATE INDEX IF NOT EXISTS "ContentView_stationId_viewedAt_idx" ON "ContentView"("stationId", "viewedAt");
CREATE INDEX IF NOT EXISTS "ContentView_userId_viewedAt_idx" ON "ContentView"("userId", "viewedAt");
CREATE INDEX IF NOT EXISTS "ContentView_viewedAt_idx" ON "ContentView"("viewedAt");

-- ContentAnalytics
CREATE INDEX IF NOT EXISTS "ContentAnalytics_contentType_contentId_date_idx" ON "ContentAnalytics"("contentType", "contentId", "date");
CREATE INDEX IF NOT EXISTS "ContentAnalytics_date_periodType_idx" ON "ContentAnalytics"("date", "periodType");
CREATE UNIQUE INDEX IF NOT EXISTS "ContentAnalytics_contentType_contentId_periodType_date_stat_key" ON "ContentAnalytics"("contentType", "contentId", "periodType", "date", "stationId");

-- ============================================================
-- FOREIGN KEYS
-- ============================================================

-- EmailLog
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_userId_fkey') THEN
        ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Announcement
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_authorId_fkey') THEN
        ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- UserAnnouncementDismissal
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAnnouncementDismissal_userId_fkey') THEN
        ALTER TABLE "UserAnnouncementDismissal" ADD CONSTRAINT "UserAnnouncementDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAnnouncementDismissal_announcementId_fkey') THEN
        ALTER TABLE "UserAnnouncementDismissal" ADD CONSTRAINT "UserAnnouncementDismissal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- BulletinSchedule
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BulletinSchedule_createdBy_fkey') THEN
        ALTER TABLE "BulletinSchedule" ADD CONSTRAINT "BulletinSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Bulletin
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bulletin_scheduleId_fkey') THEN
        ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "BulletinSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bulletin_authorId_fkey') THEN
        ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bulletin_reviewerId_fkey') THEN
        ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bulletin_publishedBy_fkey') THEN
        ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bulletin_categoryId_fkey') THEN
        ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- BulletinStory
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BulletinStory_bulletinId_fkey') THEN
        ALTER TABLE "BulletinStory" ADD CONSTRAINT "BulletinStory_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "Bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BulletinStory_storyId_fkey') THEN
        ALTER TABLE "BulletinStory" ADD CONSTRAINT "BulletinStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ContentView
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentView_userId_fkey') THEN
        ALTER TABLE "ContentView" ADD CONSTRAINT "ContentView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentView_stationId_fkey') THEN
        ALTER TABLE "ContentView" ADD CONSTRAINT "ContentView_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ContentAnalytics
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentAnalytics_stationId_fkey') THEN
        ALTER TABLE "ContentAnalytics" ADD CONSTRAINT "ContentAnalytics_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
