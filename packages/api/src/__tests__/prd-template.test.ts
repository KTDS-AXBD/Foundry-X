import { describe, it, expect } from "vitest";
import { PRD_SECTIONS, mapCriteriaToSections, renderPrdMarkdown } from "../services/prd-template.js";
import type { DiscoveryCriterion } from "../services/discovery-criteria.js";
import type { AnalysisContext } from "../services/analysis-context.js";

function makeCriterion(id: number, status: "completed" | "pending", evidence: string | null = null): DiscoveryCriterion {
  return {
    id: `c-${id}`,
    bizItemId: "item-1",
    criterionId: id,
    name: `기준 ${id}`,
    condition: `조건 ${id}`,
    status,
    evidence,
    completedAt: status === "completed" ? "2026-03-24" : null,
    updatedAt: "2026-03-24",
  };
}

function makeContext(stepOrder: number, pmSkill: string, outputText: string): AnalysisContext {
  return {
    id: `ctx-${stepOrder}`,
    bizItemId: "item-1",
    stepOrder,
    pmSkill,
    inputSummary: null,
    outputText,
    createdAt: "2026-03-24",
  };
}

describe("PRD Template (F185)", () => {
  it("PRD_SECTIONS — 10개 섹션 정의", () => {
    expect(PRD_SECTIONS).toHaveLength(10);
    expect(PRD_SECTIONS[0].title).toContain("요약");
    expect(PRD_SECTIONS[9].title).toContain("오픈 이슈");
  });

  it("mapCriteriaToSections — evidence 매핑", () => {
    const criteria = [
      makeCriterion(1, "completed", "고객 A, B 세그먼트 정의됨"),
      makeCriterion(2, "completed", "SOM 30억원"),
      ...Array.from({ length: 7 }, (_, i) => makeCriterion(i + 3, "pending")),
    ];
    const contexts = [makeContext(1, "/interview", "인터뷰 결과 요약")];

    const map = mapCriteriaToSections(criteria, contexts);
    expect(map.size).toBe(10);

    // Section 2 (문제 정의) should contain criterion 1 evidence
    const sec2 = map.get(2)!;
    expect(sec2).toContain("고객 A, B 세그먼트 정의됨");

    // Section 4 (시장 기회) should contain criterion 2 evidence
    const sec4 = map.get(4)!;
    expect(sec4).toContain("SOM 30억원");

    // Section 10 (오픈 이슈) should list pending items
    const sec10 = map.get(10)!;
    expect(sec10).toContain("pending");
  });

  it("renderPrdMarkdown — 마크다운 렌더링", () => {
    const sectionContents = new Map<number, string>();
    sectionContents.set(1, "전체 요약 내용");
    sectionContents.set(2, "문제 정의 내용");
    for (let i = 3; i <= 10; i++) {
      sectionContents.set(i, `섹션 ${i} 내용`);
    }

    const md = renderPrdMarkdown(
      { title: "AI 보안 솔루션", description: "AI 기반 보안" },
      sectionContents,
    );

    expect(md).toContain("# PRD — AI 보안 솔루션");
    expect(md).toContain("> AI 기반 보안");
    expect(md).toContain("## 1. 요약 (Executive Summary)");
    expect(md).toContain("전체 요약 내용");
    expect(md).toContain("## 10. 오픈 이슈");
  });

  it("mapCriteriaToSections — 모든 completed 시 오픈 이슈 없음", () => {
    const criteria = Array.from({ length: 9 }, (_, i) =>
      makeCriterion(i + 1, "completed", `근거 ${i + 1}`),
    );
    const map = mapCriteriaToSections(criteria, []);
    const sec10 = map.get(10)!;
    expect(sec10).toContain("모든 Discovery 기준이 충족");
  });
});
