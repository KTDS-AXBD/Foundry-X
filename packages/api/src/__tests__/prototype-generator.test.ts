import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrototypeGeneratorService } from "../services/prototype-generator.js";
import type { AgentRunner } from "../core/agent/services/agent-runner.js";
import type { BizItem, EvaluationWithScores } from "../core/discovery/services/biz-item-service.js";
import type { DiscoveryCriterion } from "../core/discovery/services/discovery-criteria.js";
import type { StartingPointType } from "../core/discovery/services/analysis-paths.js";

const TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS prototypes (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    format TEXT NOT NULL DEFAULT 'html',
    content TEXT NOT NULL,
    template_used TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    generated_at TEXT NOT NULL,
    UNIQUE(biz_item_id, version)
  );
`;

function makeBizItem(overrides: Partial<BizItem> = {}): BizItem {
  return {
    id: "item-1",
    orgId: "org-1",
    title: "AI 보안 솔루션",
    description: "AI 기반 실시간 보안",
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
    evidence: i === 0 ? "고객이 보안 위협에 실시간 대응하지 못하는 문제" :
              i === 3 ? "- AI 실시간 탐지\n- 자동 차단\n- 통합 대시보드" :
              `근거 ${i + 1}`,
    completedAt: "2026-03-25",
    updatedAt: "2026-03-25",
  }));
}

function makeEvaluation(): EvaluationWithScores {
  return {
    id: "eval-1",
    bizItemId: "item-1",
    verdict: "green",
    avgScore: 7.8,
    totalConcerns: 2,
    evaluatedAt: "2026-03-25",
    scores: [
      {
        personaId: "cto", businessViability: 8, strategicFit: 7, customerValue: 8,
        techMarket: 7, execution: 8, financialFeasibility: 7, competitiveDiff: 8, scalability: 7,
        summary: "보안 자동화는 B2B 시장에서 매우 유망합니다.", concerns: ["경쟁 심화"],
      },
      {
        personaId: "investor", businessViability: 7, strategicFit: 8, customerValue: 7,
        techMarket: 8, execution: 7, financialFeasibility: 8, competitiveDiff: 7, scalability: 8,
        summary: "시장 성장률이 높아 투자 매력도 우수합니다.", concerns: ["규제 리스크"],
      },
    ],
  };
}

let db: D1Database;

describe("PrototypeGeneratorService (F181)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  it("generate — HTML 생성 + DB 저장", async () => {
    const service = new PrototypeGeneratorService(db, null);
    const result = await service.generate({
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: makeEvaluation(),
      criteria: makeCriteria(),
      startingPoint: "idea",
      trendReport: null,
      prd: null,
      businessPlan: null,
    });

    expect(result.id).toBeTruthy();
    expect(result.version).toBe(1);
    expect(result.format).toBe("html");
    expect(result.content).toContain("<!DOCTYPE html>");
    expect(result.content).toContain("AI 보안 솔루션");
    expect(result.templateUsed).toBe("idea");
    expect(result.generatedAt).toBeTruthy();
  });

  it("generate — template 오버라이드", async () => {
    const service = new PrototypeGeneratorService(db, null);
    const result = await service.generate({
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: null,
      criteria: makeCriteria(),
      startingPoint: "idea",
      trendReport: null,
      prd: null,
      businessPlan: null,
      template: "market",
    });

    expect(result.templateUsed).toBe("market");
  });

  it("generate — 버전 자동 증가", async () => {
    const service = new PrototypeGeneratorService(db, null);
    const input = {
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: null,
      criteria: makeCriteria(),
      startingPoint: "idea" as StartingPointType,
      trendReport: null,
      prd: null,
      businessPlan: null,
    };

    const v1 = await service.generate(input);
    const v2 = await service.generate(input);
    expect(v1.version).toBe(1);
    expect(v2.version).toBe(2);
  });

  it("extractPrototypeData — 기준에서 데이터 추출", () => {
    const service = new PrototypeGeneratorService(db, null);
    const data = service.extractPrototypeData({
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: makeEvaluation(),
      criteria: makeCriteria(),
      startingPoint: "idea",
      trendReport: null,
      prd: null,
      businessPlan: null,
    });

    // Criterion 1 → problemStatement
    expect(data.problemStatement).toContain("보안 위협");
    // Criterion 4 → features (has bullet lines)
    expect(data.features[0]!.description).toContain("AI 실시간 탐지");
    // evaluation → verdict, avgScore
    expect(data.verdict).toBe("green");
    expect(data.avgScore).toBe(7.8);
    // personaQuotes from evaluation scores
    expect(data.personaQuotes.length).toBe(2);
    expect(data.personaQuotes[0]!.persona).toBe("cto");
  });

  it("extractPrototypeData — evaluation 없을 때 기본값", () => {
    const service = new PrototypeGeneratorService(db, null);
    const data = service.extractPrototypeData({
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: null,
      criteria: [],
      startingPoint: "problem",
      trendReport: null,
      prd: null,
      businessPlan: null,
    });

    expect(data.verdict).toBe("default");
    expect(data.avgScore).toBe(0);
    expect(data.evaluationSummary).toBe("평가 대기 중");
    expect(data.personaQuotes).toEqual([]);
    expect(data.problemStatement).toBe("AI 기반 실시간 보안"); // falls back to description
  });

  it("extractPrototypeData — trendReport 시장 통계 추출", () => {
    const service = new PrototypeGeneratorService(db, null);
    const data = service.extractPrototypeData({
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: null,
      criteria: [],
      startingPoint: "market",
      trendReport: {
        marketSummary: "성장세",
        marketSizeEstimate: { tam: "$50B", sam: "$5B", som: "$500M" },
        competitors: [{ name: "CompA" }, { name: "CompB" }],
        trends: [],
      },
      prd: null,
      businessPlan: null,
    });

    expect(data.marketStats).toEqual([
      { label: "TAM", value: "$50B" },
      { label: "SAM", value: "$5B" },
      { label: "SOM", value: "$500M" },
    ]);
    expect(data.competitors).toEqual(["CompA", "CompB"]);
  });

  it("getLatest — 최신 버전 조회", async () => {
    const service = new PrototypeGeneratorService(db, null);
    const input = {
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: null,
      criteria: makeCriteria(),
      startingPoint: "idea" as StartingPointType,
      trendReport: null,
      prd: null,
      businessPlan: null,
    };

    await service.generate(input);
    await service.generate(input);

    const latest = await service.getLatest("item-1");
    expect(latest).toBeDefined();
    expect(latest!.version).toBe(2);
  });

  it("getLatest — 없으면 null", async () => {
    const service = new PrototypeGeneratorService(db, null);
    const result = await service.getLatest("nonexistent");
    expect(result).toBeNull();
  });

  it("getLatestContent — HTML content만 반환", async () => {
    const service = new PrototypeGeneratorService(db, null);
    await service.generate({
      bizItemId: "item-1",
      bizItem: makeBizItem(),
      evaluation: null,
      criteria: makeCriteria(),
      startingPoint: "tech",
      trendReport: null,
      prd: null,
      businessPlan: null,
    });

    const content = await service.getLatestContent("item-1");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("AI 보안 솔루션");
  });

  it("getLatestContent — 없으면 null", async () => {
    const service = new PrototypeGeneratorService(db, null);
    const content = await service.getLatestContent("nonexistent");
    expect(content).toBeNull();
  });
});
