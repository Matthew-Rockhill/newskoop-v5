/*
  Warnings:

  - Added the required column `updatedAt` to the `Tag` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TagCategory" AS ENUM ('LANGUAGE', 'RELIGION', 'LOCALITY', 'GENERAL');

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "category" "TagCategory" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "isPreset" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update existing tags to have updatedAt
UPDATE "Tag" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Tag_category_idx" ON "Tag"("category");

-- CreateIndex
CREATE INDEX "Tag_isRequired_idx" ON "Tag"("isRequired");
