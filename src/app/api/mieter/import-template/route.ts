import { NextResponse } from "next/server";

export async function GET() {
  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";
  const header = "Name;E-Mail;Telefon;Wohnung;Passwort;Mietbeginn;Mietende";
  const example1 = "Max Muster;max@beispiel.ch;079 123 45 67;Hauptstrasse 1 / 2. OG;sicher123;2024-01-01;";
  const example2 = "Anna Müller;anna@beispiel.ch;078 987 65 43;Gartenweg 5 / EG;passwort99;2024-03-01;2025-02-28";

  const csv = `${bom}${header}\n${example1}\n${example2}\n`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mieter-import-vorlage.csv"'
    }
  });
}
