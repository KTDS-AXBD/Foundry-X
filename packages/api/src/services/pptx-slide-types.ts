/**
 * F380: PPTX Slide Types + Section→Slide Mapping (Sprint 172)
 * SKILL.md §표준 슬라이드 목차에서 정의된 15종 슬라이드 타입과 매핑
 */

export type SlideType =
  | "title-slide"
  | "toc-slide"
  | "hero-slide"
  | "exec-summary"
  | "content-slide"
  | "data-slide"
  | "compare-slide"
  | "before-after-slide"
  | "scenario-slide"
  | "roadmap-slide"
  | "org-slide"
  | "gan-slide"
  | "impact-slide"
  | "strategy-slide"
  | "closing-slide";

export interface SlideMapping {
  sectionKey: string;
  slideType: SlideType;
  slideCount: number;
  isRequired: boolean;
}

/**
 * 18섹션 → 슬라이드 매핑 (표지/목차/마무리 포함)
 * 필수 31장 + 선택 2장 = 33장 (최대)
 */
export const SECTION_SLIDE_MAP: SlideMapping[] = [
  { sectionKey: "_cover", slideType: "title-slide", slideCount: 1, isRequired: true },
  { sectionKey: "_toc", slideType: "toc-slide", slideCount: 1, isRequired: true },
  { sectionKey: "hero", slideType: "hero-slide", slideCount: 1, isRequired: true },
  { sectionKey: "exec_summary", slideType: "exec-summary", slideCount: 2, isRequired: true },
  { sectionKey: "s01", slideType: "content-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s02_1", slideType: "content-slide", slideCount: 1, isRequired: true },
  { sectionKey: "s02_2", slideType: "content-slide", slideCount: 1, isRequired: true },
  { sectionKey: "s02_3", slideType: "content-slide", slideCount: 1, isRequired: true },
  { sectionKey: "s02_4", slideType: "data-slide", slideCount: 1, isRequired: false },
  { sectionKey: "s02_5", slideType: "compare-slide", slideCount: 1, isRequired: false },
  { sectionKey: "s02_6", slideType: "data-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s03_1", slideType: "before-after-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s03_2", slideType: "scenario-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s03_3", slideType: "roadmap-slide", slideCount: 1, isRequired: true },
  { sectionKey: "s04_1", slideType: "content-slide", slideCount: 1, isRequired: true },
  { sectionKey: "s04_2", slideType: "data-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s04_3", slideType: "data-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s04_4", slideType: "org-slide", slideCount: 1, isRequired: true },
  { sectionKey: "s04_5", slideType: "gan-slide", slideCount: 2, isRequired: true },
  { sectionKey: "s04_6", slideType: "impact-slide", slideCount: 1, isRequired: true },
  { sectionKey: "s05", slideType: "strategy-slide", slideCount: 2, isRequired: true },
  { sectionKey: "_closing", slideType: "closing-slide", slideCount: 1, isRequired: true },
];

/** 데이터 섹션 슬라이드 매핑 조회 */
export function getSlideMapping(sectionKey: string): SlideMapping | undefined {
  return SECTION_SLIDE_MAP.find((m) => m.sectionKey === sectionKey);
}

/** 포함된 섹션 기반 총 슬라이드 수 계산 */
export function calculateTotalSlides(includedSectionKeys: string[]): number {
  const allKeys = new Set(includedSectionKeys);
  // 특수 슬라이드(표지/목차/마무리)는 항상 포함
  allKeys.add("_cover");
  allKeys.add("_toc");
  allKeys.add("_closing");

  return SECTION_SLIDE_MAP.filter((m) => allKeys.has(m.sectionKey)).reduce(
    (sum, m) => sum + m.slideCount,
    0,
  );
}
