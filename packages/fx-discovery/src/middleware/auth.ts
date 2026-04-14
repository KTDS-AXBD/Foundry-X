/**
 * F538: fx-discovery JWT 인증 미들웨어
 * packages/api/src/middleware/auth.ts 기반 — discovery 도메인 전용 적용
 */
import { jwt } from "hono/jwt";
import type { MiddlewareHandler } from "hono";
import type { DiscoveryEnv } from "../env.js";

// discovery health endpoint는 인증 불필요
const PUBLIC_PATHS = ["/api/discovery/health"];

export const authMiddleware: MiddlewareHandler<{ Bindings: DiscoveryEnv }> = async (c, next) => {
  const path = c.req.path;
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }
  const secret = c.env?.JWT_SECRET ?? "dev-secret";
  const handler = jwt({ secret, alg: "HS256" });
  return handler(c, next);
};
