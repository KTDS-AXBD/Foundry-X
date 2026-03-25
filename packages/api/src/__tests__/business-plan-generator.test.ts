import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BusinessPlanGeneratorService } from "../services/business-plan-generator.js";
import type { AgentRunner } from "../services/agent-runner.js";
import type { AgentExecutionResult } from "../services/execution-types.js";
import type { BizItem, EvaluationWithScores } from "../services/biz-item-service.js";
import type { DiscoveryCriterion } from "../services/discovery-criteria.js";
import type { AnalysisContext } from "../services/analysis-context.js";
import type { BpGenerationInput } from "../services/business-plan-generator.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS business_plan_drafts (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    sections_snapshot TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    generated_at TEXT NOT NULL,
    UNIQUE(biz_item_id, version)
  );
`;

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

function makeBizItem(overrides?: Partial<BizItem>): BizItem {
  return {
    id: "item-1",
    orgId: "org-1",
    title: "AI 보안 솔루션",
    description: "AI 기반 보안 자동화",
    source: "field",
    status: "active",
    createdBy: "user-1",
    createdAt: "2026-03-25",
    updatedAt: "2026-03-25",
    classification: { itemType: "type_b", confidence: 0.85, analysisWeights: {}, classifiedAt: "2026-03-25" },
    ...overrides,
  };
}

function makeCriteria(): DiscoveryCriterion[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: `c-${i + 1}`,
    bizItemId: "item-1",
    criterionId: i + 1,
    name: `기준 ${i + 1}`,
    condition: `조건 ${i + 1}`,
    status: "completed" as const,
    evidence: `근거 ${i + 1}`,
    completedAt: "2026-03-25",
    updatedAt: "2026-03-25",
  }));
}

function makeContexts(): AnalysisContext[] {
  return [
    { id: "ctx-1", bizItemId: "item-1", stepOrder: 1, pmSkill: "/interview", inputSummary: null, outputText: "인터뷰 결과", createdAt: "2026-03-25" },
  ];
}

function makeInput(overrides?: Partial<BpGenerationInput>): BpGenerationInput {
  return {
    bizItemId: "item-1",
    bizItem: makeBizItem(),
    criteria: makeCriteria(),
    contexts: makeContexts(),
    evaluation: null,
    startingPoint: "tech",
    trendReport: null,
    prdContent: null,
    skipLlmRefine: true,
    ...overrides,
  };
}

let db: D1Database;

describe("BusinessPlanGeneratorService (F180)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  it("buildTemplate — 10섹션 사업계획서 생성", () => {
    const runner = mockRunner("");
    const service = new BusinessPlanGeneratorService(db, runner);
    const content = service.buildTemplate(makeInput());

    expect(content).toContain("# 사업계획서 초안 — AI 보안 솔루션");
    expect(content).toContain("## 1. 요약");
    expect(content).toContain("## 10. 부록");
    expect(content).toContain("근거 1");
  });

  it("generate — skipLlmRefine=true (LLM 없이 DB 저장)", async () => {
    const runner = mockRunner("");
    const service = new BusinessPlanGeneratorService(db, runner);

    const bp = await service.generate(makeInput());

    expect(bp.id).toBeTruthy();
    expect(bp.version).toBe(1);
    expect(bp.content).toContain("# 사업계획서 초안");
    expect(bp.sectionsSnapshot).toBeTruthy();
    const snapshot = JSON.parse(bp.sectionsSnapshot);
    expect(snapshot.criteriaCompleted).toBe(9);
    expect(snapshot.startingPoint).toBe("tech");
  });

  it("generate — 버전 자동 증가", async () => {
    const runner = mockRunner("");
    const service = new BusinessPlanGeneratorService(db, runner);
    const input = makeInput();

    const bp1 = await service.generate(input);
    const bp2 = await service.generate(input);
    expect(bp1.version).toBe(1);
    expect(bp2.version).toBe(2);
  });

  it("generate — LLM 보강 (mock)", async () => {
    const runner = mockRunner("## 보강된 사업계획서\n전문적으로 다듬어진 내용");
    const service = new BusinessPlanGeneratorService(db, runner);

    const bp = await service.generate(makeInput({ skipLlmRefine: false }));

    expect(bp.content).toContain("보강된 사업계획서");
    expect(runner.execute).toHaveBeenCalledTimes(1);
  });

  it("generate — LLM 실패 시 템플릿 폴백", async () => {
    const runner = mockRunner("", "failed");
    const service = new BusinessPlanGeneratorService(db, runner);

    const bp = await service.generate(makeInput({ skipLlmRefine: false }));

    expect(bp.content).toContain("# 사업계획서 초안 — AI 보안 솔루션");
    expect(bp.version).toBe(1);
  });

  it("generate — runner null이면 LLM 건너뜀", async () => {
    const service = new BusinessPlanGeneratorService(db, null);

    const bp = await service.generate(makeInput({ skipLlmRefine: false }));

    expect(bp.content).toContain("# 사업계획서 초안");
    expect(bp.version).toBe(1);
  });

  it("getLatest — 최신 버전 조회", async () => {
    const runner = mockRunner("");
    const service = new BusinessPlanGeneratorService(db, runner);

    await service.generate(makeInput());
    await service.generate(makeInput());

    const latest = await service.getLatest("item-1");
    expect(latest).toBeDefined();
    expect(latest!.version).toBe(2);
  });

  it("getLatest — 없으면 null", async () => {
    const runner = mockRunner("");
    const service = new BusinessPlanGeneratorService(db, runner);
    const latest = await service.getLatest("nonexistent");
    expect(latest).toBeNull();
  });

  it("listVersions — 버전 목록 조회", async () => {
    const runner = mockRunner("");
    const service = new BusinessPlanGeneratorService(db, runner);

    await service.generate(makeInput());
    await service.generate(makeInput());

    const versions = await service.listVersions("item-1");
    expect(versions).toHaveLength(2);
    expect(versions[0]!.version).toBe(2); // DESC order
    expect(versions[1]!.version).toBe(1);
  });

  it("데이터 누락 시 플레이스홀더 포함", () => {
    const runner = mockRunner("");
    const service = new BusinessPlanGeneratorService(db, runner);
    const content = service.buildTemplate(makeInput({
      criteria: [],
      contexts: [],
      evaluation: null,
      trendReport: null,
      startingPoint: null,
      bizItem: makeBizItem({ classification: null }),
    }));

    expect(content).toContain("사업계획서 초안");
    // Sections with no data should have placeholder
    expect(content).toContain("데이터 수집 필요");
  });
});
