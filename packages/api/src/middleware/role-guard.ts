import type { Context, Next } from "hono";

type OrgRole = "owner" | "admin" | "member" | "viewer";

const ROLE_LEVEL: Record<OrgRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

/**
 * roleGuard — tenantGuard 이후에 사용.
 * 지정한 최소 역할 이상인지 확인하고, 미달 시 403 반환.
 *
 * @example
 * app.patch('/orgs/:orgId', tenantGuard, roleGuard('admin'), handler)
 */
export function roleGuard(minRole: OrgRole) {
  return async (c: Context, next: Next) => {
    const currentRole = (c.get("orgRole") as string) ?? "";
    const required = ROLE_LEVEL[minRole] ?? 0;
    const current = ROLE_LEVEL[currentRole as OrgRole] ?? 0;

    if (current < required) {
      return c.json({ error: `Requires ${minRole} role or higher` }, 403);
    }

    await next();
  };
}
