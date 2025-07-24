-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StoryLanguage" AS ENUM ('ENGLISH', 'AFRIKAANS', 'XHOSA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StoryStatus" ADD VALUE 'NEEDS_JOURNALIST_REVIEW';
ALTER TYPE "StoryStatus" ADD VALUE 'PENDING_TRANSLATION';
ALTER TYPE "StoryStatus" ADD VALUE 'READY_TO_PUBLISH';

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "isTranslation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" "StoryLanguage" NOT NULL DEFAULT 'ENGLISH',
ADD COLUMN     "originalStoryId" TEXT,
ADD COLUMN     "storyGroupId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isTranslator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "translationLanguages" "TranslationLanguage"[];

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "status" "TranslationStatus" NOT NULL DEFAULT 'PENDING',
    "targetLanguage" "StoryLanguage" NOT NULL,
    "originalStoryId" TEXT NOT NULL,
    "translatedStoryId" TEXT,
    "assignedToId" TEXT,
    "reviewerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "translatorNotes" TEXT,
    "reviewerNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "publishTogether" BOOLEAN NOT NULL DEFAULT true,
    "scheduledPublishAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Translation_status_idx" ON "Translation"("status");

-- CreateIndex
CREATE INDEX "Translation_originalStoryId_idx" ON "Translation"("originalStoryId");

-- CreateIndex
CREATE INDEX "Translation_translatedStoryId_idx" ON "Translation"("translatedStoryId");

-- CreateIndex
CREATE INDEX "Translation_assignedToId_idx" ON "Translation"("assignedToId");

-- CreateIndex
CREATE INDEX "Translation_targetLanguage_idx" ON "Translation"("targetLanguage");

-- CreateIndex
CREATE INDEX "StoryGroup_publishTogether_idx" ON "StoryGroup"("publishTogether");

-- CreateIndex
CREATE INDEX "StoryGroup_scheduledPublishAt_idx" ON "StoryGroup"("scheduledPublishAt");

-- CreateIndex
CREATE INDEX "Story_language_idx" ON "Story"("language");

-- CreateIndex
CREATE INDEX "Story_isTranslation_idx" ON "Story"("isTranslation");

-- CreateIndex
CREATE INDEX "Story_originalStoryId_idx" ON "Story"("originalStoryId");

-- CreateIndex
CREATE INDEX "Story_storyGroupId_idx" ON "Story"("storyGroupId");

-- CreateIndex
CREATE INDEX "User_isTranslator_idx" ON "User"("isTranslator");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_originalStoryId_fkey" FOREIGN KEY ("originalStoryId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_storyGroupId_fkey" FOREIGN KEY ("storyGroupId") REFERENCES "StoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_originalStoryId_fkey" FOREIGN KEY ("originalStoryId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_translatedStoryId_fkey" FOREIGN KEY ("translatedStoryId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
