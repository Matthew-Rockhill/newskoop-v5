/*
  Warnings:

  - You are about to drop the column `isTranslator` on the `User` table. All the data in the column will be lost.
  - Changed the type of `translationLanguages` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is not nullable.

*/

-- DropIndex
DROP INDEX "User_isTranslator_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isTranslator";

-- Convert array to single value (take first element if exists)
ALTER TABLE "User" ADD COLUMN "translationLanguage" "TranslationLanguage";

-- Copy first element from array to new column
UPDATE "User" 
SET "translationLanguage" = "translationLanguages"[1]
WHERE array_length("translationLanguages", 1) > 0;

-- Drop the old column
ALTER TABLE "User" DROP COLUMN "translationLanguages";

-- CreateIndex
CREATE INDEX "User_translationLanguage_idx" ON "User"("translationLanguage");