-- AlterTable
ALTER TABLE "Show" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Show_parentId_idx" ON "Show"("parentId");

-- AddForeignKey
ALTER TABLE "Show" ADD CONSTRAINT "Show_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Show"("id") ON DELETE SET NULL ON UPDATE CASCADE;
