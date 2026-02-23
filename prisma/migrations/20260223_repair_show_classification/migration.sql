-- Comprehensive repair: Ensure ShowClassification table, FKs, and indexes exist.
-- Handles both cases:
--   (a) Table exists but FKs missing (dev)
--   (b) Table doesn't exist at all (production - original classifications migration
--        rolled back because Show table didn't exist yet)

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "ShowClassification" (
    "showId" TEXT NOT NULL,
    "classificationId" TEXT NOT NULL,
    CONSTRAINT "ShowClassification_pkey" PRIMARY KEY ("showId","classificationId")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "ShowClassification_classificationId_idx" ON "ShowClassification"("classificationId");

-- AddForeignKey: ShowClassification -> Show
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShowClassification_showId_fkey') THEN
        ALTER TABLE "ShowClassification" ADD CONSTRAINT "ShowClassification_showId_fkey"
        FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: ShowClassification -> Classification
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShowClassification_classificationId_fkey') THEN
        ALTER TABLE "ShowClassification" ADD CONSTRAINT "ShowClassification_classificationId_fkey"
        FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
