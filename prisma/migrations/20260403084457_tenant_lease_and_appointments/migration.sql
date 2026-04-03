-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Tenant" ADD COLUMN "leaseEnd" DATETIME;
ALTER TABLE "Tenant" ADD COLUMN "leaseStart" DATETIME;

-- CreateTable
CREATE TABLE "TicketAppointmentProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" DATETIME,
    CONSTRAINT "TicketAppointmentProposal_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TicketAppointmentProposal_ticketId_idx" ON "TicketAppointmentProposal"("ticketId");
