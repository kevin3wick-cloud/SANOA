-- AlterTable: add pending name change request fields to Tenant
ALTER TABLE "Tenant" ADD COLUMN "pendingName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "pendingNameReason" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "pendingNameRequestedAt" TIMESTAMP(3);
