import { describe, it, expect } from "vitest";
import { renderPrototypeHtml, escapeHtml, SECTION_ORDER, type PrototypeData } from "../services/prototype-templates.js";
import { VERDICT_THEMES } from "../services/prototype-styles.js";
import type { StartingPointType } from "../core/discovery/services/analysis-paths.js";

function makeProtoData(overrides: Partial<PrototypeData> = {}): PrototypeData {
  return {
    title: "AI 보안 솔루션",
    tagline: "기업 보안의 새로운 패러다임",
    problemStatement: "기존 보안 시스템은 실시간 위협에 대응하지 못합니다.",
    solutionOverview: "AI 기반 실시간 위협 탐지 솔루션",
    features: [
      { title: "실시간 탐지", description: "AI가 24시간 위협을 모니터링" },
      { title: "자동 대응", description: "탐지 즉시 자동으로 차단" },
      { title: "대시보드", description: "통합 보안 현황 시각화" },
    ],
    marketStats: [
      { label: "TAM", value: "$50B" },
      { label: "SAM", value: "$5B" },
      { label: "SOM", value: "$500M" },
    ],
    competitors: ["CompA", "CompB"],
    evaluationSummary: "전문가 3인 평가 평균 7.5점",
    personaQuotes: [
      { persona: "CTO", quote: "보안 자동화는 필수입니다." },
    ],
    verdict: "green",
    avgScore: 7.5,
    ctaText: "자세히 알아보기",
    ...overrides,
  };
}

describe("prototype-templates (F181)", () => {
  const startingPoints: StartingPointType[] = ["idea", "market", "problem", "tech", "service"];

  for (const sp of startingPoints) {
    it(`renderPrototypeHtml — ${sp} starting point HTML 유효성`, () => {
      const data = makeProtoData();
      const html = renderPrototypeHtml(data, sp);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html lang=\"ko\">");
      expect(html).toContain("AI 보안 솔루션");
      expect(html).toContain("</html>");
      expect(html).toContain("<style>");
      expect(html).toContain("class=\"hero\"");
      expect(html).toContain("class=\"section\"");
      expect(html).toContain("Foundry-X Discovery Pipeline");
    });
  }

  it("escapeHtml — XSS 방지", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
    );
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeHtml('a"b')).toBe("a&quot;b");
  });

  it("SECTION_ORDER — 5 starting point 모두 정의됨", () => {
    for (const sp of startingPoints) {
      expect(SECTION_ORDER[sp]).toBeDefined();
      expect(SECTION_ORDER[sp]).toContain("hero");
      expect(SECTION_ORDER[sp]).toContain("cta");
      expect(SECTION_ORDER[sp].length).toBe(6);
    }
  });

  it("SECTION_ORDER — starting point별 순서가 다름", () => {
    // idea는 solution이 problem보다 앞
    const ideaOrder = SECTION_ORDER.idea;
    expect(ideaOrder.indexOf("solution")).toBeLessThan(ideaOrder.indexOf("problem"));

    // problem은 problem이 solution보다 앞
    const problemOrder = SECTION_ORDER.problem;
    expect(problemOrder.indexOf("problem")).toBeLessThan(problemOrder.indexOf("solution"));

    // market은 market이 두 번째
    expect(SECTION_ORDER.market[1]).toBe("market");
  });

  it("VERDICT_THEMES — 4가지 테마 컬러 정의", () => {
    expect(VERDICT_THEMES.green.primary).toBe("#059669");
    expect(VERDICT_THEMES.keep.primary).toBe("#d97706");
    expect(VERDICT_THEMES.red.primary).toBe("#dc2626");
    expect(VERDICT_THEMES.default.primary).toBe("#2563eb");

    for (const key of ["green", "keep", "red", "default"] as const) {
      const t = VERDICT_THEMES[key];
      expect(t.primary).toBeTruthy();
      expect(t.bg).toBeTruthy();
      expect(t.accent).toBeTruthy();
      expect(t.text).toBeTruthy();
    }
  });

  it("renderPrototypeHtml — verdict별 테마 적용", () => {
    const greenHtml = renderPrototypeHtml(makeProtoData({ verdict: "green" }), "idea");
    expect(greenHtml).toContain("#059669");

    const redHtml = renderPrototypeHtml(makeProtoData({ verdict: "red" }), "idea");
    expect(redHtml).toContain("#dc2626");

    const defaultHtml = renderPrototypeHtml(makeProtoData({ verdict: "unknown" }), "idea");
    expect(defaultHtml).toContain("#2563eb");
  });
});
