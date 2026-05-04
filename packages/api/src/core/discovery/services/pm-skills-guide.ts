/**
 * Sprint 53: pm-skills 실행 가이드 정적 데이터 (F184)
 */

export interface PmSkillGuide {
  skill: string;
  name: string;
  purpose: string;
  inputExample: string;
  expectedOutput: string;
  tips: string[];
  relatedCriteria: number[];
}

export const PM_SKILLS_GUIDES: PmSkillGuide[] = [
  {
    skill: "/interview",
    name: "고객 인터뷰 설계 + 분석",
    purpose: "타겟 고객의 실제 Pain Point를 파악하고 JTBD를 도출하기 위해 인터뷰를 설계·분석합니다.",
    inputExample: "우리 타겟은 중소 보험사의 손해사정 담당자입니다. 이들의 업무 비효율과 Pain Point를 파악하고 싶습니다.",
    expectedOutput: "인터뷰 질문 리스트 + 예상 답변 + JTBD 가설 + 검증 방법",
    tips: [
      "기존 분석 컨텍스트가 있으면 함께 제공하면 더 정확한 질문이 나옵니다",
      "인터뷰 결과는 반드시 저장하세요 — Discovery 기준 #1 충족 근거가 됩니다",
    ],
    relatedCriteria: [1],
  },
  {
    skill: "/research-users",
    name: "사용자 리서치 + 세그먼트",
    purpose: "고객 세그먼트를 정의하고, 각 세그먼트의 특성·니즈·규모를 분석합니다.",
    inputExample: "보험 산업의 손해사정 프로세스에 관여하는 주요 사용자 그룹을 분석해주세요.",
    expectedOutput: "2~3개 고객 세그먼트 프로필 + 규모 추정 + 우선순위 + 페르소나",
    tips: [
      "/interview 결과가 있으면 실제 데이터 기반으로 더 정확한 세그먼트가 나옵니다",
    ],
    relatedCriteria: [1],
  },
  {
    skill: "/market-scan",
    name: "시장 규모 + 트렌드 분석",
    purpose: "TAM/SAM/SOM 시장 규모를 추정하고, 주요 시장 트렌드와 성장 동인을 분석합니다.",
    inputExample: "한국 보험 IT 시장의 손해사정 자동화 영역 시장 규모와 성장률을 분석해주세요.",
    expectedOutput: "TAM/SAM/SOM 수치 + 연간 성장률 + why now 트리거 + 규제 환경",
    tips: [
      "가능한 구체적인 시장 범위를 지정하면 SOM이 더 현실적으로 나옵니다",
      "규제/기술 제약도 함께 분석되므로 Discovery 기준 #7도 충족할 수 있습니다",
    ],
    relatedCriteria: [2, 7],
  },
  {
    skill: "/competitive-analysis",
    name: "경쟁사 분석 + 포지셔닝",
    purpose: "직접/간접 경쟁사를 식별하고, 차별화 포지셔닝 공간을 발굴합니다.",
    inputExample: "손해사정 AI 자동화 분야의 국내외 경쟁사를 분석하고 KT DS 관점 차별화 포인트를 도출해주세요.",
    expectedOutput: "경쟁사 3~5개 프로필 + SWOT + 포지셔닝 맵 + 차별화 전략",
    tips: [
      "경쟁사가 적은 영역이면 간접 경쟁(대체재)도 포함해야 합니다",
    ],
    relatedCriteria: [3, 8],
  },
  {
    skill: "/value-proposition",
    name: "가치 제안 설계",
    purpose: "JTBD 기반 가치 제안을 설계하고, 고객이 왜 이 솔루션을 선택해야 하는지 정의합니다.",
    inputExample: "손해사정 AI 자동화의 핵심 가치 제안을 JTBD 프레임워크로 설계해주세요.",
    expectedOutput: "JTBD 문장 + 가치 제안 캔버스 + 차별화 포인트",
    tips: [
      "/interview + /competitive-analysis 결과를 함께 제공하면 더 설득력 있는 가치 제안이 나옵니다",
    ],
    relatedCriteria: [4, 8],
  },
  {
    skill: "/business-model",
    name: "비즈니스 모델 캔버스",
    purpose: "수익 모델, 과금 구조, 유닛 이코노믹스를 설계합니다.",
    inputExample: "손해사정 AI SaaS의 비즈니스 모델을 설계해주세요. KT DS 라이선스/M&C 모델 포함.",
    expectedOutput: "BMC + 과금 모델 + WTP 추정 + 유닛 이코노믹스 초안",
    tips: [
      "KT DS 특성상 라이선스/M&C/구독 혼합 모델이 일반적입니다",
    ],
    relatedCriteria: [5],
  },
  {
    skill: "/pre-mortem",
    name: "사전 부검 + 리스크 식별",
    purpose: "프로젝트 실패 시나리오를 미리 상정하고, 핵심 리스크와 검증 실험을 설계합니다.",
    inputExample: "이 사업 아이템이 실패한다면 가장 큰 이유는 무엇일까요? 핵심 리스크와 검증 방법을 설계해주세요.",
    expectedOutput: "리스크 목록 + 우선순위 + 검증 실험 3개+ + 성공/실패 기준",
    tips: [
      "이 스킬 하나로 Discovery 기준 #6(리스크)과 #9(검증 실험) 두 개를 충족할 수 있습니다",
    ],
    relatedCriteria: [6, 9],
  },
  {
    skill: "/strategy",
    name: "전략 수립 + 우선순위 결정",
    purpose: "분석 결과를 종합하여 전략적 방향과 실행 우선순위를 결정합니다.",
    inputExample: "지금까지의 분석 결과를 종합하여 최적의 시장 진입 전략과 우선순위를 결정해주세요.",
    expectedOutput: "전략 방향 + 우선순위 매트릭스 + 실행 로드맵",
    tips: [
      "이전 단계 분석 결과를 모두 제공해야 종합적인 전략이 나옵니다",
    ],
    relatedCriteria: [4, 6],
  },
  {
    skill: "/brainstorm",
    name: "아이디어 발산 + 수렴",
    purpose: "제약 없이 아이디어를 발산하고, 평가 기준으로 수렴합니다.",
    inputExample: "이 기술을 활용할 수 있는 산업별 Use Case를 최대한 많이 도출해주세요.",
    expectedOutput: "Use Case 목록 + 평가 기준 + 상위 3개 선정 + 선정 근거",
    tips: [
      "발산 단계에서는 제약을 두지 말고, 수렴 단계에서 기준을 적용하세요",
    ],
    relatedCriteria: [],
  },
  {
    skill: "/beachhead-segment",
    name: "비치헤드 시장 선정",
    purpose: "최초 진입할 비치헤드 시장을 선정하고 진입 전략을 설계합니다.",
    inputExample: "손해사정 AI 시장에서 가장 먼저 공략할 비치헤드 시장을 선정해주세요.",
    expectedOutput: "비치헤드 시장 프로필 + 선정 근거 + 진입 전략 + 확장 경로",
    tips: [
      "/research-users와 /market-scan 결과를 기반으로 하면 더 정확합니다",
    ],
    relatedCriteria: [1, 3],
  },
];

export function getSkillGuide(skill: string): PmSkillGuide | undefined {
  return PM_SKILLS_GUIDES.find((g) => g.skill === skill);
}

export function getGuidesForCriterion(criterionId: number): PmSkillGuide[] {
  return PM_SKILLS_GUIDES.filter((g) => g.relatedCriteria.includes(criterionId));
}
