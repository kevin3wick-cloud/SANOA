-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "magicToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_magicToken_key" ON "Tenant"("magicToken");
