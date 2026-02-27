-- AlterTable
ALTER TABLE "DiaryEntry" ADD COLUMN "assignedToId" TEXT;

-- CreateIndex
CREATE INDEX "DiaryEntry_assignedToId_idx" ON "DiaryEntry"("assignedToId");

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
