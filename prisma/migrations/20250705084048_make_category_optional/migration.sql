-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT "Story_categoryId_fkey";

-- AlterTable
ALTER TABLE "Story" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
