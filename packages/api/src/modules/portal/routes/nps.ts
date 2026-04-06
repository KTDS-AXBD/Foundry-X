import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import {
  NpsSurveyCheckResponseSchema,
  NpsDismissRequestSchema,
  NpsOrgSummaryResponseSchema,
} from "../schemas/nps.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import type { JwtPayload } from "../../../middleware/auth.js";
import { NpsService } from "../services/nps-service.js";
import { roleGuard } from "../../../middleware/role-guard.js";
import { ErrorSchema } from "../../../schemas/common.js";

export const npsRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

function getPayload(c: { get: (key: string) => unknown }): JwtPayload {
  return c.get("jwtPayload") as JwtPayload;
}

// ─── GET /nps/check ───

const checkSurvey = createRoute({
  method: "get",
  path: "/nps/check",
  tags: ["NPS"],
  summary: "NPS 서베이 표시 여부 확인",
  responses: {
    200: {
      content: { "application/json": { schema: NpsSurveyCheckResponseSchema } },
      description: "서베이 표시 여부",
    },
  },
});

npsRoute.openapi(checkSurvey, async (c) => {
  const payload = getPayload(c);
  const orgId = c.get("orgId");
  const service = new NpsService(c.env.DB);

  const result = await service.checkEligibility(orgId, payload.sub);
  return c.json(result);
});

// ─── POST /nps/dismiss ───

const dismissSurvey = createRoute({
  method: "post",
  path: "/nps/dismiss",
  tags: ["NPS"],
  summary: "NPS 서베이 닫기",
  request: {
    body: {
      content: { "application/json": { schema: NpsDismissRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: z.object({ success: z.boolean() }).openapi("NpsDismissResponse") } },
      description: "닫기 결과",
    },
  },
});

npsRoute.openapi(dismissSurvey, async (c) => {
  const { surveyId } = c.req.valid("json");
  const service = new NpsService(c.env.DB);

  await service.dismissSurvey(surveyId);
  return c.json({ success: true });
});

// ─── GET /orgs/:orgId/nps/summary ───

const getOrgNpsSummary = createRoute({
  method: "get",
  path: "/orgs/{orgId}/nps/summary",
  tags: ["NPS"],
  summary: "팀 NPS 집계 (admin+)",
  request: {
    params: z.object({ orgId: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: NpsOrgSummaryResponseSchema } },
      description: "팀 NPS 집계",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "권한 없음",
    },
  },
  middleware: [roleGuard("admin")] as any,
});

npsRoute.openapi(getOrgNpsSummary, async (c) => {
  const orgId = c.get("orgId");
  const service = new NpsService(c.env.DB);

  const summary = await service.getOrgSummary(orgId);
  return c.json(summary);
});
