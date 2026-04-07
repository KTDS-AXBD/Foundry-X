// F360: O-G-D Generic Runner (Sprint 163)
// 도메인 독립 O-G-D 루프 실행기 — 어댑터 호출 + 수렴 판정 + D1 기록

import type { OGDRequest, OGDResult, OGDRunRound } from "@foundry-x/shared";
import { OGD_DEFAULT_MAX_ROUNDS, OGD_DEFAULT_MIN_SCORE } from "@foundry-x/shared";
import { OgdDomainRegistry } from "./ogd-domain-registry.js";

export class OgdGenericRunner {
  constructor(
    private registry: OgdDomainRegistry,
    private db: D1Database,
  ) {}

  async run(request: OGDRequest): Promise<OGDResult> {
    const adapter = this.registry.get(request.domain);
    if (!adapter) {
      throw new OgdDomainNotFoundError(request.domain);
    }

    const maxRounds = request.maxRounds ?? OGD_DEFAULT_MAX_ROUNDS;
    const minScore = request.minScore ?? OGD_DEFAULT_MIN_SCORE;
    const rubric = request.rubric ?? adapter.getDefaultRubric();
    const runId = crypto.randomUUID();

    // ogd_runs INSERT
    await this.db
      .prepare(
        `INSERT INTO ogd_runs (id, tenant_id, domain, status, input_summary)
         VALUES (?, ?, ?, 'running', ?)`,
      )
      .bind(
        runId,
        request.tenantId,
        request.domain,
        truncate(JSON.stringify(request.input), 500),
      )
      .run();

    const rounds: OGDRunRound[] = [];
    let lastOutput: unknown = null;
    let bestScore = 0;
    let converged = false;
    let previousFeedback: string | undefined;

    for (let round = 1; round <= maxRounds; round++) {
      const startMs = Date.now();

      try {
        // Generate
        const genResult = await adapter.generate(request.input, previousFeedback);
        lastOutput = genResult.output;

        // Discriminate
        const evalResult = await adapter.discriminate(lastOutput, rubric);
        const durationMs = Date.now() - startMs;

        const roundResult: OGDRunRound = {
          round,
          output: lastOutput,
          score: evalResult.score,
          feedback: evalResult.feedback,
          passed: evalResult.pass,
          durationMs,
        };
        rounds.push(roundResult);

        // Persist round
        await this.db
          .prepare(
            `INSERT INTO ogd_run_rounds (id, run_id, round_number, generator_output, quality_score, feedback, passed, duration_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            runId,
            round,
            truncate(JSON.stringify(lastOutput), 5000),
            evalResult.score,
            evalResult.feedback,
            evalResult.pass ? 1 : 0,
            durationMs,
          )
          .run();

        if (evalResult.score > bestScore) {
          bestScore = evalResult.score;
        }

        if (evalResult.score >= minScore) {
          converged = true;
          break;
        }

        previousFeedback = evalResult.feedback;
      } catch (err) {
        const durationMs = Date.now() - startMs;
        const errorMsg = err instanceof Error ? err.message : String(err);

        rounds.push({
          round,
          output: null,
          score: 0,
          feedback: `Error: ${errorMsg}`,
          passed: false,
          durationMs,
        });

        // Update run as failed
        await this.db
          .prepare(
            `UPDATE ogd_runs SET status = 'failed', error_message = ?, total_rounds = ?, best_score = ?, updated_at = datetime('now')
             WHERE id = ?`,
          )
          .bind(errorMsg, round, bestScore, runId)
          .run();

        return {
          runId,
          domain: request.domain,
          output: lastOutput,
          score: bestScore,
          iterations: round,
          converged: false,
          rounds,
        };
      }
    }

    // Update run final status
    const finalStatus = converged ? "passed" : "max_rounds";
    await this.db
      .prepare(
        `UPDATE ogd_runs SET status = ?, total_rounds = ?, best_score = ?, converged = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(finalStatus, rounds.length, bestScore, converged ? 1 : 0, runId)
      .run();

    return {
      runId,
      domain: request.domain,
      output: lastOutput,
      score: bestScore,
      iterations: rounds.length,
      converged,
      rounds,
    };
  }

  async getRunHistory(
    tenantId: string,
    limit = 20,
  ): Promise<Array<{ runId: string; domain: string; status: string; bestScore: number | null; totalRounds: number; createdAt: string }>> {
    const result = await this.db
      .prepare(
        `SELECT id, domain, status, best_score, total_rounds, created_at
         FROM ogd_runs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(tenantId, limit)
      .all();

    return (result.results ?? []).map((row: Record<string, unknown>) => ({
      runId: row.id as string,
      domain: row.domain as string,
      status: row.status as string,
      bestScore: row.best_score as number | null,
      totalRounds: row.total_rounds as number,
      createdAt: row.created_at as string,
    }));
  }

  async getRunById(
    runId: string,
    tenantId: string,
  ): Promise<OGDResult | null> {
    const run = await this.db
      .prepare(`SELECT * FROM ogd_runs WHERE id = ? AND tenant_id = ?`)
      .bind(runId, tenantId)
      .first();

    if (!run) return null;

    const roundsResult = await this.db
      .prepare(
        `SELECT round_number, generator_output, quality_score, feedback, passed, duration_ms
         FROM ogd_run_rounds WHERE run_id = ? ORDER BY round_number`,
      )
      .bind(runId)
      .all();

    const rounds: OGDRunRound[] = (roundsResult.results ?? []).map(
      (r: Record<string, unknown>) => ({
        round: r.round_number as number,
        output: parseJsonSafe(r.generator_output as string),
        score: (r.quality_score as number) ?? 0,
        feedback: (r.feedback as string) ?? "",
        passed: Boolean(r.passed),
        durationMs: (r.duration_ms as number) ?? 0,
      }),
    );

    return {
      runId: run.id as string,
      domain: run.domain as string,
      output: rounds.length > 0 ? rounds[rounds.length - 1]!.output : null,
      score: (run.best_score as number) ?? 0,
      iterations: run.total_rounds as number,
      converged: Boolean(run.converged),
      rounds,
    };
  }
}

export class OgdDomainNotFoundError extends Error {
  constructor(domain: string) {
    super(`O-G-D domain not found: ${domain}`);
    this.name = "OgdDomainNotFoundError";
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function parseJsonSafe(s: string | null): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
