// F552: Dual AI Review routes (Hono sub-app)
// C103 (i) S315: authMiddleware 이전 mount — X-Webhook-Secret 검증으로 POST abuse 방어.
import { Hono } from "hono";
import { DualReviewService } from "../services/dual-review.service.js";
import { DualReviewInsertSchema } from "../schemas.js";
import type { Env } from "../../../env.js";

const app = new Hono<{ Bindings: Env }>();

app.post("/verification/dual-review", async (c) => {
  // C103 (i): autopilot CI 시스템 호출 검증 (WEBHOOK_SECRET 미설정 시 거부)
  const expected = c.env.WEBHOOK_SECRET;
  const provided = c.req.header("x-webhook-secret");
  if (!expected || !provided || expected !== provided) {
    return c.json({ error: "invalid or missing x-webhook-secret" }, 401);
  }

  const body = await c.req.json();
  const parsed = DualReviewInsertSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }

  const svc = new DualReviewService(c.env.DB);
  const result = await svc.insert(parsed.data);
  return c.json(result, 201);
});

app.get("/verification/dual-reviews", async (c) => {
  const limit = Number(c.req.query("limit") || 20);
  const svc = new DualReviewService(c.env.DB);
  const reviews = await svc.list(limit);
  return c.json({ reviews });
});

app.get("/verification/dual-reviews/stats", async (c) => {
  const svc = new DualReviewService(c.env.DB);
  const stats = await svc.stats();
  return c.json(stats);
});

export { app as verificationRoute };
