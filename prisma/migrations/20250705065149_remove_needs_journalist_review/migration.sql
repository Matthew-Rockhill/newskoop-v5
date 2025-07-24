/*
  Warnings:

  - The values [NEEDS_JOURNALIST_REVIEW] on the enum `StoryStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StoryStatus_new" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_REVISION', 'PENDING_APPROVAL', 'PENDING_TRANSLATION', 'APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'ARCHIVED');
ALTER TABLE "Story" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Story" ALTER COLUMN "status" TYPE "StoryStatus_new" USING ("status"::text::"StoryStatus_new");
ALTER TYPE "StoryStatus" RENAME TO "StoryStatus_old";
ALTER TYPE "StoryStatus_new" RENAME TO "StoryStatus";
DROP TYPE "StoryStatus_old";
ALTER TABLE "Story" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;
