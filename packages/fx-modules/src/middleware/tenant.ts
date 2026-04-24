import type { Context, Next } from "hono";
import type { ModulesEnv } from "../env.js";

export interface TenantVariables {
  orgId: string;
  orgRole: string;
  userId: string;
}

const TENANT_BYPASS_PATHS = ["/api/builder/"];

export async function tenantGuard(
  c: Context<{ Bindings: ModulesEnv; Variables: TenantVariables }>,
  next: Next,
) {
  if (TENANT_BYPASS_PATHS.some((p) => c.req.path.startsWith(p))) {
    return next();
  }

  const payload = c.get("jwtPayload") as
    | { sub?: string; orgId?: string; orgRole?: string }
    | undefined;

  if (!payload?.orgId) {
    return c.json({ error: "Organization context required" }, 403);
  }

  let orgRole = payload.orgRole ?? "member";

  const db = c.env?.DB;
  if (db) {
    const member = await db
      .prepare("SELECT role FROM org_members WHERE org_id = ? AND user_id = ?")
      .bind(payload.orgId, payload.sub!)
      .first();

    if (!member) {
      return c.json({ error: "Not a member of this organization" }, 403);
    }
    orgRole = (member as Record<string, unknown>).role as string;
  }

  c.set("orgId", payload.orgId);
  c.set("orgRole", orgRole);
  c.set("userId", payload.sub!);

  await next();
}
