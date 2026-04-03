import {
  DocumentKind,
  DocumentVisibility,
  PrismaClient,
  TicketCategory,
  TicketStatus,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.ticketNote.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.document.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      email: "vermieter@example.de",
      password: "demo123",
      name: "Hausverwaltung Muster GmbH"
    }
  });

  const anna = await prisma.tenant.create({
    data: {
      name: "Anna Schneider",
      email: "anna.schneider@example.de",
      phone: "+49 170 1234567",
      apartment: "Haus A - Whg 2.OG links"
    }
  });

  const max = await prisma.tenant.create({
    data: {
      name: "Max Bauer",
      email: "max.bauer@example.de",
      phone: "+49 171 9876543",
      apartment: "Haus B - Whg EG rechts"
    }
  });

  await prisma.user.create({
    data: {
      email: "anna.schneider@example.de",
      password: "demo123",
      name: "Anna Schneider",
      role: UserRole.MIETER,
      tenantId: anna.id
    }
  });

  const t1 = await prisma.ticket.create({
    data: {
      title: "Heizung wird nicht warm",
      description: "Seit gestern Abend bleibt die Heizung im Wohnzimmer kalt.",
      location: "Wohnzimmer",
      category: TicketCategory.HEIZUNG,
      status: TicketStatus.OPEN,
      tenantId: anna.id,
      imageUrl: "/uploads/heizung.jpg"
    }
  });

  const t2 = await prisma.ticket.create({
    data: {
      title: "Wasserhahn tropft",
      description: "Der Wasserhahn in der Küche tropft ständig.",
      location: "Küche",
      category: TicketCategory.SANITAER,
      status: TicketStatus.IN_PROGRESS,
      tenantId: max.id
    }
  });

  await prisma.ticket.create({
    data: {
      title: "Licht im Flur defekt",
      description: "Die Deckenlampe im Flur flackert und fällt aus.",
      location: "Flur",
      category: TicketCategory.ELEKTRO,
      status: TicketStatus.DONE,
      tenantId: anna.id
    }
  });

  await prisma.ticketNote.createMany({
    data: [
      {
        ticketId: t1.id,
        text: "Techniker für Montag angefragt.",
        isInternal: true
      },
      {
        ticketId: t2.id,
        text: "Rückfrage an Mieter wegen Terminfenster gesendet.",
        isInternal: false
      }
    ]
  });

  await prisma.document.createMany({
    data: [
      {
        name: "Mietvertrag Anna Schneider",
        originalFilename: "Mietvertrag_Anna_Schneider.pdf",
        fileUrl: "/uploads/mietvertrag-anna.pdf",
        tenantId: anna.id,
        visibility: DocumentVisibility.TENANT_VISIBLE,
        kind: DocumentKind.MIETVERTRAG
      },
      {
        name: "Hausordnung",
        originalFilename: "Hausordnung.pdf",
        fileUrl: "/uploads/hausordnung.pdf",
        visibility: DocumentVisibility.TENANT_VISIBLE,
        kind: DocumentKind.HAUSORDNUNG
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
