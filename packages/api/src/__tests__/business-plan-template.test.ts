import { describe, it, expect } from "vitest";
import {
  BP_SECTIONS,
  mapDataToSections,
  renderBpMarkdown,
  formatItemType,
  formatVerdict,
  type BpDataBundle,
} from "../core/offering/services/business-plan-template.js";
import type { BizItem, EvaluationWithScores } from "../core/discovery/services/biz-item-service.js";
import type { DiscoveryCriterion } from "../core/discovery/services/discovery-criteria.js";
import type { AnalysisContext } from "../core/discovery/services/analysis-context.js";

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
    { id: "ctx-1", bizItemId: "item-1", stepOrder: 1, pmSkill: "/interview", inputSummary: null, outputText: "인터뷰 결과 분석 내용", createdAt: "2026-03-25" },
    { id: "ctx-2", bizItemId: "item-1", stepOrder: 2, pmSkill: "/market-scan", inputSummary: null, outputText: "시장 조사 결과", createdAt: "2026-03-25" },
  ];
}

function makeEvaluation(): EvaluationWithScores {
  return {
    id: "eval-1",
    bizItemId: "item-1",
    verdict: "green",
    avgScore: 7.5,
    totalConcerns: 2,
    evaluatedAt: "2026-03-25",
    scores: [
      {
        personaId: "cto",
        businessViability: 8, strategicFit: 7, customerValue: 8, techMarket: 7,
        execution: 6, financialFeasibility: 7, competitiveDiff: 8, scalability: 7,
        summary: "기술적으로 유망",
        concerns: ["인력 확보 어려움", "규제 리스크"],
      },
    ],
  };
}

function makeBundle(overrides?: Partial<BpDataBundle>): BpDataBundle {
  return {
    bizItem: makeBizItem(),
    classification: { itemType: "type_b", confidence: 0.85 },
    evaluation: makeEvaluation(),
    criteria: makeCriteria(),
    contexts: makeContexts(),
    startingPoint: "tech",
    trendReport: {
      marketSummary: "AI 보안 시장 급성장",
      marketSizeEstimate: { tam: "$50B", sam: "$10B", som: "$1B" },
      competitors: [{ name: "경쟁사A", description: "글로벌 1위" }],
      trends: [{ title: "제로 트러스트", description: "새로운 보안 패러다임" }],
    },
    prdContent: "# PRD 내용",
    ...overrides,
  };
}

describe("business-plan-template (F180)", () => {
  describe("BP_SECTIONS", () => {
    it("10개 섹션이 정의되어 있다", () => {
      expect(BP_SECTIONS).toHaveLength(10);
      expect(BP_SECTIONS[0].section).toBe(1);
      expect(BP_SECTIONS[9].section).toBe(10);
    });
  });

  describe("mapDataToSections", () => {
    it("전체 데이터로 10개 섹션 모두 매핑", () => {
      const sections = mapDataToSections(makeBundle());
      expect(sections.size).toBe(10);
      for (let i = 1; i <= 10; i++) {
        expect(sections.has(i)).toBe(true);
        expect(sections.get(i)).toBeTruthy();
      }
    });

    it("Section 1 (Executive Summary) — 전체 종합 정보 포함", () => {
      const sections = mapDataToSections(makeBundle());
      const s1 = sections.get(1)!;
      expect(s1).toContain("AI 보안 솔루션");
      expect(s1).toContain("Type B");
      expect(s1).toContain("Green");
      expect(s1).toContain("시장 요약");
      expect(s1).toContain("기술에서 시작");
    });

    it("Section 2 (Business Overview) — 메타 정보", () => {
      const sections = mapDataToSections(makeBundle());
      const s2 = sections.get(2)!;
      expect(s2).toContain("제목:");
      expect(s2).toContain("AI 보안 솔루션");
      expect(s2).toContain("출처:");
      expect(s2).toContain("분류 결과");
      expect(s2).toContain("시작점:");
    });

    it("Section 3~9 — 기준 기반 매핑 (evidence 포함)", () => {
      const sections = mapDataToSections(makeBundle());
      // Section 3 maps to criterion 1
      expect(sections.get(3)).toContain("근거 1");
      // Section 5 maps to criterion 2
      expect(sections.get(5)).toContain("근거 2");
      // Section 6 maps to criteria 3, 8
      expect(sections.get(6)).toContain("근거 3");
      expect(sections.get(6)).toContain("근거 8");
      // Section 7 maps to criterion 5
      expect(sections.get(7)).toContain("근거 5");
      // Section 9 maps to criteria 6, 7
      expect(sections.get(9)).toContain("근거 6");
      expect(sections.get(9)).toContain("근거 7");
    });

    it("Section 5 — 트렌드 데이터 보강 (TAM/SAM/SOM)", () => {
      const sections = mapDataToSections(makeBundle());
      const s5 = sections.get(5)!;
      expect(s5).toContain("시장 트렌드");
      expect(s5).toContain("TAM: $50B");
      expect(s5).toContain("SAM: $10B");
      expect(s5).toContain("SOM: $1B");
    });

    it("Section 6 — 경쟁사 데이터 보강", () => {
      const sections = mapDataToSections(makeBundle());
      const s6 = sections.get(6)!;
      expect(s6).toContain("경쟁사A");
    });

    it("Section 10 (부록) — 평가 결과 포함", () => {
      const sections = mapDataToSections(makeBundle());
      const s10 = sections.get(10)!;
      expect(s10).toContain("종합 평가");
      expect(s10).toContain("Green");
      expect(s10).toContain("7.5");
      expect(s10).toContain("페르소나별 점수");
      expect(s10).toContain("cto");
      expect(s10).toContain("인력 확보 어려움");
    });

    it("평가 없으면 Section 10에 '평가 미실시'", () => {
      const sections = mapDataToSections(makeBundle({ evaluation: null }));
      expect(sections.get(10)).toContain("평가 미실시");
    });

    it("데이터 누락 시 플레이스홀더", () => {
      const sections = mapDataToSections(makeBundle({
        criteria: [],
        contexts: [],
        trendReport: null,
        classification: null,
        evaluation: null,
        startingPoint: null,
      }));
      // Sections with no evidence should show placeholder
      expect(sections.get(3)).toContain("데이터 수집 필요");
      expect(sections.get(7)).toContain("데이터 수집 필요");
    });

    it("분석 컨텍스트가 관련 섹션에 포함", () => {
      const sections = mapDataToSections(makeBundle());
      // Contexts are included when criteria are non-pending
      const s3 = sections.get(3)!;
      expect(s3).toContain("분석 Step");
    });
  });

  describe("renderBpMarkdown", () => {
    it("마크다운 형식으로 렌더링", () => {
      const sections = mapDataToSections(makeBundle());
      const md = renderBpMarkdown({ title: "AI 보안 솔루션", description: "설명" }, sections);
      expect(md).toContain("# 사업계획서 초안 — AI 보안 솔루션");
      expect(md).toContain("> 설명");
      expect(md).toContain("자동 생성일:");
      expect(md).toContain("## 1. 요약");
      expect(md).toContain("## 10. 부록");
    });

    it("description 없으면 생략", () => {
      const sections = new Map<number, string>();
      sections.set(1, "내용");
      const md = renderBpMarkdown({ title: "테스트", description: null }, sections);
      expect(md).toContain("# 사업계획서 초안 — 테스트");
      expect(md).not.toContain("> null");
    });
  });

  describe("formatItemType", () => {
    it("type_a → Type A 라벨", () => {
      expect(formatItemType("type_a")).toContain("Type A");
      expect(formatItemType("type_a")).toContain("벤치마크");
    });

    it("type_b → Type B 라벨", () => {
      expect(formatItemType("type_b")).toContain("Type B");
      expect(formatItemType("type_b")).toContain("트렌드");
    });

    it("type_c → Type C 라벨", () => {
      expect(formatItemType("type_c")).toContain("Type C");
      expect(formatItemType("type_c")).toContain("고객 Pain");
    });

    it("알 수 없는 유형은 그대로 반환", () => {
      expect(formatItemType("unknown")).toBe("unknown");
    });
  });

  describe("formatVerdict", () => {
    it("green → Green 라벨", () => {
      expect(formatVerdict("green")).toContain("Green");
    });

    it("keep → Keep 라벨", () => {
      expect(formatVerdict("keep")).toContain("Keep");
    });

    it("red → Red 라벨", () => {
      expect(formatVerdict("red")).toContain("Red");
    });

    it("알 수 없는 verdict는 그대로 반환", () => {
      expect(formatVerdict("unknown")).toBe("unknown");
    });
  });
});
