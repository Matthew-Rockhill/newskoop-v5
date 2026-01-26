-- Add bulletin flagging columns to Story
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "flaggedForBulletin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "flaggedForBulletinAt" TIMESTAMP(3);
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "flaggedForBulletinById" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Story_flaggedForBulletin_idx" ON "Story"("flaggedForBulletin");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Story_flaggedForBulletinById_fkey') THEN
        ALTER TABLE "Story" ADD CONSTRAINT "Story_flaggedForBulletinById_fkey"
        FOREIGN KEY ("flaggedForBulletinById") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
