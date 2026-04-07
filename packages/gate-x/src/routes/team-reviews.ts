import { Hono } from "hono";
import type { GateEnv } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { SubmitTeamReviewSchema, TeamDecideSchema } from "../schemas/team-review-schema.js";

export const teamReviewsRoute = new Hono<{ Bindings: GateEnv; Variables: TenantVariables }>();

teamReviewsRoute.get("/ax-bd/team-reviews/:itemId", async (c) => {
  const result = await c.env.DB.prepare("SELECT * FROM ax_team_reviews WHERE biz_item_id = ? ORDER BY created_at DESC").bind(c.req.param("itemId")).all();
  return c.json({ data: result.results });
});

teamReviewsRoute.get("/ax-bd/team-reviews/:itemId/summary", async (c) => {
  const result = await c.env.DB.prepare("SELECT decision, COUNT(*) as count FROM ax_team_reviews WHERE biz_item_id = ? GROUP BY decision").bind(c.req.param("itemId")).all<{ decision: string; count: number }>();
  const summary: Record<string, number> = { Go: 0, Hold: 0, Drop: 0 };
  for (const row of result.results) { summary[row.decision] = row.count; }
  const total = (summary["Go"] ?? 0) + (summary["Hold"] ?? 0) + (summary["Drop"] ?? 0);
  return c.json({ data: { ...summary, total } });
});

teamReviewsRoute.post("/ax-bd/team-reviews/:itemId", async (c) => {
  const body = await c.req.json();
  const parsed = SubmitTeamReviewSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const id = crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare(`INSERT INTO ax_team_reviews (id, org_id, biz_item_id, reviewer_id, decision, comment) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(org_id, biz_item_id, reviewer_id) DO UPDATE SET decision = excluded.decision, comment = excluded.comment, created_at = datetime('now')`)
    .bind(id, c.get("orgId"), c.req.param("itemId"), c.get("userId"), parsed.data.decision, parsed.data.comment)
    .run();
  return c.json({ message: "Vote submitted" }, 201);
});

teamReviewsRoute.post("/ax-bd/team-reviews/:itemId/decide", async (c) => {
  const body = await c.req.json();
  const parsed = TeamDecideSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  const { finalDecision, reason } = parsed.data;
  return c.json({ data: { itemId: c.req.param("itemId"), finalDecision, reason, decidedBy: c.get("userId"), decidedAt: new Date().toISOString() } });
});
