import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import {
  BizPersonaEvaluator,
  EvaluationError,
  savePrdPersonaEvaluations,
  getPrdPersonaEvaluations,
} from "../services/biz-persona-evaluator.js";
import { buildPrdEvaluationPrompt, BIZ_PERSONAS } from "../services/biz-persona-prompts.js";
import type { AgentRunner } from "../services/agent-runner.js";
import type { AgentExecutionResult } from "../services/execution-types.js";
import type { BizItem } from "../services/biz-persona-prompts.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    criteria_snapshot TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS prd_persona_evaluations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prd_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    persona_id TEXT NOT NULL,
    persona_name TEXT NOT NULL,
    business_viability INTEGER NOT NULL,
    strategic_fit INTEGER NOT NULL,
    customer_value INTEGER NOT NULL,
    tech_market INTEGER NOT NULL,
    execution INTEGER NOT NULL,
    financial_feasibility INTEGER NOT NULL,
    competitive_diff INTEGER NOT NULL,
    scalability INTEGER NOT NULL,
    summary TEXT NOT NULL,
    concerns TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    org_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS prd_persona_verdicts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prd_id TEXT NOT NULL,
    verdict TEXT NOT NULL,
    avg_score REAL NOT NULL,
    total_concerns INTEGER NOT NULL,
    warnings TEXT NOT NULL,
    evaluation_count INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const SCORE_JSON = JSON.stringify({
  businessViability: 7,
  strategicFit: 8,
  customerValue: 7,
  techMarket: 6,
  execution: 7,
  financialFeasibility: 6,
  competitiveDiff: 8,
  scalability: 7,
  summary: "사업성 양호",
  concerns: ["시장 진입 장벽"],
});

function mockRunner(analysis: string, status: "success" | "failed" = "success"): AgentRunner {
  return {
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status,
      output: { analysis },
      tokensUsed: 100,
      model: "mock",
      duration: 500,
    } satisfies AgentExecutionResult),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

function mockRunnerPartial(successCount: number): AgentRunner {
  let callCount = 0;
  return {
    type: "mock",
    execute: vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= successCount) {
        return Promise.resolve({
          status: "success",
          output: { analysis: SCORE_JSON },
          tokensUsed: 100,
          model: "mock",
          duration: 500,
        } satisfies AgentExecutionResult);
      }
      return Promise.resolve({
        status: "failed",
        output: { analysis: "" },
        tokensUsed: 0,
        model: "mock",
        duration: 0,
      } satisfies AgentExecutionResult);
    }),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

const ITEM: BizItem = {
  id: "item-1",
  title: "AI 기반 보안 솔루션",
  description: "엔터프라이즈 AI 보안",
  source: "field",
  status: "draft",
  orgId: "org_test",
  createdBy: "test-user",
};

const PRD_CONTENT = "# PRD — AI 기반 보안 솔루션\n\n## 1. 요약\nAI 보안 솔루션 PRD 내용";

let db: D1Database;

describe("BizPersonaEvaluator PRD 모드 (F187)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  it("evaluatePrd — 8개 모두 성공 → verdict/avgScore/scores 검증", async () => {
    const runner = mockRunner(SCORE_JSON);
    const evaluator = new BizPersonaEvaluator(runner, db);

    const result = await evaluator.evaluatePrd(ITEM, PRD_CONTENT);

    expect(result.scores).toHaveLength(8);
    // avgScore ≈ 7.0 but totalConcerns = 8 (1 per persona) → triggers red (≥6 concerns)
    expect(result.verdict).toBe("red");
    expect(result.avgScore).toBeGreaterThan(0);
    expect(result.totalConcerns).toBe(8); // 1 concern × 8 personas
    expect(result.warnings).toEqual([]);
    expect(runner.execute).toHaveBeenCalledTimes(8);

    // taskId에 prd-eval 접두사 확인
    const firstCall = (runner.execute as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(firstCall.taskId).toContain("prd-eval-");
  });

  it("evaluatePrd — 5개 성공 → 최소 조건 충족", async () => {
    const runner = mockRunnerPartial(5);
    const evaluator = new BizPersonaEvaluator(runner, db);

    const result = await evaluator.evaluatePrd(ITEM, PRD_CONTENT);

    expect(result.scores).toHaveLength(5);
    expect(["green", "keep", "red"]).toContain(result.verdict);
  });

  it("evaluatePrd — 4개만 성공 → INSUFFICIENT_EVALUATIONS 에러", async () => {
    const runner = mockRunnerPartial(4);
    const evaluator = new BizPersonaEvaluator(runner, db);

    await expect(evaluator.evaluatePrd(ITEM, PRD_CONTENT)).rejects.toThrow(EvaluationError);
    try {
      await evaluator.evaluatePrd(ITEM, PRD_CONTENT);
    } catch (e) {
      expect((e as EvaluationError).code).toBe("INSUFFICIENT_EVALUATIONS");
    }
  });
});

describe("buildPrdEvaluationPrompt (F187)", () => {
  it("PRD 내용이 프롬프트에 포함", () => {
    const persona = BIZ_PERSONAS[0]!;
    const prompt = buildPrdEvaluationPrompt(persona, ITEM, PRD_CONTENT);

    expect(prompt).toContain(persona.systemPrompt);
    expect(prompt).toContain(ITEM.title);
    expect(prompt).toContain(PRD_CONTENT);
    expect(prompt).toContain("businessViability");
  });

  it("6000자 초과 시 트림", () => {
    const persona = BIZ_PERSONAS[0]!;
    const longPrd = "A".repeat(7000);
    const prompt = buildPrdEvaluationPrompt(persona, ITEM, longPrd);

    expect(prompt).toContain("[...중략...]");
    expect(prompt).not.toContain("A".repeat(7000));
  });

  it("6000자 이하는 트림 없음", () => {
    const persona = BIZ_PERSONAS[0]!;
    const shortPrd = "B".repeat(5000);
    const prompt = buildPrdEvaluationPrompt(persona, ITEM, shortPrd);

    expect(prompt).not.toContain("[...중략...]");
    expect(prompt).toContain("B".repeat(5000));
  });
});

describe("savePrdPersonaEvaluations (F187)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  it("DB INSERT — evaluations + verdict 저장", async () => {
    const result = {
      verdict: "green" as const,
      avgScore: 7.0,
      totalConcerns: 2,
      scores: [
        {
          personaId: "strategy",
          personaName: "전략기획팀장",
          businessViability: 7, strategicFit: 8, customerValue: 7, techMarket: 6,
          execution: 7, financialFeasibility: 6, competitiveDiff: 8, scalability: 7,
          summary: "양호", concerns: ["리스크"],
        },
      ],
      warnings: [],
    };

    const verdictId = await savePrdPersonaEvaluations(db, "prd-1", "item-1", "org_test", result);
    expect(verdictId).toBeTruthy();

    // Verify rows
    const { results: evals } = await db.prepare("SELECT * FROM prd_persona_evaluations").all();
    expect(evals).toHaveLength(1);
    expect((evals[0] as Record<string, unknown>).persona_id).toBe("strategy");
    expect((evals[0] as Record<string, unknown>).prd_id).toBe("prd-1");

    const { results: verdicts } = await db.prepare("SELECT * FROM prd_persona_verdicts").all();
    expect(verdicts).toHaveLength(1);
    expect((verdicts[0] as Record<string, unknown>).verdict).toBe("green");
    expect((verdicts[0] as Record<string, unknown>).evaluation_count).toBe(1);
  });
});

describe("getPrdPersonaEvaluations (F187)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  it("저장 후 조회 → evaluations + verdict 반환", async () => {
    const result = {
      verdict: "keep" as const,
      avgScore: 6.5,
      totalConcerns: 3,
      scores: [
        {
          personaId: "strategy",
          personaName: "전략기획팀장",
          businessViability: 7, strategicFit: 6, customerValue: 7, techMarket: 6,
          execution: 6, financialFeasibility: 6, competitiveDiff: 7, scalability: 6,
          summary: "보통", concerns: ["리스크1", "리스크2"],
        },
        {
          personaId: "sales",
          personaName: "영업총괄부장",
          businessViability: 6, strategicFit: 7, customerValue: 6, techMarket: 5,
          execution: 6, financialFeasibility: 5, competitiveDiff: 6, scalability: 6,
          summary: "개선 필요", concerns: ["영업난이도"],
        },
      ],
      warnings: ["전략+재무 주의"],
    };

    await savePrdPersonaEvaluations(db, "prd-1", "item-1", "org_test", result);

    const retrieved = await getPrdPersonaEvaluations(db, "prd-1");

    expect(retrieved.evaluations).toHaveLength(2);
    expect(retrieved.evaluations[0]!.personaId).toBe("sales"); // ORDER BY persona_id
    expect(retrieved.evaluations[1]!.personaId).toBe("strategy");
    expect(retrieved.evaluations[1]!.concerns).toEqual(["리스크1", "리스크2"]);

    expect(retrieved.verdict).not.toBeNull();
    expect(retrieved.verdict!.verdict).toBe("keep");
    expect(retrieved.verdict!.avgScore).toBe(6.5);
    expect(retrieved.verdict!.warnings).toEqual(["전략+재무 주의"]);
  });

  it("미존재 prdId → 빈 evaluations + null verdict", async () => {
    const retrieved = await getPrdPersonaEvaluations(db, "nonexistent");

    expect(retrieved.evaluations).toHaveLength(0);
    expect(retrieved.verdict).toBeNull();
  });
});
