-- CreateEnum
CREATE TYPE "StoryStage" AS ENUM ('DRAFT', 'NEEDS_JOURNALIST_REVIEW', 'NEEDS_SUB_EDITOR_APPROVAL', 'APPROVED', 'TRANSLATED', 'PUBLISHED');

-- AlterTable - Add stage-based workflow columns to Story
ALTER TABLE "Story" ADD COLUMN "stage" "StoryStage" DEFAULT 'DRAFT';
ALTER TABLE "Story" ADD COLUMN "authorRole" "StaffRole";
ALTER TABLE "Story" ADD COLUMN "assignedReviewerId" TEXT;
ALTER TABLE "Story" ADD COLUMN "assignedApproverId" TEXT;
ALTER TABLE "Story" ADD COLUMN "authorChecklist" JSONB;
ALTER TABLE "Story" ADD COLUMN "reviewerChecklist" JSONB;
ALTER TABLE "Story" ADD COLUMN "approverChecklist" JSONB;
ALTER TABLE "Story" ADD COLUMN "translationChecklist" JSONB;

-- CreateTable - RevisionRequest model
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

-- CreateIndex
CREATE INDEX "Story_stage_idx" ON "Story"("stage");
CREATE INDEX "Story_assignedReviewerId_idx" ON "Story"("assignedReviewerId");
CREATE INDEX "Story_assignedApproverId_idx" ON "Story"("assignedApproverId");
CREATE INDEX "RevisionRequest_storyId_idx" ON "RevisionRequest"("storyId");
CREATE INDEX "RevisionRequest_assignedToId_idx" ON "RevisionRequest"("assignedToId");
CREATE INDEX "RevisionRequest_requestedById_idx" ON "RevisionRequest"("requestedById");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Story" ADD CONSTRAINT "Story_assignedApproverId_fkey" FOREIGN KEY ("assignedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
