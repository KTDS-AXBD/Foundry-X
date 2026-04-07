import type { MiddlewareHandler } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "./tenant.js";
import { usageTrackingService } from "../modules/billing/services/usage-tracking.service.js";

// 사용량 추적을 건너뛸 경로 (과금 조회 자체는 카운트 안 함)
const SKIP_PATHS = ["/api/billing/", "/api/health"];

export const usageLimiter: MiddlewareHandler<{
  Bindings: Env;
  Variables: TenantVariables;
}> = async (c, next) => {
  const orgId = c.get("orgId");

  // orgId 없으면 tenantGuard 전 호출 — 스킵
  if (!orgId) {
    return next();
  }

  // 제외 경로 스킵
  if (SKIP_PATHS.some((p) => c.req.path.startsWith(p))) {
    return next();
  }

  const db = c.env?.DB;
  if (!db) {
    // DB 없으면 (테스트 환경 등) 추적 스킵
    return next();
  }

  // 한도 초과 체크
  const over = await usageTrackingService.isOverLimit(db, orgId);
  if (over) {
    const summary = await usageTrackingService.getSummary(db, orgId);
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1, 1);
    resetDate.setHours(0, 0, 0, 0);

    c.header("X-RateLimit-Limit", String(summary.limit));
    c.header("X-RateLimit-Remaining", "0");
    c.header("X-RateLimit-Reset", resetDate.toISOString());

    return c.json(
      {
        error: "Monthly API limit exceeded",
        planId: summary.planId,
        limit: summary.limit,
        used: summary.used,
        upgradeHint: "PUT /api/billing/plan to upgrade",
      },
      429
    );
  }

  // 사용량 기록 (비동기, 응답 지연 없음)
  await usageTrackingService.recordCall(db, orgId);

  // 응답 헤더 추가 (summary 재조회 없이 낙관적 계산)
  const summary = await usageTrackingService.getSummary(db, orgId);
  const resetDate = new Date();
  resetDate.setMonth(resetDate.getMonth() + 1, 1);
  resetDate.setHours(0, 0, 0, 0);

  c.header("X-RateLimit-Limit", summary.limit === -1 ? "unlimited" : String(summary.limit));
  c.header(
    "X-RateLimit-Remaining",
    summary.remaining === -1 ? "unlimited" : String(summary.remaining)
  );
  c.header("X-RateLimit-Reset", resetDate.toISOString());

  return next();
};
