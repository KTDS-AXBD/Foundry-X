import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemClassifier, ClassificationError } from "../services/item-classifier.js";
import type { BizItem } from "../services/item-classification-prompts.js";
import { DEFAULT_WEIGHTS } from "../services/item-classification-prompts.js";
import type { AgentRunner } from "../services/agent-runner.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
} from "../services/execution-types.js";

// ─── Helpers ───

function makeItem(overrides: Partial<BizItem> = {}): BizItem {
  return {
    id: "item-001",
    title: "AI 기반 프로세스 마이닝 솔루션",
    description: "KT DS 내부 업무 프로세스를 자동 분석하는 AI 솔루션",
    source: "field",
    status: "draft",
    orgId: "org-001",
    createdBy: "user-001",
    ...overrides,
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

function makeSuccessResult(json: Record<string, unknown>): AgentExecutionResult {
  return {
    status: "success",
    output: { analysis: JSON.stringify(json) },
    tokensUsed: 500,
    model: "mock",
    duration: 1000,
  };
}

function makeClassificationJson(type: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type,
    confidence: 0.85,
    turn1Answer: "레퍼런스 기반 분석 결과",
    turn2Answer: "기술 자료 확보 수준 평가",
    turn3Answer: "KT DS 수익 모델 검증",
    reasoning: "종합 판단 근거",
    analysisWeights: { ref: 3, market: 1, competition: 3, derive: 3, select: 2, customer: 2, bm: 2 },
    ...overrides,
  };
}

const mockDb = {} as D1Database;

// ─── Tests ───

describe("ItemClassifier", () => {
  let executeMock: ReturnType<typeof vi.fn>;
  let classifier: ItemClassifier;

  beforeEach(() => {
    executeMock = vi.fn();
    classifier = new ItemClassifier(makeRunner(executeMock), mockDb);
  });

  // ─── Happy Path: Type Classification ───

  it("classifies Type A item correctly", async () => {
    const json = makeClassificationJson("type_a");
    executeMock.mockResolvedValue(makeSuccessResult(json));

    const result = await classifier.classify(makeItem());

    expect(result.itemType).toBe("type_a");
    expect(result.confidence).toBe(0.85);
    expect(result.turnAnswers.turn1).toBe("레퍼런스 기반 분석 결과");
    expect(result.turnAnswers.turn2).toBe("기술 자료 확보 수준 평가");
    expect(result.turnAnswers.turn3).toBe("KT DS 수익 모델 검증");
    expect(result.reasoning).toBe("종합 판단 근거");
  });

  it("classifies Type B item correctly", async () => {
    const json = makeClassificationJson("type_b", {
      analysisWeights: { ref: 1, market: 3, competition: 2, derive: 3, select: 3, customer: 2, bm: 2 },
    });
    executeMock.mockResolvedValue(makeSuccessResult(json));

    const result = await classifier.classify(makeItem({ title: "시장 기회 포착 아이템" }));

    expect(result.itemType).toBe("type_b");
    expect(result.analysisWeights.market).toBe(3);
    expect(result.analysisWeights.ref).toBe(1);
  });

  it("classifies Type C item correctly", async () => {
    const json = makeClassificationJson("type_c", {
      analysisWeights: { ref: 0, market: 1, competition: 2, derive: 1, select: 1, customer: 3, bm: 3 },
    });
    executeMock.mockResolvedValue(makeSuccessResult(json));

    const result = await classifier.classify(makeItem({ title: "고객사 운영비 절감 요청" }));

    expect(result.itemType).toBe("type_c");
    expect(result.analysisWeights.customer).toBe(3);
    expect(result.analysisWeights.bm).toBe(3);
  });

  // ─── Context Handling ───

  it("passes optional context to prompt", async () => {
    const json = makeClassificationJson("type_a");
    executeMock.mockResolvedValue(makeSuccessResult(json));

    await classifier.classify(makeItem(), "기존 A사 사례 참고");

    const request = executeMock.mock.calls[0]![0] as AgentExecutionRequest;
    expect(request.context.instructions).toContain("기존 A사 사례 참고");
  });

  // ─── Weight Fallback ───

  it("uses default weights when LLM omits analysisWeights", async () => {
    const json = makeClassificationJson("type_a", { analysisWeights: undefined });
    executeMock.mockResolvedValue(makeSuccessResult(json));

    const result = await classifier.classify(makeItem());

    expect(result.analysisWeights).toEqual(DEFAULT_WEIGHTS.type_a);
  });

  it("clamps out-of-range weight values to defaults", async () => {
    const json = makeClassificationJson("type_a", {
      analysisWeights: { ref: 5, market: -1, competition: 3, derive: 3, select: 2, customer: 2, bm: 2 },
    });
    executeMock.mockResolvedValue(makeSuccessResult(json));

    const result = await classifier.classify(makeItem());

    // ref=5 (out of 0~3) → default 3, market=-1 → default 1
    expect(result.analysisWeights.ref).toBe(DEFAULT_WEIGHTS.type_a!.ref);
    expect(result.analysisWeights.market).toBe(DEFAULT_WEIGHTS.type_a!.market);
    // competition=3 (valid) → kept
    expect(result.analysisWeights.competition).toBe(3);
  });

  // ─── Error Cases ───

  it("throws ClassificationError on invalid JSON response", async () => {
    executeMock.mockResolvedValue({
      status: "success",
      output: { analysis: "This is not JSON at all" },
      tokensUsed: 100,
      model: "mock",
      duration: 500,
    });

    const err = await classifier.classify(makeItem()).catch((e) => e);
    expect(err).toBeInstanceOf(ClassificationError);
    expect(err.code).toBe("LLM_PARSE_ERROR");
  });

  it("throws ClassificationError on invalid item type", async () => {
    const json = makeClassificationJson("type_x"); // invalid type
    executeMock.mockResolvedValue(makeSuccessResult(json));

    await expect(classifier.classify(makeItem())).rejects.toThrow(ClassificationError);
  });

  it("throws ClassificationError on LLM execution failure", async () => {
    executeMock.mockResolvedValue({
      status: "failed",
      output: {},
      tokensUsed: 0,
      model: "mock",
      duration: 0,
    });

    await expect(classifier.classify(makeItem())).rejects.toThrow(ClassificationError);
    await expect(classifier.classify(makeItem())).rejects.toThrow(/LLM execution failed/);
  });

  // ─── Markdown Code Block Handling ───

  it("extracts JSON from markdown code block", async () => {
    const json = makeClassificationJson("type_b");
    const wrappedResponse = "```json\n" + JSON.stringify(json) + "\n```";
    executeMock.mockResolvedValue({
      status: "success",
      output: { analysis: wrappedResponse },
      tokensUsed: 500,
      model: "mock",
      duration: 1000,
    });

    const result = await classifier.classify(makeItem());

    expect(result.itemType).toBe("type_b");
  });

  // ─── AgentExecutionRequest Structure ───

  it("sends correct request structure to AgentRunner", async () => {
    const json = makeClassificationJson("type_a");
    executeMock.mockResolvedValue(makeSuccessResult(json));
    const item = makeItem();

    await classifier.classify(item);

    expect(executeMock).toHaveBeenCalledTimes(1);
    const request = executeMock.mock.calls[0]![0] as AgentExecutionRequest;
    expect(request.taskId).toBe(`classify-${item.id}`);
    expect(request.agentId).toBe("item-classifier");
    expect(request.taskType).toBe("policy-evaluation");
    expect(request.context.instructions).toContain(item.title);
    expect(request.context.systemPromptOverride).toContain("KT DS");
  });
});
