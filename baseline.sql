-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STAFF', 'RADIO');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'EDITOR', 'SUB_EDITOR', 'JOURNALIST', 'INTERN');

-- CreateEnum
CREATE TYPE "TranslationLanguage" AS ENUM ('AFRIKAANS', 'XHOSA');

-- CreateEnum
CREATE TYPE "Province" AS ENUM ('EASTERN_CAPE', 'FREE_STATE', 'GAUTENG', 'KWAZULU_NATAL', 'LIMPOPO', 'MPUMALANGA', 'NORTHERN_CAPE', 'NORTH_WEST', 'WESTERN_CAPE', 'NATIONAL');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_REVISION', 'PENDING_APPROVAL', 'PENDING_TRANSLATION', 'APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StoryStage" AS ENUM ('DRAFT', 'NEEDS_JOURNALIST_REVIEW', 'NEEDS_SUB_EDITOR_APPROVAL', 'APPROVED', 'TRANSLATED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "CommentType" AS ENUM ('GENERAL', 'REVISION_REQUEST', 'APPROVAL', 'REJECTION', 'EDITORIAL_NOTE');

-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('LANGUAGE', 'RELIGION', 'LOCALITY', 'GENERAL');

-- CreateEnum
CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AnnouncementTargetAudience" AS ENUM ('ALL', 'NEWSROOM', 'RADIO');

-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "StoryLanguage" AS ENUM ('ENGLISH', 'AFRIKAANS', 'XHOSA');

-- CreateEnum
CREATE TYPE "BulletinScheduleType" AS ENUM ('WEEKDAY', 'WEEKEND', 'PUBLIC_HOLIDAY');

-- CreateEnum
CREATE TYPE "BulletinStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('WELCOME', 'PASSWORD_RESET', 'MAGIC_LINK', 'NOTIFICATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED', 'DELIVERED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "password" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "translationLanguage" "TranslationLanguage",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "profilePictureUrl" TEXT,
    "defaultLanguagePreference" TEXT,
    "staffRole" "StaffRole",
    "radioStationId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "province" "Province" NOT NULL DEFAULT 'GAUTENG',
    "contactNumber" TEXT,
    "contactEmail" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hasContentAccess" BOOLEAN NOT NULL DEFAULT true,
    "allowedLanguages" TEXT[] DEFAULT ARRAY['English', 'Afrikaans', 'Xhosa']::TEXT[],
    "allowedReligions" TEXT[] DEFAULT ARRAY['Christian', 'Muslim', 'Neutral']::TEXT[],
    "blockedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "stage" "StoryStage" DEFAULT 'DRAFT',
    "authorRole" "StaffRole",
    "language" "StoryLanguage" NOT NULL DEFAULT 'ENGLISH',
    "isTranslation" BOOLEAN NOT NULL DEFAULT false,
    "originalStoryId" TEXT,
    "storyGroupId" TEXT,
    "authorId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "reviewerId" TEXT,
    "assignedReviewerId" TEXT,
    "assignedApproverId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "followUpNote" TEXT,
    "followUpCompleted" BOOLEAN NOT NULL DEFAULT false,
    "followUpCompletedAt" TIMESTAMP(3),
    "followUpCompletedBy" TEXT,
    "scheduledPublishAt" TIMESTAMP(3),
    "reviewChecklist" JSONB,
    "authorChecklist" JSONB,
    "reviewerChecklist" JSONB,
    "approverChecklist" JSONB,
    "translationChecklist" JSONB,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionRequest" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedByRole" "StaffRole" NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "RevisionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isParent" BOOLEAN NOT NULL DEFAULT false,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "category" "TagCategory" NOT NULL DEFAULT 'GENERAL',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryTag" (
    "storyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "StoryTag_pkey" PRIMARY KEY ("storyId","tagId")
);

-- CreateTable
CREATE TABLE "AudioClip" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudioClip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "CommentType" NOT NULL DEFAULT 'GENERAL',
    "category" TEXT,
    "storyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

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
    "publishedAt" TIMESTAMP(3),
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

-- CreateTable
CREATE TABLE "EmailLog" (
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

-- CreateTable
CREATE TABLE "Announcement" (
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

-- CreateTable
CREATE TABLE "UserAnnouncementDismissal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnnouncementDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinSchedule" (
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

-- CreateTable
CREATE TABLE "Bulletin" (
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

-- CreateTable
CREATE TABLE "BulletinStory" (
    "id" TEXT NOT NULL,
    "bulletinId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_userType_idx" ON "User"("userType");

-- CreateIndex
CREATE INDEX "User_radioStationId_idx" ON "User"("radioStationId");

-- CreateIndex
CREATE INDEX "User_translationLanguage_idx" ON "User"("translationLanguage");

-- CreateIndex
CREATE INDEX "Station_province_idx" ON "Station"("province");

-- CreateIndex
CREATE INDEX "Station_isActive_idx" ON "Station"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "Story_status_idx" ON "Story"("status");

-- CreateIndex
CREATE INDEX "Story_stage_idx" ON "Story"("stage");

-- CreateIndex
CREATE INDEX "Story_authorId_idx" ON "Story"("authorId");

-- CreateIndex
CREATE INDEX "Story_categoryId_idx" ON "Story"("categoryId");

-- CreateIndex
CREATE INDEX "Story_slug_idx" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "Story_language_idx" ON "Story"("language");

-- CreateIndex
CREATE INDEX "Story_isTranslation_idx" ON "Story"("isTranslation");

-- CreateIndex
CREATE INDEX "Story_originalStoryId_idx" ON "Story"("originalStoryId");

-- CreateIndex
CREATE INDEX "Story_storyGroupId_idx" ON "Story"("storyGroupId");

-- CreateIndex
CREATE INDEX "Story_assignedReviewerId_idx" ON "Story"("assignedReviewerId");

-- CreateIndex
CREATE INDEX "Story_assignedApproverId_idx" ON "Story"("assignedApproverId");

-- CreateIndex
CREATE INDEX "RevisionRequest_storyId_idx" ON "RevisionRequest"("storyId");

-- CreateIndex
CREATE INDEX "RevisionRequest_assignedToId_idx" ON "RevisionRequest"("assignedToId");

-- CreateIndex
CREATE INDEX "RevisionRequest_requestedById_idx" ON "RevisionRequest"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_level_idx" ON "Category"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "Tag_category_idx" ON "Tag"("category");

-- CreateIndex
CREATE INDEX "Tag_isRequired_idx" ON "Tag"("isRequired");

-- CreateIndex
CREATE INDEX "AudioClip_storyId_idx" ON "AudioClip"("storyId");

-- CreateIndex
CREATE INDEX "Comment_storyId_idx" ON "Comment"("storyId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

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
CREATE INDEX "EmailLog_userId_idx" ON "EmailLog"("userId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_type_idx" ON "EmailLog"("type");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_isActive_idx" ON "Announcement"("isActive");

-- CreateIndex
CREATE INDEX "Announcement_targetAudience_idx" ON "Announcement"("targetAudience");

-- CreateIndex
CREATE INDEX "Announcement_priority_idx" ON "Announcement"("priority");

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_expiresAt_idx" ON "Announcement"("expiresAt");

-- CreateIndex
CREATE INDEX "UserAnnouncementDismissal_userId_idx" ON "UserAnnouncementDismissal"("userId");

-- CreateIndex
CREATE INDEX "UserAnnouncementDismissal_announcementId_idx" ON "UserAnnouncementDismissal"("announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAnnouncementDismissal_userId_announcementId_key" ON "UserAnnouncementDismissal"("userId", "announcementId");

-- CreateIndex
CREATE INDEX "BulletinSchedule_scheduleType_isActive_idx" ON "BulletinSchedule"("scheduleType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinSchedule_time_language_scheduleType_key" ON "BulletinSchedule"("time", "language", "scheduleType");

-- CreateIndex
CREATE UNIQUE INDEX "Bulletin_slug_key" ON "Bulletin"("slug");

-- CreateIndex
CREATE INDEX "Bulletin_status_language_idx" ON "Bulletin"("status", "language");

-- CreateIndex
CREATE INDEX "Bulletin_scheduledFor_idx" ON "Bulletin"("scheduledFor");

-- CreateIndex
CREATE INDEX "BulletinStory_bulletinId_order_idx" ON "BulletinStory"("bulletinId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinStory_bulletinId_storyId_key" ON "BulletinStory"("bulletinId", "storyId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_radioStationId_fkey" FOREIGN KEY ("radioStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_originalStoryId_fkey" FOREIGN KEY ("originalStoryId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_storyGroupId_fkey" FOREIGN KEY ("storyGroupId") REFERENCES "StoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_assignedApproverId_fkey" FOREIGN KEY ("assignedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTag" ADD CONSTRAINT "StoryTag_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTag" ADD CONSTRAINT "StoryTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioClip" ADD CONSTRAINT "AudioClip_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioClip" ADD CONSTRAINT "AudioClip_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_originalStoryId_fkey" FOREIGN KEY ("originalStoryId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_translatedStoryId_fkey" FOREIGN KEY ("translatedStoryId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Translation" ADD CONSTRAINT "Translation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnnouncementDismissal" ADD CONSTRAINT "UserAnnouncementDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAnnouncementDismissal" ADD CONSTRAINT "UserAnnouncementDismissal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinSchedule" ADD CONSTRAINT "BulletinSchedule_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "BulletinSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bulletin" ADD CONSTRAINT "Bulletin_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinStory" ADD CONSTRAINT "BulletinStory_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "Bulletin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinStory" ADD CONSTRAINT "BulletinStory_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

