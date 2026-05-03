// F530 Meta Layer (L4) — DiagnosticCollector TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import { DiagnosticCollector } from "../../src/services/diagnostic-collector.js";
import { createMockD1 } from "../helpers/mock-d1.js";
import type { D1Database } from "@cloudflare/workers-types";

const DDL = `
CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id                TEXT PRIMARY KEY,
  session_id        TEXT NOT NULL,
  agent_id          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'running',
  input_tokens      INTEGER DEFAULT 0,
  output_tokens     INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  rounds            INTEGER DEFAULT 0,
  stop_reason       TEXT,
  duration_ms       INTEGER,
  error_msg         TEXT,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const INSERT_SQL = `
  INSERT INTO agent_run_metrics
  (id, session_id, agent_id, status, rounds, stop_reason, input_tokens, output_tokens, started_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`;

describe("F530 DiagnosticCollector", () => {
  let db: D1Database;
  let collector: DiagnosticCollector;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    collector = new DiagnosticCollector(db);
  });

  it("D1 데이터 없을 때 기본값 DiagnosticReport를 반환한다 (오류 아님)", async () => {
    const report = await collector.collect("sess-empty", "agent-1");

    expect(report.sessionId).toBe("sess-empty");
    expect(report.agentId).toBe("agent-1");
    expect(report.scores).toHaveLength(6);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.collectedAt).toBeTruthy();
  });

  it("6축 axes 이름이 모두 포함된다", async () => {
    const report = await collector.collect("sess-1", "agent-1");
    const axes = report.scores.map((s) => s.axis);

    expect(axes).toContain("ToolEffectiveness");
    expect(axes).toContain("Memory");
    expect(axes).toContain("Planning");
    expect(axes).toContain("Verification");
    expect(axes).toContain("Cost");
    expect(axes).toContain("Convergence");
  });

  it("rounds=1, stop_reason=end_turn인 경우 Convergence score가 높다 (>=80)", async () => {
    await db.prepare(INSERT_SQL)
      .bind("m1", "sess-conv", "agent-a", "completed", 1, "end_turn", 100, 80)
      .run();

    const report = await collector.collect("sess-conv", "agent-a");
    const convergence = report.scores.find((s) => s.axis === "Convergence");

    expect(convergence).toBeDefined();
    expect(convergence!.score).toBeGreaterThanOrEqual(80);
  });

  it("inputTokens/rounds가 높으면 Memory 점수가 낮다 (<50)", async () => {
    // 2000 tokens / 2 rounds = 1000 tokens/round (기준 500 초과) → Memory 점수 낮음
    await db.prepare(INSERT_SQL)
      .bind("m2", "sess-mem", "agent-b", "completed", 2, "end_turn", 2000, 400)
      .run();

    const report = await collector.collect("sess-mem", "agent-b");
    const memory = report.scores.find((s) => s.axis === "Memory");

    expect(memory).toBeDefined();
    expect(memory!.score).toBeLessThan(50);
  });

  it("overallScore는 6축 점수의 평균이다", async () => {
    const report = await collector.collect("sess-avg", "agent-c");

    const sum = report.scores.reduce((acc, s) => acc + s.score, 0);
    const expected = Math.round(sum / report.scores.length);

    expect(report.overallScore).toBe(expected);
  });

  it("각 축 score는 0~100 범위 내에 있다", async () => {
    await db.prepare(INSERT_SQL)
      .bind("m3", "sess-range", "agent-d", "completed", 5, "max_rounds", 5000, 1000)
      .run();

    const report = await collector.collect("sess-range", "agent-d");

    for (const score of report.scores) {
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
    }
  });

  // F556: Convergence 재정의 — ToolEffectiveness와 구별되는 독립 신호
  it("F556: Convergence.rawValue는 avgRounds 값이다 (ratio 아님)", async () => {
    // rounds=5, end_turn → TE.rawValue=1.0(ratio), Convergence.rawValue=5(rounds)
    await db.prepare(INSERT_SQL)
      .bind("m4", "sess-conv-new", "agent-e", "completed", 5, "end_turn", 100, 80)
      .run();

    const report = await collector.collect("sess-conv-new", "agent-e");
    const te = report.scores.find((s) => s.axis === "ToolEffectiveness")!;
    const conv = report.scores.find((s) => s.axis === "Convergence")!;

    expect(te.rawValue).toBe(1);       // end_turn ratio = 1.0
    expect(conv.rawValue).toBe(5);     // avgRounds = 5
    expect(te.rawValue).not.toBe(conv.rawValue); // 서로 다른 rawValue
  });

  it("F556: Convergence.unit은 'rounds'이다", async () => {
    await db.prepare(INSERT_SQL)
      .bind("m5", "sess-conv-unit", "agent-f", "completed", 3, "end_turn", 100, 80)
      .run();

    const report = await collector.collect("sess-conv-unit", "agent-f");
    const conv = report.scores.find((s) => s.axis === "Convergence")!;

    expect(conv.unit).toBe("rounds");
  });

  it("F556: Convergence.score — 라운드 수가 많을수록 감점된다", async () => {
    // rounds=1: 효율 최고, rounds=10: 효율 낮음
    await db.prepare(INSERT_SQL)
      .bind("m6", "sess-conv-eff1", "agent-g", "completed", 1, "end_turn", 100, 80)
      .run();
    await db.prepare(INSERT_SQL)
      .bind("m7", "sess-conv-eff10", "agent-g", "completed", 10, "end_turn", 100, 80)
      .run();

    const rep1 = await collector.collect("sess-conv-eff1", "agent-g");
    const rep10 = await collector.collect("sess-conv-eff10", "agent-g");

    const conv1 = rep1.scores.find((s) => s.axis === "Convergence")!;
    const conv10 = rep10.scores.find((s) => s.axis === "Convergence")!;

    expect(conv1.score).toBeGreaterThan(conv10.score);
  });
});
