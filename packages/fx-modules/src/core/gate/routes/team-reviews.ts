/**
 * Sprint 154: F342 TeamReviews Route — Go/Hold/Drop 투표 + 집계
 * Sprint 154+: F349 팀장 최종결정 (POST /ax-bd/team-reviews/:itemId/decide)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { SubmitTeamReviewSchema, TeamDecideSchema } from "../schemas/team-review-schema.js";

export const teamReviewsRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// GET /ax-bd/team-reviews/:itemId — 아이템별 투표 조회
teamReviewsRoute.get("/ax-bd/team-reviews/:itemId", async (c) => {
  const result = await c.env.DB
    .prepare("SELECT * FROM ax_team_reviews WHERE item_id = ? ORDER BY created_at DESC")
    .bind(c.req.param("itemId"))
    .all();
  return c.json({ data: result.results });
});

// POST /ax-bd/team-reviews/:itemId — 투표 제출 (upsert)
teamReviewsRoute.post("/ax-bd/team-reviews/:itemId", async (c) => {
  const body = await c.req.json();
  const parsed = SubmitTeamReviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const itemId = c.req.param("itemId");
  const reviewerId = c.get("userId");
  const reviewerName = "";
  const orgId = c.get("orgId");
  const id = generateId();

  await c.env.DB
    .prepare(
      `INSERT INTO ax_team_reviews (id, org_id, item_id, reviewer_id, reviewer_name, decision, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(item_id, reviewer_id) DO UPDATE SET
         decision = excluded.decision,
         comment = excluded.comment,
         created_at = datetime('now')`,
    )
    .bind(id, orgId, itemId, reviewerId, reviewerName, parsed.data.decision, parsed.data.comment)
    .run();

  return c.json({ message: "Vote submitted" }, 201);
});

// GET /ax-bd/team-reviews/:itemId/summary — 투표 집계
teamReviewsRoute.get("/ax-bd/team-reviews/:itemId/summary", async (c) => {
  const result = await c.env.DB
    .prepare("SELECT decision, COUNT(*) as count FROM ax_team_reviews WHERE item_id = ? GROUP BY decision")
    .bind(c.req.param("itemId"))
    .all<{ decision: string; count: number }>();

  const summary: Record<string, number> = { Go: 0, Hold: 0, Drop: 0 };
  for (const row of result.results) {
    summary[row.decision] = row.count;
  }

  const total = (summary.Go ?? 0) + (summary.Hold ?? 0) + (summary.Drop ?? 0);
  return c.json({ data: { ...summary, total } });
});

// POST /ax-bd/team-reviews/:itemId/decide — 팀장 최종결정
teamReviewsRoute.post("/ax-bd/team-reviews/:itemId/decide", async (c) => {
  const body = await c.req.json();
  const parsed = TeamDecideSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
  }

  const itemId = c.req.param("itemId");
  const orgId = c.get("orgId");
  const { finalDecision, reason } = parsed.data;
  const decidedBy = c.get("userId");
  const decidedAt = new Date().toISOString();

  // ax_discovery_reports 테이블에 최종 결정 기록
  const existing = await c.env.DB
    .prepare("SELECT id FROM ax_discovery_reports WHERE item_id = ?")
    .bind(itemId)
    .first<{ id: string }>();

  if (!existing) {
    // 리포트가 없으면 생성 후 결정 기록
    const id = generateId();
    await c.env.DB
      .prepare(
        `INSERT INTO ax_discovery_reports (id, org_id, item_id, report_json, team_decision, updated_at)
         VALUES (?, ?, ?, '{}', ?, datetime('now'))`,
      )
      .bind(id, orgId, itemId, finalDecision)
      .run();
  } else {
    await c.env.DB
      .prepare(
        `UPDATE ax_discovery_reports
         SET team_decision = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(finalDecision, existing.id)
      .run();
  }

  return c.json({
    data: {
      itemId,
      finalDecision,
      reason,
      decidedBy,
      decidedAt,
    },
  }, 200);
});
