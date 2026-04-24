import type { MiddlewareHandler } from "hono";

export type Role = "admin" | "member" | "viewer";

const ROLE_LEVEL: Record<Role, number> = {
  admin: 3,
  member: 2,
  viewer: 1,
};

export function rbac(minRole: Role): MiddlewareHandler {
  return async (c, next) => {
    const payload = c.get("jwtPayload") as { role?: string } | undefined;
    const userRole = payload?.role as Role | undefined;

    if (!userRole || ROLE_LEVEL[userRole] < ROLE_LEVEL[minRole]) {
      return c.json({ error: "Forbidden" }, 403);
    }

    return next();
  };
}
