-- Catchup migration: brings migration history in sync with all db push changes
-- that accumulated over time. After this, prisma migrate dev works cleanly.

-- ============================================================
-- ENUM CHANGES
-- ============================================================

DO $$ BEGIN
    ALTER TYPE "StoryLanguage" ADD VALUE IF NOT EXISTS 'ZULU';
END $$;

DO $$ BEGIN
    ALTER TYPE "TranslationLanguage" ADD VALUE IF NOT EXISTS 'ZULU';
END $$;

-- ============================================================
-- FK CHANGES (drop/recreate with updated cascade rules)
-- ============================================================

ALTER TABLE "BulletinStory" DROP CONSTRAINT IF EXISTS "BulletinStory_storyId_fkey";
ALTER TABLE "ContentAnalytics" DROP CONSTRAINT IF EXISTS "ContentAnalytics_stationId_fkey";
ALTER TABLE "UserAnnouncementDismissal" DROP CONSTRAINT IF EXISTS "UserAnnouncementDismissal_userId_fkey";

-- Drop Translation FKs before dropping table
ALTER TABLE "Translation" DROP CONSTRAINT IF EXISTS "Translation_assignedToId_fkey";
ALTER TABLE "Translation" DROP CONSTRAINT IF EXISTS "Translation_originalStoryId_fkey";
ALTER TABLE "Translation" DROP CONSTRAINT IF EXISTS "Translation_reviewerId_fkey";
ALTER TABLE "Translation" DROP CONSTRAINT IF EXISTS "Translation_translatedStoryId_fkey";

-- ============================================================
-- INDEX CLEANUP
-- ============================================================

DROP INDEX IF EXISTS "MenuItem_categoryId_idx";
DROP INDEX IF EXISTS "ShowTag_tagId_idx";

-- ============================================================
-- TABLE ALTERATIONS (columns must be dropped before their types)
-- ============================================================

-- Station
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "allowedLanguages" TEXT[] DEFAULT ARRAY['English', 'Afrikaans', 'Xhosa']::TEXT[];
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "allowedReligions" TEXT[] DEFAULT ARRAY['Christian', 'Muslim', 'Neutral']::TEXT[];
ALTER TABLE "Station" ADD COLUMN IF NOT EXISTS "blockedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Story (drop priority column before dropping StoryPriority type)
ALTER TABLE "Story" DROP COLUMN IF EXISTS "priority";
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "followUpCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "followUpCompletedAt" TIMESTAMP(3);
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "followUpCompletedBy" TEXT;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "reviewChecklist" JSONB;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "scheduledPublishAt" TIMESTAMP(3);

-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultLanguagePreference" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePictureUrl" TEXT;

-- ============================================================
-- DROP UNUSED (after columns that depend on these types are removed)
-- ============================================================

DROP TABLE IF EXISTS "Translation";
DROP TYPE IF EXISTS "StoryPriority";
DROP TYPE IF EXISTS "TranslationStatus";

-- ============================================================
-- NEW INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS "AudioClip_uploadedBy_idx" ON "AudioClip"("uploadedBy");
CREATE INDEX IF NOT EXISTS "AuditLog_action_entityType_entityId_idx" ON "AuditLog"("action", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");
CREATE INDEX IF NOT EXISTS "Comment_type_idx" ON "Comment"("type");
CREATE INDEX IF NOT EXISTS "Episode_scheduledPublishAt_idx" ON "Episode"("scheduledPublishAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Episode_showId_episodeNumber_key" ON "Episode"("showId", "episodeNumber");
CREATE INDEX IF NOT EXISTS "RevisionRequest_resolvedAt_idx" ON "RevisionRequest"("resolvedAt");
CREATE INDEX IF NOT EXISTS "StationClassification_classificationId_idx" ON "StationClassification"("classificationId");
CREATE INDEX IF NOT EXISTS "Story_publishedAt_idx" ON "Story"("publishedAt");
CREATE INDEX IF NOT EXISTS "Story_updatedAt_idx" ON "Story"("updatedAt");
CREATE INDEX IF NOT EXISTS "Story_followUpDate_idx" ON "Story"("followUpDate");
CREATE INDEX IF NOT EXISTS "Story_scheduledPublishAt_idx" ON "Story"("scheduledPublishAt");
CREATE INDEX IF NOT EXISTS "Story_status_language_idx" ON "Story"("status", "language");
CREATE INDEX IF NOT EXISTS "Story_categoryId_status_idx" ON "Story"("categoryId", "status");
CREATE INDEX IF NOT EXISTS "Story_language_status_idx" ON "Story"("language", "status");
CREATE INDEX IF NOT EXISTS "StoryClassification_classificationId_idx" ON "StoryClassification"("classificationId");
CREATE INDEX IF NOT EXISTS "StoryGroup_publishedAt_idx" ON "StoryGroup"("publishedAt");

-- ============================================================
-- RE-ADD FKs WITH UPDATED CASCADE RULES
-- ============================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAnnouncementDismissal_userId_fkey') THEN
        ALTER TABLE "UserAnnouncementDismissal" ADD CONSTRAINT "UserAnnouncementDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BulletinStory_storyId_fkey') THEN
        ALTER TABLE "BulletinStory" ADD CONSTRAINT "BulletinStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContentAnalytics_stationId_fkey') THEN
        ALTER TABLE "ContentAnalytics" ADD CONSTRAINT "ContentAnalytics_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
