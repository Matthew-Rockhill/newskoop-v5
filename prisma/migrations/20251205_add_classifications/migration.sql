-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ClassificationType" AS ENUM ('LANGUAGE', 'RELIGION', 'LOCALITY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Classification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameAfrikaans" TEXT,
    "descriptionAfrikaans" TEXT,
    "type" "ClassificationType" NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StoryClassification" (
    "storyId" TEXT NOT NULL,
    "classificationId" TEXT NOT NULL,

    CONSTRAINT "StoryClassification_pkey" PRIMARY KEY ("storyId","classificationId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ShowClassification" (
    "showId" TEXT NOT NULL,
    "classificationId" TEXT NOT NULL,

    CONSTRAINT "ShowClassification_pkey" PRIMARY KEY ("showId","classificationId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StationClassification" (
    "stationId" TEXT NOT NULL,
    "classificationId" TEXT NOT NULL,

    CONSTRAINT "StationClassification_pkey" PRIMARY KEY ("stationId","classificationId")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Classification_slug_key" ON "Classification"("slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Classification_type_idx" ON "Classification"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Classification_isActive_idx" ON "Classification"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Classification_sortOrder_idx" ON "Classification"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Classification_name_type_key" ON "Classification"("name", "type");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryClassification_storyId_fkey') THEN
        ALTER TABLE "StoryClassification" ADD CONSTRAINT "StoryClassification_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryClassification_classificationId_fkey') THEN
        ALTER TABLE "StoryClassification" ADD CONSTRAINT "StoryClassification_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShowClassification_showId_fkey') THEN
        ALTER TABLE "ShowClassification" ADD CONSTRAINT "ShowClassification_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ShowClassification_classificationId_fkey') THEN
        ALTER TABLE "ShowClassification" ADD CONSTRAINT "ShowClassification_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StationClassification_stationId_fkey') THEN
        ALTER TABLE "StationClassification" ADD CONSTRAINT "StationClassification_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StationClassification_classificationId_fkey') THEN
        ALTER TABLE "StationClassification" ADD CONSTRAINT "StationClassification_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Remove old tag category columns if they exist
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tag' AND column_name = 'category') THEN
        ALTER TABLE "Tag" DROP COLUMN "category";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tag' AND column_name = 'isRequired') THEN
        ALTER TABLE "Tag" DROP COLUMN "isRequired";
    END IF;
END $$;

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tag' AND column_name = 'isPreset') THEN
        ALTER TABLE "Tag" DROP COLUMN "isPreset";
    END IF;
END $$;

-- Drop TagCategory enum if it exists (after columns are removed)
DROP TYPE IF EXISTS "TagCategory";

-- CreateEnum for MenuItem
DO $$ BEGIN
    CREATE TYPE "MenuItemType" AS ENUM ('CATEGORY', 'CUSTOM_LINK', 'DIVIDER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelAfrikaans" TEXT,
    "type" "MenuItemType" NOT NULL,
    "categoryId" TEXT,
    "url" TEXT,
    "openInNewTab" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MenuItem_parentId_idx" ON "MenuItem"("parentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MenuItem_sortOrder_idx" ON "MenuItem"("sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuItem_categoryId_fkey') THEN
        ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MenuItem_parentId_fkey') THEN
        ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
