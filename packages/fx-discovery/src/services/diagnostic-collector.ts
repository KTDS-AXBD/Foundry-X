// F582: DiagnosticCollector — fx-discovery 측 agent_run_metrics 기록 (GAP-4 회복)
// foundry-x-db `agent_run_metrics` 테이블 공유 (DB binding)

import type { D1Database } from "@cloudflare/workers-types";

export class DiagnosticCollector {
  constructor(private readonly db: D1Database) {}

  async record(
    sessionId: string,
    agentId: string,
    status: "success" | "failed",
    tokensUsed: number,
    durationMs: number,
  ): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const dbStatus = status === "success" ? "completed" : "failed";
    const stopReason = status === "success" ? "end_turn" : "error";

    await this.db
      .prepare(
        `INSERT INTO agent_run_metrics
           (id, session_id, agent_id, status, input_tokens, output_tokens,
            cache_read_tokens, rounds, stop_reason, duration_ms, error_msg,
            started_at, finished_at, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, 1, ?, ?, NULL, ?, ?, ?)`,
      )
      .bind(id, sessionId, agentId, dbStatus, tokensUsed, stopReason, durationMs, now, now, now)
      .run();
  }
}
