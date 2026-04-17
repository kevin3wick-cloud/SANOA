-- CreateTable
CREATE TABLE "OrgSettings" (
    "id"           TEXT NOT NULL,
    "orgId"        TEXT NOT NULL,
    "senderName"   TEXT,
    "replyToEmail" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgSettings_orgId_key" ON "OrgSettings"("orgId");
