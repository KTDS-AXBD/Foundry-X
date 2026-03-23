import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import {
  FeedbackSubmitRequestSchema,
  FeedbackSubmitResponseSchema,
  FeedbackSummaryResponseSchema,
} from "../schemas/feedback.js";
import type { Env } from "../env.js";
import { FeedbackService } from "../services/feedback.js";
import type { JwtPayload } from "../middleware/auth.js";

export const feedbackRoute = new OpenAPIHono<{ Bindings: Env }>();

function getPayload(c: { get: (key: string) => unknown }): JwtPayload {
  return c.get("jwtPayload") as JwtPayload;
}

// ─── POST /api/feedback ───

const submitFeedback = createRoute({
  method: "post",
  path: "/feedback",
  tags: ["Feedback"],
  summary: "NPS 피드백 제출",
  request: {
    body: {
      content: { "application/json": { schema: FeedbackSubmitRequestSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: FeedbackSubmitResponseSchema } },
      description: "피드백 제출 결과",
    },
  },
});

feedbackRoute.openapi(submitFeedback, async (c) => {
  const { npsScore, comment, pagePath, sessionSeconds, feedbackType } = c.req.valid("json");
  const payload = getPayload(c);
  const service = new FeedbackService(c.env.DB);

  const tenantId = payload.orgId ?? "default";
  const result = await service.submit(tenantId, payload.sub, npsScore, comment, {
    pagePath,
    sessionSeconds,
    feedbackType,
  });

  return c.json({ success: true, id: result.id, npsScore: result.npsScore });
});

// ─── GET /api/feedback/summary ───

const getFeedbackSummary = createRoute({
  method: "get",
  path: "/feedback/summary",
  tags: ["Feedback"],
  summary: "NPS 피드백 요약",
  responses: {
    200: {
      content: { "application/json": { schema: FeedbackSummaryResponseSchema } },
      description: "피드백 요약 데이터",
    },
  },
});

feedbackRoute.openapi(getFeedbackSummary, async (c) => {
  const payload = getPayload(c);
  const service = new FeedbackService(c.env.DB);

  const tenantId = payload.orgId ?? "default";
  const summary = await service.getSummary(tenantId);
  return c.json(summary);
});
