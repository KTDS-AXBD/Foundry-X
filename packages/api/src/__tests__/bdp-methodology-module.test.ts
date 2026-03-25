import { describe, it, expect, beforeEach, vi } from "vitest";
import { BdpMethodologyModule } from "../services/bdp-methodology-module.js";
import type { BizItemContext, ModuleClassificationResult } from "../services/methodology-module.js";
import type { AgentRunner } from "../services/agent-runner.js";

// ─── Mocks ───

vi.mock("../services/item-classifier.js", () => {
  const classifyMock = vi.fn().mockResolvedValue({
    itemType: "type_a",
    confidence: 0.85,
    turnAnswers: { turn1: "a1", turn2: "a2", turn3: "a3" },
    analysisWeights: { novelty: 2, feasibility: 1 },
    reasoning: "test reasoning",
  });
  return {
    ItemClassifier: class {
      classify = classifyMock;
    },
    __classifyMock: classifyMock,
  };
});

vi.mock("../services/discovery-criteria.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/discovery-criteria.js")>();
  const checkGateMock = vi.fn().mockResolvedValue({
    gateStatus: "warning",
    completedCount: 7,
    missingCriteria: [
      { id: 8, name: "차별화 근거", status: "pending" },
      { id: 9, name: "검증 실험 계획", status: "in_progress" },
    ],
  });
  return {
    ...actual,
    DiscoveryCriteriaService: class {
      checkGate = checkGateMock;
    },
    __checkGateMock: checkGateMock,
  };
});

function createMockRunner(): AgentRunner {
  return {
    type: "mock" as const,
    execute: vi.fn(),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  };
}

function createMockDb(): D1Database {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn(),
      }),
    }),
  } as unknown as D1Database;
}

// ─── Tests ───

describe("BdpMethodologyModule", () => {
  let mod: BdpMethodologyModule;

  beforeEach(() => {
    vi.clearAllMocks();
    mod = new BdpMethodologyModule();
  });

  // ── matchScore ──

  it("matchScore: no classification → 75", async () => {
    const item: BizItemContext = {
      id: "1", title: "test", description: null, source: "manual",
    };
    expect(await mod.matchScore(item)).toBe(75);
  });

  it("matchScore: type_a → 85", async () => {
    const item: BizItemContext = {
      id: "1", title: "test", description: null, source: "manual",
      classification: { itemType: "type_a", confidence: 0.9, analysisWeights: {} },
    };
    expect(await mod.matchScore(item)).toBe(85);
  });

  it("matchScore: type_b → 80", async () => {
    const item: BizItemContext = {
      id: "1", title: "test", description: null, source: "manual",
      classification: { itemType: "type_b", confidence: 0.8, analysisWeights: {} },
    };
    expect(await mod.matchScore(item)).toBe(80);
  });

  it("matchScore: type_b + startingPoint → 85", async () => {
    const item: BizItemContext = {
      id: "1", title: "test", description: null, source: "manual",
      classification: { itemType: "type_b", confidence: 0.8, analysisWeights: {} },
      startingPoint: "idea",
    };
    expect(await mod.matchScore(item)).toBe(85);
  });

  it("matchScore: capped at 100", async () => {
    const item: BizItemContext = {
      id: "1", title: "test", description: null, source: "manual",
      classification: { itemType: "type_a", confidence: 0.95, analysisWeights: {} },
      startingPoint: "tech",
    };
    // 75 + 10 + 5 = 90, min(90, 100) = 90
    expect(await mod.matchScore(item)).toBe(90);
  });

  // ── classifyItem ──

  it("classifyItem: delegates to ItemClassifier", async () => {
    const item: BizItemContext = {
      id: "item-1", title: "AI 챗봇", description: "고객응대 자동화", source: "slack",
    };
    const result = await mod.classifyItem(item, createMockRunner(), createMockDb());

    expect(result.classificationKey).toBe("type_a");
    expect(result.confidence).toBe(0.85);
    expect(result.details).toHaveProperty("turnAnswers");
    expect(result.details).toHaveProperty("analysisWeights");
    expect(result.details).toHaveProperty("reasoning");
  });

  // ── getAnalysisSteps ──

  it("getAnalysisSteps: idea → 8 steps", () => {
    const classification: ModuleClassificationResult = {
      classificationKey: "type_a",
      confidence: 0.9,
      details: { startingPoint: "idea" },
    };
    const steps = mod.getAnalysisSteps(classification);
    expect(steps).toHaveLength(8);
    expect(steps[0]!.order).toBe(1);
    expect(steps[0]!.activity).toBe("아이디어/솔루션 입력");
  });

  it("getAnalysisSteps: problem → 9 steps", () => {
    const classification: ModuleClassificationResult = {
      classificationKey: "type_c",
      confidence: 0.7,
      details: { startingPoint: "problem" },
    };
    const steps = mod.getAnalysisSteps(classification);
    expect(steps).toHaveLength(9);
  });

  it("getAnalysisSteps: default to idea when no startingPoint", () => {
    const classification: ModuleClassificationResult = {
      classificationKey: "type_b",
      confidence: 0.8,
      details: {},
    };
    const steps = mod.getAnalysisSteps(classification);
    expect(steps).toHaveLength(8); // idea has 8 steps
  });

  // ── getCriteria ──

  it("getCriteria: returns 9 criteria with relatedTools", () => {
    const criteria = mod.getCriteria();
    expect(criteria).toHaveLength(9);
    expect(criteria[0]!.id).toBe(1);
    expect(criteria[0]!.name).toBe("문제/고객 정의");
    expect(criteria[0]!.relatedTools).toEqual(["/interview", "/research-users"]);
  });

  // ── checkGate ──

  it("checkGate: delegates to DiscoveryCriteriaService", async () => {
    const result = await mod.checkGate("biz-1", createMockDb());

    expect(result.gateStatus).toBe("warning");
    expect(result.completedCount).toBe(7);
    expect(result.totalCount).toBe(9);
    expect(result.missingCriteria).toHaveLength(2);
    expect(result.missingCriteria[0]!.id).toBe(8);
  });

  // ── getReviewMethods ──

  it("getReviewMethods: returns 3 methods", () => {
    const methods = mod.getReviewMethods();
    expect(methods).toHaveLength(3);
    expect(methods.map((m) => m.type)).toEqual([
      "ai-review",
      "persona-evaluation",
      "debate",
    ]);
    expect(methods.map((m) => m.id)).toEqual([
      "ai-3-provider",
      "persona-8",
      "six-hats",
    ]);
  });
});
