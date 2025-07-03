/*
  Warnings:

  - You are about to drop the column `language` on the `Story` table. All the data in the column will be lost.
  - You are about to drop the column `religiousFilter` on the `Story` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Story_language_idx";

-- AlterTable
ALTER TABLE "Story" DROP COLUMN "language",
DROP COLUMN "religiousFilter";

-- DropEnum
DROP TYPE "ContentLanguage";

-- DropEnum
DROP TYPE "ReligiousFilter";
