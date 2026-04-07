/**
 * Sprint 155 F345: 데모 모드 — 하드코딩 평가 결과
 * API 키 없이 전체 UI 플로우를 체험할 수 있는 fallback 데이터
 */

export interface DemoEvalResult {
  personaId: string;
  scores: Record<string, number>;
  verdict: "green" | "keep" | "red";
  summary: string;
  concerns: string[];
}

export const DEMO_EVAL_DATA: Record<string, DemoEvalResult> = {
  strategy: {
    personaId: "strategy",
    scores: { businessViability: 8.5, strategicFit: 9.0, customerValue: 7.5, techMarket: 8.0, execution: 7.0, financialFeasibility: 7.5, competitiveDiff: 8.5, scalability: 8.0 },
    verdict: "green",
    summary: "KT DS 중장기 전략 방향과 높은 정합성. AI 헬스케어는 성장 시장이며 기존 SI 역량 활용 가능.",
    concerns: ["시장 진입 타이밍이 경쟁사 대비 다소 늦을 수 있음"],
  },
  sales: {
    personaId: "sales",
    scores: { businessViability: 7.0, strategicFit: 6.5, customerValue: 8.0, techMarket: 7.0, execution: 6.0, financialFeasibility: 7.0, competitiveDiff: 6.5, scalability: 7.5 },
    verdict: "keep",
    summary: "기존 헬스케어 고객사(병원 SI) 확장 가능성 있으나, AI 솔루션 영업 경험 부족으로 초기 수주 난이도 높음.",
    concerns: ["AI 솔루션 영업 레퍼런스 부재", "고객 PoC 요구 가능성 높음"],
  },
  ap_biz: {
    personaId: "ap_biz",
    scores: { businessViability: 7.5, strategicFit: 7.0, customerValue: 7.0, techMarket: 8.5, execution: 8.0, financialFeasibility: 6.5, competitiveDiff: 7.0, scalability: 7.0 },
    verdict: "green",
    summary: "기술적 실현 가능. 기존 헬스케어 SI 경험과 AI 역량 조합으로 6개월 내 MVP 가능.",
    concerns: ["의료 데이터 규제(개인정보보호법) 대응 필요"],
  },
  ai_tech: {
    personaId: "ai_tech",
    scores: { businessViability: 8.0, strategicFit: 8.5, customerValue: 8.0, techMarket: 9.0, execution: 7.5, financialFeasibility: 7.0, competitiveDiff: 9.0, scalability: 8.5 },
    verdict: "green",
    summary: "AI 기술 차별성 높음. 의료 영상 분석 + NLP 기반 진료 지원은 시장 수요 강함.",
    concerns: ["학습 데이터 확보에 병원 협력 필수"],
  },
  finance: {
    personaId: "finance",
    scores: { businessViability: 6.5, strategicFit: 7.0, customerValue: 6.0, techMarket: 6.5, execution: 5.5, financialFeasibility: 6.0, competitiveDiff: 7.0, scalability: 6.5 },
    verdict: "keep",
    summary: "BEP 3년 예상. 초기 투자 3억 수준이나 매출 불확실성으로 ROI 검증 필요.",
    concerns: ["투자 회수 기간 불확실", "경쟁사 가격 경쟁 리스크"],
  },
  security: {
    personaId: "security",
    scores: { businessViability: 7.0, strategicFit: 7.5, customerValue: 7.5, techMarket: 7.0, execution: 6.5, financialFeasibility: 7.0, competitiveDiff: 7.0, scalability: 6.0 },
    verdict: "keep",
    summary: "의료 데이터 보안 이슈 관리 가능하나, HIPAA/개인정보보호법 컴플라이언스 추가 비용 발생.",
    concerns: ["의료 데이터 보안 인증 필요", "데이터 거버넌스 체계 구축 선행"],
  },
  customer: {
    personaId: "customer",
    scores: { businessViability: 8.0, strategicFit: 7.5, customerValue: 9.0, techMarket: 8.0, execution: 7.0, financialFeasibility: 7.5, competitiveDiff: 8.0, scalability: 8.0 },
    verdict: "green",
    summary: "고객 관점에서 높은 가치. 진료 효율 30% 향상, 오진율 감소 기대.",
    concerns: ["의료진 AI 도구 수용성 검증 필요"],
  },
  innovation: {
    personaId: "innovation",
    scores: { businessViability: 9.0, strategicFit: 8.5, customerValue: 8.5, techMarket: 9.0, execution: 7.5, financialFeasibility: 7.0, competitiveDiff: 9.5, scalability: 9.0 },
    verdict: "green",
    summary: "혁신성 매우 높음. AI 기반 의료 의사결정 지원은 차세대 핵심 사업 후보.",
    concerns: ["기술 성숙도 vs 시장 기대치 갭 관리 필요"],
  },
};

export interface DemoFinalResult {
  verdict: "green" | "keep" | "red";
  avgScore: number;
  totalConcerns: number;
  scores: Array<DemoEvalResult & { index: number }>;
  warnings: string[];
}

export function getDemoFinalResult(): DemoFinalResult {
  const entries = Object.values(DEMO_EVAL_DATA);
  const allScoreValues = entries.flatMap((e) => Object.values(e.scores));
  const avgScore = Math.round((allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length) * 10) / 10;
  const totalConcerns = entries.reduce((s, e) => s + e.concerns.length, 0);

  // 판정: green 5+/8 → green, red 3+/8 → red, else keep
  const verdictCounts = { green: 0, keep: 0, red: 0 };
  for (const e of entries) verdictCounts[e.verdict]++;

  let verdict: "green" | "keep" | "red" = "keep";
  if (verdictCounts.green >= 5) verdict = "green";
  else if (verdictCounts.red >= 3) verdict = "red";

  return {
    verdict,
    avgScore,
    totalConcerns,
    scores: entries.map((e, i) => ({ ...e, index: i })),
    warnings: [],
  };
}
