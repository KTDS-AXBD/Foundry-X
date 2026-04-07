import type { Context, Next } from "hono";
import type { GateEnv } from "../env.js";

export interface TenantVariables {
  orgId: string;
  orgRole: string;
  userId: string;
  jwtPayload: Record<string, unknown>;
}

const PUBLIC_PATHS = ["/api/health"];

/** tenantGuard — JWT payload에서 orgId 추출, gate-x 전용 */
export async function tenantGuard(
  c: Context<{ Bindings: GateEnv; Variables: TenantVariables }>,
  next: Next,
) {
  if (PUBLIC_PATHS.some((p) => c.req.path === p)) {
    return next();
  }

  const payload = (c.get("jwtPayload") as unknown) as
    | { sub?: string; orgId?: string; orgRole?: string }
    | undefined;

  if (!payload?.orgId) {
    return c.json({ error: "Organization context required" }, 403);
  }

  c.set("orgId", payload.orgId);
  c.set("orgRole", payload.orgRole ?? "member");
  c.set("userId", payload.sub ?? "");

  return next();
}
