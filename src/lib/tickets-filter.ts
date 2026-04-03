import { Prisma, TicketCategory } from "@prisma/client";

export type TicketListSearchParams = {
  tenantName?: string;
  apartment?: string;
  category?: string;
  createdFrom?: string;
  createdTo?: string;
};

function pickParam(
  raw: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const v = raw[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
}

export function normalizeTicketListParams(
  raw: Record<string, string | string[] | undefined>
): TicketListSearchParams {
  return {
    tenantName: pickParam(raw, "tenantName"),
    apartment: pickParam(raw, "apartment"),
    category: pickParam(raw, "category"),
    createdFrom: pickParam(raw, "createdFrom"),
    createdTo: pickParam(raw, "createdTo")
  };
}

function parseDayStart(isoDate: string): Date | null {
  const d = new Date(`${isoDate.trim()}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDayEnd(isoDate: string): Date | null {
  const d = new Date(`${isoDate.trim()}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildTicketListWhere(
  sp: TicketListSearchParams
): Prisma.TicketWhereInput {
  const and: Prisma.TicketWhereInput[] = [];

  const tn = sp.tenantName?.trim();
  if (tn) {
    and.push({
      tenant: { name: { contains: tn } }
    });
  }

  const apt = sp.apartment?.trim();
  if (apt) {
    and.push({
      tenant: { apartment: { contains: apt } }
    });
  }

  const cat = sp.category?.trim();
  if (cat && Object.values(TicketCategory).includes(cat as TicketCategory)) {
    and.push({ category: cat as TicketCategory });
  }

  const from = sp.createdFrom?.trim();
  if (from) {
    const start = parseDayStart(from);
    if (start) {
      and.push({ createdAt: { gte: start } });
    }
  }

  const to = sp.createdTo?.trim();
  if (to) {
    const end = parseDayEnd(to);
    if (end) {
      and.push({ createdAt: { lte: end } });
    }
  }

  if (and.length === 0) {
    return {};
  }
  return { AND: and };
}
