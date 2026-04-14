CREATE TABLE "DocumentQuestion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentQuestion_documentId_idx" ON "DocumentQuestion"("documentId");
CREATE INDEX "DocumentQuestion_orgId_idx" ON "DocumentQuestion"("orgId");

ALTER TABLE "DocumentQuestion" ADD CONSTRAINT "DocumentQuestion_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
