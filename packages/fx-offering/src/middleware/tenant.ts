/**
 * F541: fx-offering Tenant 가드 미들웨어
 * packages/api/src/middleware/tenant.ts 기반 — offering 도메인 전용
 */
import type { Context, Next } from "hono";
import type { OfferingEnv } from "../env.js";

export interface TenantVariables {
  orgId: string;
  orgRole: string;
  userId: string;
}

export async function tenantGuard(
  c: Context<{ Bindings: OfferingEnv; Variables: TenantVariables }>,
  next: Next,
) {
  const payload = c.get("jwtPayload") as
    | { sub?: string; orgId?: string; orgRole?: string }
    | undefined;

  if (!payload?.orgId) {
    return c.json({ error: "Organization context required" }, 403);
  }

  let orgRole = payload.orgRole ?? "member";

  const db = c.env?.DB;
  if (db && payload.sub) {
    const member = await db
      .prepare("SELECT role FROM org_members WHERE org_id = ? AND user_id = ?")
      .bind(payload.orgId, payload.sub)
      .first();

    if (!member) {
      return c.json({ error: "Not a member of this organization" }, 403);
    }
    orgRole = (member as { role: string }).role;
  }

  c.set("orgId", payload.orgId);
  c.set("orgRole", orgRole);
  c.set("userId", payload.sub ?? "");

  return next();
}
