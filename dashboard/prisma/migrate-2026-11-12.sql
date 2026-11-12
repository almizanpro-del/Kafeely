-- 2026-11-12: document file storage (view / print / download / upload)
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "mimeType" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "fileData" BYTEA;
