/**
 * Sprint 52: 5시작점 분석 경로 정적 데이터 (F182)
 * BDP-002 §4 원문 기반 — 각 시작점별 Discovery 경로 + pm-skills 매핑
 */

export const STARTING_POINTS = ["idea", "market", "problem", "tech", "service"] as const;
export type StartingPointType = (typeof STARTING_POINTS)[number];

export interface AnalysisStep {
  order: number;
  activity: string;
  pmSkills: string[];
  discoveryMapping: number[];
}

export interface AnalysisPath {
  startingPoint: StartingPointType;
  label: string;
  description: string;
  steps: AnalysisStep[];
}

export interface StartingPointResult {
  id: string;
  bizItemId: string;
  startingPoint: StartingPointType;
  confidence: number;
  reasoning: string;
  needsConfirmation: boolean;
  confirmedBy: string | null;
  confirmedAt: string | null;
  classifiedAt: string;
}

export const ANALYSIS_PATHS: Record<StartingPointType, AnalysisPath> = {
  idea: {
    startingPoint: "idea",
    label: "아이디어에서 시작",
    description: "솔루션 아이디어는 있지만 근거가 없다",
    steps: [
      { order: 1, activity: "아이디어/솔루션 입력", pmSkills: [], discoveryMapping: [] },
      { order: 2, activity: "아이디어 핵심 파악 + Pain Point 가설 생성", pmSkills: ["/brainstorm"], discoveryMapping: [1] },
      { order: 3, activity: "타깃 고객 JTBD 나열 + 인터뷰 반영", pmSkills: ["/interview"], discoveryMapping: [1, 4] },
      { order: 4, activity: "고객 세그먼트 생성 + 문제 심도 측정", pmSkills: ["/research-users"], discoveryMapping: [1] },
      { order: 5, activity: "타깃 고객 인터뷰 + 실질 문제 확인", pmSkills: ["/interview"], discoveryMapping: [1, 9] },
      { order: 6, activity: "리서치 결론 — 문제-솔루션 방향 확정 or 피봇", pmSkills: ["/strategy"], discoveryMapping: [4, 6] },
      { order: 7, activity: "시장 규모 + 경쟁사 분석", pmSkills: ["/competitive-analysis", "/market-scan"], discoveryMapping: [2, 3] },
      { order: 8, activity: "수익 구조 + 리스크 + 규제/기술 제약 + 차별화", pmSkills: ["/business-model", "/value-proposition"], discoveryMapping: [5, 6, 7, 8] },
    ],
  },
  market: {
    startingPoint: "market",
    label: "시장 또는 타겟에서 시작",
    description: "누구를 볼지는 알지만 무엇을 만들지는 모른다",
    steps: [
      { order: 1, activity: "시장 또는 타겟 고객 입력", pmSkills: [], discoveryMapping: [] },
      { order: 2, activity: "타깃 고객 JTBD 나열 + 인터뷰 반영", pmSkills: ["/interview"], discoveryMapping: [1, 4] },
      { order: 3, activity: "핵심 검증 + 현장 대화 수집", pmSkills: ["/research-users"], discoveryMapping: [1] },
      { order: 4, activity: "리서치 결론 — 문제 해결 우선순위 선정", pmSkills: ["/strategy"], discoveryMapping: [4, 6] },
      { order: 5, activity: "문제 기반 솔루션 아이디에이션 + 컨셉 분석", pmSkills: ["/brainstorm"], discoveryMapping: [1, 4] },
      { order: 6, activity: "시장 규모 정량화 + 수익 구조 생성", pmSkills: ["/market-scan", "/business-model"], discoveryMapping: [2, 5] },
      { order: 7, activity: "리스크 + 규제/기술 제약 + 차별화 요소 병행", pmSkills: ["/value-proposition"], discoveryMapping: [6, 7, 8] },
    ],
  },
  problem: {
    startingPoint: "problem",
    label: "고객 문제에서 시작",
    description: "고객의 문제는 발견했지만 해결 방법이 없다",
    steps: [
      { order: 1, activity: "고객 문제 설명 입력", pmSkills: [], discoveryMapping: [] },
      { order: 2, activity: "기술 트렌드 + 산업별 시장 구조 입력", pmSkills: ["/market-scan"], discoveryMapping: [2, 7] },
      { order: 3, activity: "아이디어 형상 결정 + 고객 인터뷰 + WTP 조사", pmSkills: ["/interview", "/research-users"], discoveryMapping: [1, 4] },
      { order: 4, activity: "산업별 Use Case 목록", pmSkills: ["/competitive-analysis"], discoveryMapping: [3] },
      { order: 5, activity: "해석 결론 — Use Case 확인 (산업별 필터/검증)", pmSkills: ["/strategy"], discoveryMapping: [4, 6] },
      { order: 6, activity: "문제 전환 근거 검토 + 정의 (시뮬레이션/비즈해석)", pmSkills: ["/business-model"], discoveryMapping: [5] },
      { order: 7, activity: "고객 세그먼트 + 경쟁사 분석", pmSkills: ["/beachhead-segment", "/competitive-analysis"], discoveryMapping: [1, 3] },
      { order: 8, activity: "새로운 가치 제안 + 수익 구조 변환 시뮬레이션", pmSkills: ["/value-proposition"], discoveryMapping: [4, 8] },
      { order: 9, activity: "수익 구조 + 가치 제안 + 리스크 병행", pmSkills: ["/business-model"], discoveryMapping: [5, 6, 9] },
    ],
  },
  tech: {
    startingPoint: "tech",
    label: "기술에서 시작",
    description: "강력한 기술은 있지만 어디에 쓸지 모른다",
    steps: [
      { order: 1, activity: "기술명/트렌드 보고 입력", pmSkills: [], discoveryMapping: [] },
      { order: 2, activity: "기술 핵심 분석 + 산업별 적용 분야 매핑", pmSkills: ["/market-scan"], discoveryMapping: [2, 7] },
      { order: 3, activity: "산업별 Use Case 목록", pmSkills: ["/brainstorm"], discoveryMapping: [1, 4] },
      { order: 4, activity: "해석 결론 — Use Case 확인 (산업별/비즈시나리오)", pmSkills: ["/strategy"], discoveryMapping: [4, 6] },
      { order: 5, activity: "리서치 결론 — 시장 규모 + AI 기회 변화와 수요 추정", pmSkills: ["/market-scan"], discoveryMapping: [2] },
      { order: 6, activity: "신규 경쟁사 분석 + 흐름 확인", pmSkills: ["/competitive-analysis"], discoveryMapping: [3, 8] },
      { order: 7, activity: "리서치 결론 — 시장 전략 선택 (기존확장/신규)", pmSkills: ["/strategy"], discoveryMapping: [4, 5] },
      { order: 8, activity: "핵심 리스크 + 최소 검증 실험 설계", pmSkills: ["/pre-mortem"], discoveryMapping: [6, 9] },
    ],
  },
  service: {
    startingPoint: "service",
    label: "기존 서비스에서 시작",
    description: "운영 중인 서비스에서 신규 사업 확장을 탐색한다",
    steps: [
      { order: 1, activity: "기존 서비스 현황 + 비즈니스 구조 입력", pmSkills: [], discoveryMapping: [] },
      { order: 2, activity: "서비스 가치 사슬 분석 + 가치 포착 구조 분석", pmSkills: ["/business-model"], discoveryMapping: [5, 8] },
      { order: 3, activity: "고객 고착화 인터뷰 + AI 기회 변화와 수요 추정", pmSkills: ["/interview", "/research-users"], discoveryMapping: [1, 2] },
      { order: 4, activity: "기존 서비스 정량 기반 모형 형상 설정", pmSkills: ["/market-scan"], discoveryMapping: [2, 3] },
    ],
  },
};

export function getAnalysisPath(startingPoint: StartingPointType): AnalysisPath {
  return ANALYSIS_PATHS[startingPoint];
}
