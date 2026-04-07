import { jwt } from "hono/jwt";
import type { MiddlewareHandler } from "hono";
import type { HarnessConfig } from "@foundry-x/harness-kit";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "./tenant.js";
import { createApiKeyMiddleware } from "./api-key.js";

/**
 * Gate-X 통합 인증 미들웨어
 * 우선순위:
 * 1. public path → 통과
 * 2. Authorization: Bearer <token> → JWT 검증
 * 3. X-API-Key: <key> → API Key 검증
 * 4. 둘 다 없거나 실패 → 401
 */
export function createGateAuthMiddleware(
  config: HarnessConfig,
): MiddlewareHandler<{ Bindings: GateEnv; Variables: TenantVariables }> {
  const publicPaths = config.publicPaths ?? [];
  const apiKeyMiddleware = createApiKeyMiddleware();

  return async (c, next) => {
    const path = c.req.path;

    // 1. public path 통과
    if (publicPaths.some((p) => path.startsWith(p))) {
      return next();
    }

    const authHeader = c.req.header("Authorization");
    const hasBearer =
      authHeader?.startsWith("Bearer ") === true && authHeader.length > 7;
    const hasApiKey = Boolean(c.req.header("X-API-Key"));

    // 2. Bearer 토큰 → JWT 검증
    if (hasBearer) {
      const secret =
        (c.env as Record<string, string>)?.JWT_SECRET ?? "dev-secret";
      const handler = jwt({
        secret,
        alg: (config.jwtAlgorithm ?? "HS256") as "HS256",
      });
      return handler(c, next);
    }

    // 3. X-API-Key → API Key 검증
    if (hasApiKey) {
      try {
        await apiKeyMiddleware(c, async () => {
          // API Key 검증 후 jwtPayload가 설정되었는지 확인
        });
      } catch {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const payload = c.get("jwtPayload");
      if (payload) {
        return next();
      }

      // API Key가 있지만 유효하지 않음
      return c.json({ error: "Unauthorized" }, 401);
    }

    // 4. 인증 정보 없음 → 401
    return c.json({ error: "Unauthorized" }, 401);
  };
}
