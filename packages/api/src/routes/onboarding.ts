import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import {
  OnboardingProgressResponseSchema,
  OnboardingStepCompleteRequestSchema,
  OnboardingStepCompleteResponseSchema,
} from "../schemas/onboarding.js";
import type { Env } from "../env.js";
import { OnboardingProgressService } from "../services/onboarding-progress.js";
import { KpiLogger } from "../services/kpi-logger.js";
import type { JwtPayload } from "../middleware/auth.js";

export const onboardingRoute = new OpenAPIHono<{ Bindings: Env }>();

function getPayload(c: { get: (key: string) => unknown }): JwtPayload {
  return c.get("jwtPayload") as JwtPayload;
}

// ─── GET /api/onboarding/progress ───

const getProgress = createRoute({
  method: "get",
  path: "/onboarding/progress",
  tags: ["Onboarding"],
  summary: "온보딩 진행률 조회",
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingProgressResponseSchema } },
      description: "현재 사용자의 온보딩 진행률",
    },
  },
});

onboardingRoute.openapi(getProgress, async (c) => {
  const payload = getPayload(c);
  const service = new OnboardingProgressService(c.env.DB);

  const tenantId = payload.orgId ?? "default";
  const progress = await service.getProgress(tenantId, payload.sub);
  return c.json(progress);
});

// ─── PATCH /api/onboarding/progress ───

const completeStep = createRoute({
  method: "patch",
  path: "/onboarding/progress",
  tags: ["Onboarding"],
  summary: "온보딩 단계 완료 처리",
  request: {
    body: {
      content: { "application/json": { schema: OnboardingStepCompleteRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: OnboardingStepCompleteResponseSchema } },
      description: "단계 완료 결과",
    },
    400: {
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
      description: "잘못된 stepId",
    },
  },
});

onboardingRoute.openapi(completeStep, async (c) => {
  const { stepId } = c.req.valid("json");
  const payload = getPayload(c);
  const service = new OnboardingProgressService(c.env.DB);

  const tenantId = payload.orgId ?? "default";

  try {
    const result = await service.completeStep(tenantId, payload.sub, stepId);

    // 온보딩 완료 시 KPI 이벤트 기록
    if (result.allComplete) {
      const kpiLogger = new KpiLogger(c.env.DB);
      await kpiLogger.logEvent(tenantId, "page_view", {
        userId: payload.sub,
        metadata: { action: "onboarding_complete" },
      });
    }

    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 400);
  }
});
