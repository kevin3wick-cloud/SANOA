-- CreateTable: Property
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PropertyAssignee
CREATE TABLE "PropertyAssignee" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyAssignee_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on PropertyAssignee
CREATE UNIQUE INDEX "PropertyAssignee_propertyId_userId_key" ON "PropertyAssignee"("propertyId", "userId");

-- AlterTable: add propertyId to Tenant
ALTER TABLE "Tenant" ADD COLUMN "propertyId" TEXT;

-- AddForeignKey: PropertyAssignee → Property
ALTER TABLE "PropertyAssignee" ADD CONSTRAINT "PropertyAssignee_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Tenant → Property
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
