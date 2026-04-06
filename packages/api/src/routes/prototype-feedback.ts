// ─── F356: Prototype Feedback Routes (Sprint 160) ───

import { Hono } from "hono";
import { CreateFeedbackSchema } from "../schemas/prototype-feedback-schema.js";
import { PrototypeFeedbackService } from "../services/prototype-feedback-service.js";
import { SlackNotificationService } from "../modules/portal/services/slack-notification-service.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

export const prototypeFeedbackRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /prototype-jobs/:id/feedback — 피드백 저장 + 재생성 트리거
prototypeFeedbackRoute.post("/prototype-jobs/:id/feedback", async (c) => {
  const orgId = c.get("orgId");
  const jobId = c.req.param("id");
  const raw = await c.req.json();
  const parsed = CreateFeedbackSchema.safeParse(raw);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const svc = new PrototypeFeedbackService(c.env.DB);

  try {
    const feedback = await svc.create(orgId, jobId, {
      category: parsed.data.category,
      content: parsed.data.content,
    });

    // Slack 알림 (graceful — 실패해도 응답에 영향 없음)
    const slack = new SlackNotificationService(
      (c.env as unknown as Record<string, string>).SLACK_WEBHOOK_URL,
    );
    const job = await c.env.DB
      .prepare("SELECT prd_title FROM prototype_jobs WHERE id = ?")
      .bind(jobId)
      .first<{ prd_title: string }>();

    await slack.notify({
      type: "feedback_received",
      jobId,
      jobTitle: job?.prd_title ?? "Unknown",
      detail: `Category: ${parsed.data.category}\n${parsed.data.content.slice(0, 200)}`,
    });

    return c.json({ feedback, jobStatus: "feedback_pending" }, 201);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("not found")) return c.json({ error: msg }, 404);
    return c.json({ error: msg }, 500);
  }
});

// GET /prototype-jobs/:id/feedback — 피드백 목록
prototypeFeedbackRoute.get("/prototype-jobs/:id/feedback", async (c) => {
  const orgId = c.get("orgId");
  const jobId = c.req.param("id");
  const svc = new PrototypeFeedbackService(c.env.DB);
  const items = await svc.listByJob(orgId, jobId);
  return c.json({ items });
});
