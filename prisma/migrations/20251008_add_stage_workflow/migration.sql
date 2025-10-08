-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "StoryStage" AS ENUM ('DRAFT', 'NEEDS_JOURNALIST_REVIEW', 'NEEDS_SUB_EDITOR_APPROVAL', 'APPROVED', 'TRANSLATED', 'PUBLISHED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable - Add stage-based workflow columns to Story (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'stage') THEN
        ALTER TABLE "Story" ADD COLUMN "stage" "StoryStage" DEFAULT 'DRAFT';
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'authorRole') THEN
        ALTER TABLE "Story" ADD COLUMN "authorRole" "StaffRole";
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'assignedReviewerId') THEN
        ALTER TABLE "Story" ADD COLUMN "assignedReviewerId" TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'assignedApproverId') THEN
        ALTER TABLE "Story" ADD COLUMN "assignedApproverId" TEXT;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'authorChecklist') THEN
        ALTER TABLE "Story" ADD COLUMN "authorChecklist" JSONB;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'reviewerChecklist') THEN
        ALTER TABLE "Story" ADD COLUMN "reviewerChecklist" JSONB;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'approverChecklist') THEN
        ALTER TABLE "Story" ADD COLUMN "approverChecklist" JSONB;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Story' AND column_name = 'translationChecklist') THEN
        ALTER TABLE "Story" ADD COLUMN "translationChecklist" JSONB;
    END IF;
END $$;

-- CreateTable - RevisionRequest model (if not exists)
CREATE TABLE IF NOT EXISTS "RevisionRequest" (
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

-- CreateIndex (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Story_stage_idx') THEN
        CREATE INDEX "Story_stage_idx" ON "Story"("stage");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Story_assignedReviewerId_idx') THEN
        CREATE INDEX "Story_assignedReviewerId_idx" ON "Story"("assignedReviewerId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Story_assignedApproverId_idx') THEN
        CREATE INDEX "Story_assignedApproverId_idx" ON "Story"("assignedApproverId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'RevisionRequest_storyId_idx') THEN
        CREATE INDEX "RevisionRequest_storyId_idx" ON "RevisionRequest"("storyId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'RevisionRequest_assignedToId_idx') THEN
        CREATE INDEX "RevisionRequest_assignedToId_idx" ON "RevisionRequest"("assignedToId");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'RevisionRequest_requestedById_idx') THEN
        CREATE INDEX "RevisionRequest_requestedById_idx" ON "RevisionRequest"("requestedById");
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Story_assignedReviewerId_fkey') THEN
        ALTER TABLE "Story" ADD CONSTRAINT "Story_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Story_assignedApproverId_fkey') THEN
        ALTER TABLE "Story" ADD CONSTRAINT "Story_assignedApproverId_fkey" FOREIGN KEY ("assignedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RevisionRequest_storyId_fkey') THEN
        ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RevisionRequest_requestedById_fkey') THEN
        ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RevisionRequest_assignedToId_fkey') THEN
        ALTER TABLE "RevisionRequest" ADD CONSTRAINT "RevisionRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
