-- AlterTable: Remove unused color and descriptionAfrikaans columns from Tag
ALTER TABLE "Tag" DROP COLUMN IF EXISTS "color";
ALTER TABLE "Tag" DROP COLUMN IF EXISTS "descriptionAfrikaans";
