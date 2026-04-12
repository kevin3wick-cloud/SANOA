-- Add orgId to Document for per-org isolation
ALTER TABLE "Document" ADD COLUMN "orgId" TEXT;
