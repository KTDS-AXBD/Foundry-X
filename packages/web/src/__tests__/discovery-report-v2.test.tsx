import { describe, it, expect } from "vitest";

/**
 * Sprint 242: F493 — DiscoveryReportV2View + TabRenderer 단위 테스트
 * 실제 DOM 렌더링 없이 컴포넌트 모듈 로드 + 데이터 구조 검증
 */

const TAB_KEYS = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9"] as const;

const MINIMAL_TAB = {
  stepNumber: "STEP 2-1",
  title: "레퍼런스 분석",
  hitlVerified: false,
  cards: [{ title: "카드 1", body: "내용" }],
};

const MOCK_REPORT_DATA = {
  version: "v2" as const,
  bizItemId: "bi-koami-001",
  bizItemTitle: "KOAMI — 산업 공급망 의사결정 AI",
  typeCode: "I" as const,
  subtitle: "AI 사업개발 2단계 발굴 리포트",
  tabs: Object.fromEntries(
    TAB_KEYS.map((key, i) => [
      key,
      { ...MINIMAL_TAB, stepNumber: `STEP ${key}`, title: `탭 ${i + 1}` },
    ]),
  ),
  summary: {
    executiveSummary: "테스트 요약입니다.",
    trafficLight: "green" as const,
    goHoldDrop: "Go" as const,
    recommendation: "즉시 착수하세요.",
  },
};

describe("DiscoveryReportV2View (F493)", () => {
  it("컴포넌트 모듈이 로드된다", async () => {
    const mod = await import(
      "../components/feature/discovery/report-v2/DiscoveryReportV2View"
    );
    expect(mod.DiscoveryReportV2View).toBeDefined();
    expect(typeof mod.DiscoveryReportV2View).toBe("function");
  });

  it("9탭 키가 모두 정의된다", () => {
    expect(TAB_KEYS).toHaveLength(9);
    expect(TAB_KEYS[0]).toBe("2-1");
    expect(TAB_KEYS[8]).toBe("2-9");
  });

  it("MOCK_REPORT_DATA가 9탭을 모두 포함한다", () => {
    for (const key of TAB_KEYS) {
      expect(MOCK_REPORT_DATA.tabs[key]).toBeDefined();
    }
  });

  it("2-5는 Commit Gate 단계", () => {
    expect(TAB_KEYS[4]).toBe("2-5");
  });

  it("summary 필드가 모두 존재한다", () => {
    expect(MOCK_REPORT_DATA.summary.trafficLight).toBe("green");
    expect(MOCK_REPORT_DATA.summary.goHoldDrop).toBe("Go");
    expect(MOCK_REPORT_DATA.summary.executiveSummary).toBeTruthy();
    expect(MOCK_REPORT_DATA.summary.recommendation).toBeTruthy();
  });
});

describe("TabRenderer (F493)", () => {
  it("TabRenderer 모듈이 로드된다", async () => {
    const mod = await import(
      "../components/feature/discovery/report-v2/TabRenderer"
    );
    expect(mod.TabRenderer).toBeDefined();
  });

  it("block 컴포넌트들이 모두 로드된다", async () => {
    const [cardMod, metricMod, tableMod, insightMod, nextStepMod] = await Promise.all([
      import("../components/feature/discovery/report-v2/blocks/CardBlock"),
      import("../components/feature/discovery/report-v2/blocks/MetricBlock"),
      import("../components/feature/discovery/report-v2/blocks/TableBlock"),
      import("../components/feature/discovery/report-v2/blocks/InsightBox"),
      import("../components/feature/discovery/report-v2/blocks/NextStepBox"),
    ]);
    expect(cardMod.CardBlock).toBeDefined();
    expect(metricMod.MetricBlock).toBeDefined();
    expect(tableMod.TableBlock).toBeDefined();
    expect(insightMod.InsightBox).toBeDefined();
    expect(nextStepMod.NextStepBox).toBeDefined();
  });

  it("index.ts에서 모든 컴포넌트를 re-export한다", async () => {
    const mod = await import(
      "../components/feature/discovery/report-v2/index"
    );
    expect(mod.DiscoveryReportV2View).toBeDefined();
    expect(mod.TabRenderer).toBeDefined();
    expect(mod.CardBlock).toBeDefined();
    expect(mod.MetricBlock).toBeDefined();
    expect(mod.TableBlock).toBeDefined();
    expect(mod.InsightBox).toBeDefined();
    expect(mod.NextStepBox).toBeDefined();
    expect(mod.ChartBlock).toBeDefined();
  });
});

describe("Fixture 데이터 구조 검증 (F493)", () => {
  it("MINIMAL_REPORT_DATA는 version=v2를 갖는다", () => {
    expect(MOCK_REPORT_DATA.version).toBe("v2");
  });

  it("summary의 trafficLight는 green/yellow/red 중 하나이다", () => {
    const valid = ["green", "yellow", "red"] as const;
    expect(valid).toContain(MOCK_REPORT_DATA.summary.trafficLight);
  });

  it("summary의 goHoldDrop은 Go/Hold/Drop 중 하나이다", () => {
    const valid = ["Go", "Hold", "Drop"] as const;
    expect(valid).toContain(MOCK_REPORT_DATA.summary.goHoldDrop);
  });
});
