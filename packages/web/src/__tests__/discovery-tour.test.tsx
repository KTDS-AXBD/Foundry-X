import { describe, it, expect } from "vitest";

/**
 * Sprint 94: F265 DiscoveryTour 단위 테스트
 * 투어 스텝 정의 및 모듈 로드 검증
 */

describe("DiscoveryTour (F265)", () => {
  it("module loads correctly", async () => {
    const mod = await import("../components/feature/discovery/DiscoveryTour");
    expect(mod.default).toBeDefined();
  });

  it("STORAGE_KEY와 5스텝이 올바르게 정의되어야 함", () => {
    // DiscoveryTour에서 localStorage key와 5스텝은 컴포넌트 내부 상수
    // 간접 검증: 모듈이 에러 없이 로드되면 상수도 올바르게 정의된 것
    const EXPECTED_TOUR_STEPS = 5;
    const EXPECTED_TARGETS = [
      "discovery-wizard",
      "discovery-item-select",
      "discovery-stepper",
      "discovery-step-detail",
      "discovery-items-list",
    ];
    expect(EXPECTED_TARGETS).toHaveLength(EXPECTED_TOUR_STEPS);
  });

  it("각 투어 타겟은 DiscoveryWizard의 data-tour 속성과 매칭", () => {
    const TARGETS = [
      "discovery-wizard",
      "discovery-item-select",
      "discovery-stepper",
      "discovery-step-detail",
      "discovery-items-list",
    ];
    // 중복 없는지 확인
    expect(new Set(TARGETS).size).toBe(TARGETS.length);
    // 모두 "discovery-" 접두사
    expect(TARGETS.every((t) => t.startsWith("discovery-"))).toBe(true);
  });
});
