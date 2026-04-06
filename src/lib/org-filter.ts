/**
 * Returns a Prisma WHERE filter for Tenant based on the current user's orgId.
 *
 * - If user has an orgId → filter tenants to that org only
 * - If user has no orgId → filter tenants that also have no orgId
 *   (backward-compatible: existing data before multi-tenancy rollout)
 */
export function tenantOrgFilter(user: { orgId?: string | null }) {
  return { orgId: user.orgId ?? null };
}
