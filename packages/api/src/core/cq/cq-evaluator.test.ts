// F632: CQ 5축 + 80-20-80 검수 룰 TDD Red Phase
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CQEvaluator } from "./services/cq-evaluator.service.js";
import { ReviewCycle } from "./services/review-cycle.service.js";
import type { CQAxis } from "./types.js";

function makeD1Mock(questionRow: unknown = { id: "q-1", question_text: "Q?", answer_text: "A." }) {
  let insertCount = 0;
  return {
    _insertCount: () => insertCount,
    prepare: vi.fn().mockImplementation(() => ({
      bind: vi.fn().mockImplementation(() => ({
        run: vi.fn().mockImplementation(() => {
          insertCount++;
          return Promise.resolve({ success: true });
        }),
        first: vi.fn().mockResolvedValue(questionRow),
        all: vi.fn().mockResolvedValue({ results: [] }),
      })),
    })),
  };
}

function makeAuditBusMock() {
  return { emit: vi.fn().mockResolvedValue(undefined) };
}

function makeLLMMock(rawScore: number) {
  const axisResponse: Record<string, { rawScore: number; reasoning: string }> = {
    ontology_usage: { rawScore, reasoning: "ok" },
    tool_selection: { rawScore, reasoning: "ok" },
    code_quality: { rawScore, reasoning: "ok" },
    result_match: { rawScore, reasoning: "ok" },
    governance: { rawScore, reasoning: "ok" },
  };
  return {
    generate: vi.fn().mockResolvedValue({ content: JSON.stringify(axisResponse), model: "test", tokensUsed: 0 }),
  };
}

describe("F632 CQEvaluator", () => {
  const orgId = "org-test";
  const questionId = "q-1";
  const llmCallContext = { sessionId: "s-1", response: "LLM response text" };

  it("T1: 90점 이상 → handoffDecision='handoff' + emit 2회", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const llm = makeLLMMock(95);
    const evaluator = new CQEvaluator(db as unknown as D1Database, llm as any, bus as any);

    const result = await evaluator.evaluate({ orgId, questionId, llmCallContext });

    expect(result.handoffDecision).toBe("handoff");
    expect(result.totalScore).toBeGreaterThanOrEqual(90);
    expect(result.orgId).toBe(orgId);
    expect(result.questionId).toBe(questionId);
    expect(result.id).toBeTruthy();

    const emitCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls;
    const eventTypes = emitCalls.map((c: unknown[]) => c[0]);
    expect(eventTypes).toContain("cq.evaluated");
    expect(eventTypes).toContain("cq.handoff");
    expect(emitCalls.length).toBe(2);
  });

  it("T2: 70점 → handoffDecision='human_review' + emit 1회(cq.evaluated만)", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const llm = makeLLMMock(70);
    const evaluator = new CQEvaluator(db as unknown as D1Database, llm as any, bus as any);

    const result = await evaluator.evaluate({ orgId, questionId, llmCallContext });

    expect(result.handoffDecision).toBe("human_review");
    expect(result.totalScore).toBeLessThan(90);

    const emitCalls = (bus.emit as ReturnType<typeof vi.fn>).mock.calls;
    const eventTypes = emitCalls.map((c: unknown[]) => c[0]);
    expect(eventTypes).toContain("cq.evaluated");
    expect(eventTypes).not.toContain("cq.handoff");
    expect(emitCalls.length).toBe(1);
  });
});

describe("F632 ReviewCycle", () => {
  const orgId = "org-test";

  it("T3: startCycle → 3 stage 반환 (human_intensive_20은 pending)", async () => {
    const db = makeD1Mock();
    const bus = makeAuditBusMock();
    const llm = {
      generate: vi.fn().mockResolvedValue({ content: "generated content", model: "test", tokensUsed: 0 }),
    };
    const cycle = new ReviewCycle(db as unknown as D1Database, llm as any, bus as any);

    const result = await cycle.startCycle({ orgId, initialContent: "초기 내용" });

    expect(result.cycleId).toBeTruthy();
    expect(result.orgId).toBe(orgId);
    expect(result.stages.length).toBe(3);

    const ai80 = result.stages.find((s) => s.stage === "ai_initial_80");
    expect(ai80?.status).toBe("completed");

    const selfEval = result.stages.find((s) => s.stage === "self_eval");
    expect(selfEval?.status).toBe("completed");

    const human20 = result.stages.find((s) => s.stage === "human_intensive_20");
    expect(human20?.status).toBe("pending");

    expect(bus.emit).toHaveBeenCalledWith(
      "review_cycle.stage_completed",
      expect.objectContaining({ awaitingHuman: true }),
      expect.objectContaining({ traceId: expect.any(String) }),
    );
  });
});
