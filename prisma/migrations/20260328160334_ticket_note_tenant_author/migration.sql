-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TicketNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticketId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "isTenantAuthor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketNote_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TicketNote" ("createdAt", "id", "isInternal", "text", "ticketId") SELECT "createdAt", "id", "isInternal", "text", "ticketId" FROM "TicketNote";
DROP TABLE "TicketNote";
ALTER TABLE "new_TicketNote" RENAME TO "TicketNote";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
