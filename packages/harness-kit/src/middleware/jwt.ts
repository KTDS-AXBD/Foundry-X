import { jwt } from "hono/jwt";
import type { MiddlewareHandler } from "hono";
import type { HarnessConfig } from "../types.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: "admin" | "member" | "viewer";
  orgId?: string;
  orgRole?: "owner" | "admin" | "member" | "viewer";
  services?: Array<{ id: string; role: string }>;
  iat: number;
  exp: number;
  jti?: string;
}

export function createAuthMiddleware(config: HarnessConfig): MiddlewareHandler {
  const publicPaths = config.publicPaths ?? [];
  return async (c, next) => {
    const path = c.req.path;
    if (publicPaths.some((p) => path.startsWith(p))) {
      return next();
    }
    const secret =
      (c.env as Record<string, string>)?.JWT_SECRET ?? "dev-secret";
    const handler = jwt({
      secret,
      alg: (config.jwtAlgorithm ?? "HS256") as "HS256",
    });
    return handler(c, next);
  };
}
