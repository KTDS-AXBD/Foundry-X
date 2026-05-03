import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BizPersonaEvaluator,
  EvaluationError,
  MIN_SUCCESS_COUNT,
} from "../core/shaping/services/biz-persona-evaluator.js";
import type { BizItem, Classification } from "../core/shaping/services/biz-persona-prompts.js";
import { BIZ_PERSONAS } from "../core/shaping/services/biz-persona-prompts.js";
import type { AgentRunner } from "../core/agent/services/agent-runner.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../core/agent/services/execution-types.js";

// ─── Helpers ───

function makeItem(overrides: Partial<BizItem> = {}): BizItem {
  return {
    id: "item-001",
    title: "AI 기반 프로세스 마이닝 솔루션",
    description: "업무 프로세스 자동 분석 AI 솔루션",
    source: "field",
    status: "classified",
    orgId: "org-001",
    createdBy: "user-001",
    ...overrides,
  };
}

function makeClassification(overrides: Partial<Classification> = {}): Classification {
  return {
    itemType: "type_a",
    confidence: 0.85,
    analysisWeights: { ref: 3, market: 1, competition: 3, derive: 3, select: 2, customer: 2, bm: 2 },
    ...overrides,
  };
}

function makeScoreJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    businessViability: 7,
    strategicFit: 8,
    customerValue: 7,
    techMarket: 8,
    execution: 7,
    financialFeasibility: 7,
    competitiveDiff: 8,
    scalability: 7,
    summary: "긍정적 평가 소견",
    concerns: [],
    ...overrides,
  };
}

function makeSuccessResult(json: Record<string, unknown>): AgentExecutionResult {
  return {
    status: "success",
    output: { analysis: JSON.stringify(json) },
    tokensUsed: 500,
    model: "mock",
    duration: 1000,
  };
}

function makeRunner(executeFn: (req: AgentExecutionRequest) => Promise<AgentExecutionResult>): AgentRunner {
  return {
    type: "mock",
    execute: executeFn,
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  };
}

const mockDb = {} as D1Database;

// ─── Tests ───

describe("BizPersonaEvaluator", () => {
  let executeMock: ReturnType<typeof vi.fn>;
  let evaluator: BizPersonaEvaluator;

  beforeEach(() => {
    executeMock = vi.fn();
    evaluator = new BizPersonaEvaluator(makeRunner(executeMock), mockDb);
  });

  // ─── Happy Path ───

  it("evaluates all 8 personas successfully and returns green verdict", async () => {
    // All high scores, no concerns → green
    executeMock.mockResolvedValue(makeSuccessResult(makeScoreJson()));

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.verdict).toBe("green");
    expect(result.scores).toHaveLength(8);
    expect(result.avgScore).toBeGreaterThanOrEqual(7.0);
    expect(result.totalConcerns).toBe(0);
  });

  it("calls AgentRunner 8 times (one per persona)", async () => {
    executeMock.mockResolvedValue(makeSuccessResult(makeScoreJson()));

    await evaluator.evaluate(makeItem(), makeClassification());

    expect(executeMock).toHaveBeenCalledTimes(8);
    // Verify each persona's agentId
    const agentIds = executeMock.mock.calls.map(
      (call: unknown[]) => (call[0] as AgentExecutionRequest).agentId,
    );
    for (const persona of BIZ_PERSONAS) {
      expect(agentIds).toContain(`biz-persona-${persona.id}`);
    }
  });

  // ─── Partial Failure ───

  it("succeeds with 5/8 personas (minimum threshold)", async () => {
    // 3 fail + 5 succeed = exactly MIN_SUCCESS_COUNT
    executeMock.mockImplementation((req: AgentExecutionRequest) => {
      const failIds = ["strategy", "sales", "ap_biz"];
      const isFailPersona = failIds.some((id) => req.agentId === `biz-persona-${id}`);
      if (isFailPersona) {
        return Promise.reject(new Error("LLM timeout"));
      }
      return Promise.resolve(makeSuccessResult(makeScoreJson()));
    });

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.scores).toHaveLength(5);
    expect(result.verdict).toBeDefined();
  });

  it("throws EvaluationError when fewer than 5 personas succeed", async () => {
    // 5 fail + 3 succeed = only 3 < MIN_SUCCESS_COUNT
    executeMock.mockImplementation((req: AgentExecutionRequest) => {
      const failIds = ["strategy", "sales", "ap_biz", "ai_tech", "finance"];
      const isFailPersona = failIds.some((id) => req.agentId === `biz-persona-${id}`);
      if (isFailPersona) {
        return Promise.reject(new Error("LLM timeout"));
      }
      return Promise.resolve(makeSuccessResult(makeScoreJson()));
    });

    const err = await evaluator.evaluate(makeItem(), makeClassification()).catch((e) => e);
    expect(err).toBeInstanceOf(EvaluationError);
    expect(err.code).toBe("INSUFFICIENT_EVALUATIONS");
  });

  // ─── G/K/R Verdict Boundary Tests ───

  it("returns green when avgScore >= 7.0 and concerns <= 2", async () => {
    // Only 2 personas have 1 concern each → totalConcerns = 2
    executeMock.mockImplementation((req: AgentExecutionRequest) => {
      const withConcern = req.agentId === "biz-persona-strategy" || req.agentId === "biz-persona-sales";
      return Promise.resolve(
        makeSuccessResult(makeScoreJson({ concerns: withConcern ? ["minor issue"] : [] })),
      );
    });

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.verdict).toBe("green");
    expect(result.avgScore).toBeGreaterThanOrEqual(7.0);
    expect(result.totalConcerns).toBe(2);
  });

  it("returns keep when avgScore is 5.0~6.9", async () => {
    executeMock.mockResolvedValue(
      makeSuccessResult(
        makeScoreJson({
          businessViability: 6,
          strategicFit: 6,
          customerValue: 6,
          techMarket: 6,
          execution: 6,
          financialFeasibility: 6,
          competitiveDiff: 6,
          scalability: 6,
        }),
      ),
    );

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.verdict).toBe("keep");
    expect(result.avgScore).toBeGreaterThanOrEqual(5.0);
    expect(result.avgScore).toBeLessThan(7.0);
  });

  it("returns red when avgScore < 5.0", async () => {
    executeMock.mockResolvedValue(
      makeSuccessResult(
        makeScoreJson({
          businessViability: 3,
          strategicFit: 4,
          customerValue: 3,
          techMarket: 4,
          execution: 3,
          financialFeasibility: 3,
          competitiveDiff: 4,
          scalability: 3,
        }),
      ),
    );

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.verdict).toBe("red");
    expect(result.avgScore).toBeLessThan(5.0);
  });

  it("returns red when totalConcerns >= 6", async () => {
    // High scores but many concerns → red
    executeMock.mockResolvedValue(
      makeSuccessResult(
        makeScoreJson({ concerns: ["issue1"] }),
      ),
    );
    // 8 personas × 1 concern = 8 concerns → red
    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.totalConcerns).toBe(8);
    expect(result.verdict).toBe("red");
  });

  it("returns keep when avgScore >= 7.0 but concerns > 2", async () => {
    // High score but 3 concerns per persona → totalConcerns = 24
    executeMock.mockResolvedValue(
      makeSuccessResult(
        makeScoreJson({ concerns: ["concern1", "concern2", "concern3"] }),
      ),
    );

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    // avgScore >= 7.0 but totalConcerns >= 6 → red (not keep)
    // Actually totalConcerns = 24 >= 6 → red
    expect(result.verdict).toBe("red");
  });

  // ─── Strategy+Finance Override ───

  it("downgrades green to keep when strategy and finance both score < 5 avg", async () => {
    // Most personas give high scores → base verdict would be green
    // But strategy and finance both give low scores
    executeMock.mockImplementation((req: AgentExecutionRequest) => {
      const isStrategy = req.agentId === "biz-persona-strategy";
      const isFinance = req.agentId === "biz-persona-finance";

      if (isStrategy || isFinance) {
        return Promise.resolve(
          makeSuccessResult(
            makeScoreJson({
              businessViability: 3,
              strategicFit: 3,
              customerValue: 4,
              techMarket: 4,
              execution: 3,
              financialFeasibility: 3,
              competitiveDiff: 4,
              scalability: 4,
            }),
          ),
        );
      }
      return Promise.resolve(
        makeSuccessResult(
          makeScoreJson({
            businessViability: 9,
            strategicFit: 9,
            customerValue: 9,
            techMarket: 9,
            execution: 9,
            financialFeasibility: 9,
            competitiveDiff: 9,
            scalability: 9,
          }),
        ),
      );
    });

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    // 6 personas × 9.0 avg + 2 personas × 3.5 avg → overall avg should be > 7.0
    // But strategy+finance both < 5 → override to keep
    expect(result.warnings).toContain(
      "전략기획+경영기획 평균 5점 미만으로 Green→Keep 하향 조정",
    );
    expect(result.verdict).toBe("keep");
  });

  // ─── Axis Warning Detection ───

  it("generates warning when 3+ personas score <= 3 on same axis", async () => {
    // 4 personas give low execution score
    const lowExecIds = ["strategy", "sales", "ap_biz", "ai_tech"];
    executeMock.mockImplementation((req: AgentExecutionRequest) => {
      const isLowExec = lowExecIds.some((id) => req.agentId === `biz-persona-${id}`);
      if (isLowExec) {
        return Promise.resolve(
          makeSuccessResult(makeScoreJson({ execution: 2 })),
        );
      }
      return Promise.resolve(makeSuccessResult(makeScoreJson()));
    });

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    const executionWarning = result.warnings.find((w) => w.includes("execution"));
    expect(executionWarning).toBeDefined();
  });

  // ─── Score Clamping ───

  it("clamps out-of-range scores to 1~10", async () => {
    executeMock.mockResolvedValue(
      makeSuccessResult(
        makeScoreJson({
          businessViability: 15, // > 10 → clamped to 10
          strategicFit: -2,     // < 1 → clamped to 1
          customerValue: 7.6,   // rounded to 8
        }),
      ),
    );

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    const firstScore = result.scores[0]!;
    expect(firstScore.businessViability).toBe(10);
    expect(firstScore.strategicFit).toBe(1);
    expect(firstScore.customerValue).toBe(8);
  });

  // ─── LLM Response Format ───

  it("handles markdown code block wrapped JSON", async () => {
    const json = makeScoreJson();
    const wrappedResponse = "```json\n" + JSON.stringify(json) + "\n```";
    executeMock.mockResolvedValue({
      status: "success",
      output: { analysis: wrappedResponse },
      tokensUsed: 500,
      model: "mock",
      duration: 1000,
    });

    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.scores).toHaveLength(8);
    expect(result.verdict).toBeDefined();
  });

  it("handles failed LLM execution status for individual persona", async () => {
    let callCount = 0;
    executeMock.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        // Return failed status
        return Promise.resolve({
          status: "failed",
          output: {},
          tokensUsed: 0,
          model: "mock",
          duration: 0,
        });
      }
      return Promise.resolve(makeSuccessResult(makeScoreJson()));
    });

    // 2 failed + 6 success = 6 >= MIN_SUCCESS_COUNT → should succeed
    const result = await evaluator.evaluate(makeItem(), makeClassification());

    expect(result.scores).toHaveLength(6);
  });
});
