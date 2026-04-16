// F552: Dual AI Review service
import type { DualReviewInsert, DualReview, DualReviewStats } from "../types.js";

export class DualReviewService {
  constructor(private db: D1Database) {}

  async insert(data: DualReviewInsert): Promise<{ id: number }> {
    const result = await this.db
      .prepare(
        `INSERT INTO dual_ai_reviews
         (sprint_id, claude_verdict, codex_verdict, codex_json, divergence_score, decision, degraded, degraded_reason, model)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.sprint_id,
        data.claude_verdict,
        data.codex_verdict,
        data.codex_json,
        data.divergence_score,
        data.decision,
        data.degraded ? 1 : 0,
        data.degraded_reason,
        data.model
      )
      .run();

    return { id: Number(result.meta.last_row_id) };
  }

  async list(limit: number = 20): Promise<DualReview[]> {
    const { results } = await this.db
      .prepare(
        `SELECT id, sprint_id, claude_verdict, codex_verdict, codex_json,
                divergence_score, decision, degraded, degraded_reason, model, created_at
         FROM dual_ai_reviews
         ORDER BY id DESC
         LIMIT ?`
      )
      .bind(limit)
      .all();

    return (results as Array<Record<string, unknown>>).map((row) => ({
      id: row.id as number,
      sprint_id: row.sprint_id as number,
      claude_verdict: row.claude_verdict as string | null,
      codex_verdict: row.codex_verdict as string,
      codex_json: row.codex_json as string,
      divergence_score: row.divergence_score as number,
      decision: row.decision as string,
      degraded: row.degraded === 1,
      degraded_reason: row.degraded_reason as string | null,
      model: row.model as string,
      created_at: row.created_at as string,
    }));
  }

  async stats(): Promise<DualReviewStats> {
    const reviews = await this.list(100);
    const total = reviews.length;

    if (total === 0) {
      return {
        total: 0,
        concordance_rate: 0,
        block_rate: 0,
        degraded_rate: 0,
        block_reasons: [],
        recent_reviews: [],
      };
    }

    const concordant = reviews.filter(
      (r) => r.claude_verdict === r.codex_verdict
    ).length;
    const blocked = reviews.filter((r) => r.decision === "BLOCK").length;
    const degraded = reviews.filter((r) => r.degraded).length;

    const blockReasonMap = new Map<string, number>();
    for (const r of reviews) {
      if (r.decision !== "BLOCK") continue;
      try {
        const parsed = JSON.parse(r.codex_json);
        const issues = parsed.code_issues;
        if (Array.isArray(issues)) {
          for (const issue of issues) {
            if (issue.severity === "high" && issue.msg) {
              blockReasonMap.set(
                issue.msg,
                (blockReasonMap.get(issue.msg) ?? 0) + 1
              );
            }
          }
        }
      } catch {
        // ignore malformed JSON
      }
    }

    const block_reasons = Array.from(blockReasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      concordance_rate: Math.round((concordant / total) * 100),
      block_rate: Math.round((blocked / total) * 100),
      degraded_rate: Math.round((degraded / total) * 100),
      block_reasons,
      recent_reviews: reviews.slice(0, 20).map((r) => ({
        sprint_id: r.sprint_id,
        claude_verdict: r.claude_verdict ?? null,
        codex_verdict: r.codex_verdict,
        decision: r.decision,
        divergence_score: r.divergence_score,
        degraded: r.degraded,
        created_at: r.created_at,
      })),
    };
  }
}
