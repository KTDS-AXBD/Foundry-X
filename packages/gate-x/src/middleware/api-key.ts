import type { MiddlewareHandler } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "./tenant.js";
import { ApiKeyService } from "../services/api-key-service.js";

/**
 * API Key 인증 미들웨어
 * X-API-Key 헤더를 읽어 검증한다.
 * 성공 시: c.set("jwtPayload", ...) 형식으로 JWT와 동일하게 설정
 * 실패(헤더 없음/유효하지 않음) 시: next() 호출 — 통합 미들웨어에서 401 처리
 */
export function createApiKeyMiddleware(): MiddlewareHandler<{
  Bindings: GateEnv;
  Variables: TenantVariables;
}> {
  return async (c, next) => {
    const apiKey = c.req.header("X-API-Key");
    if (!apiKey) {
      return next();
    }

    const service = new ApiKeyService(c.env.DB);
    const record = await service.verify(apiKey);

    if (!record) {
      return next();
    }

    // JWT payload 형식과 호환되도록 설정
    c.set("jwtPayload", {
      sub: record.id,
      role: record.role,
      orgId: record.orgId,
      orgRole: record.role,
      email: `apikey:${record.keyPrefix}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    } as TenantVariables["jwtPayload"]);

    return next();
  };
}
