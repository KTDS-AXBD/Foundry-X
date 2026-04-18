/**
 * F541: fx-offering JWT 인증 미들웨어
 * packages/api/src/middleware/auth.ts 기반 — offering 도메인 전용
 */
import { jwt } from "hono/jwt";
import type { MiddlewareHandler } from "hono";
import type { OfferingEnv } from "../env.js";

const PUBLIC_PATHS = ["/api/offering/health"];

export const authMiddleware: MiddlewareHandler<{ Bindings: OfferingEnv }> = async (c, next) => {
  const path = c.req.path;
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    return next();
  }
  const secret = c.env?.JWT_SECRET ?? "dev-secret";
  const handler = jwt({ secret, alg: "HS256" });
  return handler(c, next);
};
