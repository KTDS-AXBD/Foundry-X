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

// ─── GET /api/onboarding/team-summary ───

const teamSummarySchema = z.object({
  totalMembers: z.number(),
  completedMembers: z.number(),
  averageProgress: z.number(),
  members: z.array(z.object({
    userId: z.string(),
    name: z.string(),
    stepsCompleted: z.number(),
    totalSteps: z.number(),
    progressPercent: z.number(),
    lastActivity: z.string().nullable(),
  })),
}).openapi("OnboardingTeamSummary");

const getTeamSummary = createRoute({
  method: "get",
  path: "/onboarding/team-summary",
  tags: ["Onboarding"],
  summary: "팀 전체 온보딩 진행률 요약",
  responses: {
    200: {
      content: { "application/json": { schema: teamSummarySchema } },
      description: "팀원별 온보딩 진행 현황",
    },
  },
});

onboardingRoute.openapi(getTeamSummary, async (c) => {
  const payload = getPayload(c);
  const tenantId = payload.orgId ?? "default";
  const db = c.env.DB;

  // 팀원 목록
  const { results: membersRaw } = await db.prepare(
    `SELECT om.user_id, u.name
     FROM org_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = ?`
  ).bind(tenantId).all<{ user_id: string; name: string }>();

  const TOTAL_STEPS = 5; // create-account, connect-repo, run-status, run-sync, review-agent

  const members = await Promise.all(
    (membersRaw ?? []).map(async (m) => {
      const { results: steps } = await db.prepare(
        `SELECT step_id, completed, completed_at FROM onboarding_progress
         WHERE tenant_id = ? AND user_id = ?`
      ).bind(tenantId, m.user_id).all<{ step_id: string; completed: number; completed_at: string | null }>();

      const stepsCompleted = (steps ?? []).filter(s => s.completed === 1).length;
      const completedDates = (steps ?? []).filter(s => s.completed_at).map(s => s.completed_at as string);
      const lastActivity: string | null = completedDates.length > 0
        ? completedDates.sort().reverse()[0] ?? null
        : null;

      return {
        userId: m.user_id,
        name: m.name,
        stepsCompleted,
        totalSteps: TOTAL_STEPS,
        progressPercent: Math.round((stepsCompleted / TOTAL_STEPS) * 100),
        lastActivity,
      };
    })
  );

  const completedMembers = members.filter(m => m.progressPercent === 100).length;
  const averageProgress = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + m.progressPercent, 0) / members.length)
    : 0;

  return c.json({
    totalMembers: members.length,
    completedMembers,
    averageProgress,
    members: members.sort((a, b) => b.progressPercent - a.progressPercent),
  });
});
