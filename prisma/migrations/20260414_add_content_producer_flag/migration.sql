-- AlterTable: Add isContentProducer flag to User
-- Allows any staff user to manage shows/podcasts independently of their editorial role
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isContentProducer" BOOLEAN NOT NULL DEFAULT false;
