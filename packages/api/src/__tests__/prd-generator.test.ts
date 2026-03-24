import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrdGeneratorService } from "../services/prd-generator.js";
import type { AgentRunner } from "../services/agent-runner.js";
import type { AgentExecutionResult } from "../services/execution-types.js";
import type { DiscoveryCriterion } from "../services/discovery-criteria.js";
import type { AnalysisContext } from "../services/analysis-context.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    criteria_snapshot TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

function makeCriteria(): DiscoveryCriterion[] {
  return Array.from({ length: 9 }, (_, i) => ({
    id: `c-${i + 1}`,
    bizItemId: "item-1",
    criterionId: i + 1,
    name: `기준 ${i + 1}`,
    condition: `조건 ${i + 1}`,
    status: "completed" as const,
    evidence: `근거 ${i + 1}`,
    completedAt: "2026-03-24",
    updatedAt: "2026-03-24",
  }));
}

function makeContexts(): AnalysisContext[] {
  return [
    { id: "ctx-1", bizItemId: "item-1", stepOrder: 1, pmSkill: "/interview", inputSummary: null, outputText: "인터뷰 결과", createdAt: "2026-03-24" },
    { id: "ctx-2", bizItemId: "item-1", stepOrder: 2, pmSkill: "/market-scan", inputSummary: null, outputText: "시장 분석 결과", createdAt: "2026-03-24" },
  ];
}

let db: D1Database;

describe("PrdGeneratorService (F185)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  it("buildTemplate — 템플릿 기반 PRD 생성", () => {
    const runner = mockRunner("");
    const service = new PrdGeneratorService(db, runner);
    const content = service.buildTemplate({
      bizItemId: "item-1",
      bizItem: { title: "AI 보안", description: "AI 기반 보안 솔루션", source: "field" },
      criteria: makeCriteria(),
      contexts: makeContexts(),
      startingPoint: "tech",
    });

    expect(content).toContain("# PRD — AI 보안");
    expect(content).toContain("## 1. 요약");
    expect(content).toContain("## 10. 오픈 이슈");
    expect(content).toContain("근거 1");
  });

  it("generate — skipLlmRefine=true (LLM 없이 저장)", async () => {
    const runner = mockRunner("");
    const service = new PrdGeneratorService(db, runner);

    const prd = await service.generate({
      bizItemId: "item-1",
      bizItem: { title: "AI 보안", description: null, source: "field" },
      criteria: makeCriteria(),
      contexts: [],
      startingPoint: "idea",
      skipLlmRefine: true,
    });

    expect(prd.id).toBeTruthy();
    expect(prd.version).toBe(1);
    expect(prd.content).toContain("# PRD");
    expect(prd.criteriaSnapshot).toBeTruthy();
    expect(JSON.parse(prd.criteriaSnapshot)).toHaveLength(9);
  });

  it("generate — LLM 보강 (mock)", async () => {
    const runner = mockRunner("## 보강된 PRD 내용\n전문적으로 다듬어진 내용");
    const service = new PrdGeneratorService(db, runner);

    const prd = await service.generate({
      bizItemId: "item-1",
      bizItem: { title: "AI 보안", description: null, source: "field" },
      criteria: makeCriteria(),
      contexts: makeContexts(),
      startingPoint: "tech",
    });

    expect(prd.content).toContain("보강된 PRD");
    expect(runner.execute).toHaveBeenCalledTimes(1);
  });

  it("generate — LLM 실패 시 템플릿 폴백", async () => {
    const runner = mockRunner("", "failed");
    const service = new PrdGeneratorService(db, runner);

    const prd = await service.generate({
      bizItemId: "item-1",
      bizItem: { title: "AI 보안", description: null, source: "field" },
      criteria: makeCriteria(),
      contexts: [],
      startingPoint: "idea",
    });

    // Should fallback to template content
    expect(prd.content).toContain("# PRD — AI 보안");
    expect(prd.version).toBe(1);
  });

  it("generate — 버전 자동 증가", async () => {
    const runner = mockRunner("");
    const service = new PrdGeneratorService(db, runner);
    const input = {
      bizItemId: "item-1",
      bizItem: { title: "AI 보안", description: null, source: "field" },
      criteria: makeCriteria(),
      contexts: [],
      startingPoint: "idea" as const,
      skipLlmRefine: true,
    };

    const prd1 = await service.generate(input);
    const prd2 = await service.generate(input);
    expect(prd1.version).toBe(1);
    expect(prd2.version).toBe(2);
  });

  it("getLatest — 최신 버전 조회", async () => {
    const runner = mockRunner("");
    const service = new PrdGeneratorService(db, runner);
    const input = {
      bizItemId: "item-1",
      bizItem: { title: "AI 보안", description: null, source: "field" },
      criteria: makeCriteria(),
      contexts: [],
      startingPoint: "idea" as const,
      skipLlmRefine: true,
    };

    await service.generate(input);
    await service.generate(input);

    const latest = await service.getLatest("item-1");
    expect(latest).toBeDefined();
    expect(latest!.version).toBe(2);
  });

  it("getByVersion — 특정 버전 조회", async () => {
    const runner = mockRunner("");
    const service = new PrdGeneratorService(db, runner);
    const input = {
      bizItemId: "item-1",
      bizItem: { title: "AI 보안", description: null, source: "field" },
      criteria: makeCriteria(),
      contexts: [],
      startingPoint: "idea" as const,
      skipLlmRefine: true,
    };

    await service.generate(input);
    await service.generate(input);

    const v1 = await service.getByVersion("item-1", 1);
    expect(v1).toBeDefined();
    expect(v1!.version).toBe(1);

    const v3 = await service.getByVersion("item-1", 3);
    expect(v3).toBeNull();
  });

  it("getLatest — PRD 없으면 null", async () => {
    const runner = mockRunner("");
    const service = new PrdGeneratorService(db, runner);
    const latest = await service.getLatest("nonexistent");
    expect(latest).toBeNull();
  });
});
