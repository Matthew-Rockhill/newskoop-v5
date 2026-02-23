-- Repair migration: Add missing foreign keys and index on ShowClassification
-- The original classifications migration (20251205) created the ShowClassification table
-- before the Show table existed (20260113), so these FK constraints were silently skipped.

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

-- CreateIndex: ShowClassification classificationId
CREATE INDEX IF NOT EXISTS "ShowClassification_classificationId_idx" ON "ShowClassification"("classificationId");
