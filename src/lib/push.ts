import webpush from "web-push";
import { db } from "@/lib/db";

// VAPID keys must be set in Railway environment variables
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT     ?? "mailto:admin@sanoa.tech";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export { VAPID_PUBLIC_KEY };

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/**
 * Send a push notification to all subscriptions of a tenant.
 * Silently removes expired / invalid subscriptions.
 */
export async function sendPushToTenant(tenantId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return; // not configured

  const subs = await (db.pushSubscription as any).findMany({ where: { tenantId } });
  if (subs.length === 0) return;

  const json = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err: any) {
        // 410 Gone or 404 = subscription no longer valid
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          staleIds.push(sub.id);
        }
      }
    })
  );

  if (staleIds.length > 0) {
    await (db.pushSubscription as any).deleteMany({ where: { id: { in: staleIds } } });
  }
}
