import { db } from "@/lib/db";

/** Heute 00:00 UTC – Mietende davor gilt als abgelaufen. */
export function leaseEndArchiveCutoffUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Setzt archivedAt für Mieter, deren Mietende (leaseEnd) vor dem aktuellen Kalendertag liegt.
 */
export async function archiveTenantsPastLeaseEnd() {
  const cutoff = leaseEndArchiveCutoffUtc();

  await db.tenant.updateMany({
    where: {
      archivedAt: null,
      leaseEnd: { not: null, lt: cutoff }
    },
    data: { archivedAt: new Date() }
  });
}

export function parseOptionalDateInput(value: string | undefined | null): Date | null {
  const s = value?.trim();
  if (!s) return null;
  const d = new Date(`${s}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Letzter Tag des Mietverhältnisses: Ende dieses Tages (UTC). */
export function parseLeaseEndDateInput(value: string | undefined | null): Date | null {
  const s = value?.trim();
  if (!s) return null;
  const d = new Date(`${s}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** archivedAt setzen, wenn Mietende in der Vergangenheit liegt. */
export function archivedAtForLeaseEnd(leaseEnd: Date | null): Date | null {
  if (!leaseEnd) {
    return null;
  }
  return leaseEnd < leaseEndArchiveCutoffUtc() ? new Date() : null;
}
