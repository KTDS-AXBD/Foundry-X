/**
 * Sprint 154: F342 Discovery UI/UX v2 — 공유 타입 정의
 */

export interface PersonaWeights {
  strategic_fit: number;
  market_potential: number;
  technical_feasibility: number;
  financial_viability: number;
  competitive_advantage: number;
  risk_assessment: number;
  team_readiness: number;
}

export interface PersonaConfig {
  id: string;
  orgId: string;
  itemId: string;
  personaId: string;
  personaName: string;
  personaRole: string;
  weights: PersonaWeights;
  contextJson: Record<string, unknown>;
}

export interface PersonaEval {
  id: string;
  orgId: string;
  itemId: string;
  personaId: string;
  scores: PersonaWeights;
  verdict: 'Go' | 'Conditional' | 'NoGo';
  summary: string;
  concern: string | null;
  condition: string | null;
}

export interface DiscoveryReport {
  id: string;
  orgId: string;
  itemId: string;
  reportJson: Record<string, unknown>;
  overallVerdict: 'Go' | 'Conditional' | 'NoGo' | null;
  teamDecision: 'Go' | 'Hold' | 'Drop' | null;
  sharedToken: string | null;
}

export interface TeamReview {
  id: string;
  orgId: string;
  itemId: string;
  reviewerId: string;
  reviewerName: string;
  decision: 'Go' | 'Hold' | 'Drop';
  comment: string | null;
}

export type Intensity = 'core' | 'normal' | 'light';
export type DiscoveryTypeV2 = 'I' | 'M' | 'P' | 'T' | 'S';

/** 5유형×7단계 강도 매트릭스 — analysis-path-v82.ts와 동일, 프론트엔드용 */
export const INTENSITY_MATRIX: Record<string, Record<DiscoveryTypeV2, Intensity>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};

export const INTENSITY_LABELS: Record<Intensity, { symbol: string; label: string }> = {
  core: { symbol: "★", label: "핵심" },
  normal: { symbol: "○", label: "보통" },
  light: { symbol: "△", label: "간소" },
};

export const DISCOVERY_TYPE_NAMES_V2: Record<DiscoveryTypeV2, string> = {
  I: "아이디어형",
  M: "시장·타겟형",
  P: "고객문제형",
  T: "기술형",
  S: "기존서비스형",
};

export const DEFAULT_WEIGHTS: PersonaWeights = {
  strategic_fit: 20,
  market_potential: 15,
  technical_feasibility: 15,
  financial_viability: 15,
  competitive_advantage: 10,
  risk_assessment: 15,
  team_readiness: 10,
};

export const DEFAULT_PERSONAS: Array<{ id: string; name: string; role: string }> = [
  { id: "strategy", name: "전략담당", role: "사업 전략 및 비전 평가" },
  { id: "sales", name: "영업담당", role: "고객 접점 및 수주 가능성" },
  { id: "ap-biz", name: "AP사업담당", role: "파트너십 및 서비스 확장성" },
  { id: "ai-tech", name: "AI기술담당", role: "기술 실현 가능성 및 차별화" },
  { id: "finance", name: "재무담당", role: "수익성 및 투자 효율" },
  { id: "security", name: "보안담당", role: "보안/규제 리스크" },
  { id: "partner", name: "파트너담당", role: "외부 파트너 생태계" },
  { id: "product", name: "제품담당", role: "제품 완성도 및 사용자 경험" },
];

export const WEIGHT_AXES = [
  { key: "strategic_fit" as const, label: "전략 적합성" },
  { key: "market_potential" as const, label: "시장 잠재력" },
  { key: "technical_feasibility" as const, label: "기술 실현성" },
  { key: "financial_viability" as const, label: "재무 건전성" },
  { key: "competitive_advantage" as const, label: "경쟁 우위" },
  { key: "risk_assessment" as const, label: "리스크 평가" },
  { key: "team_readiness" as const, label: "팀 준비도" },
] as const;
