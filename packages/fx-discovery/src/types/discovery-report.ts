/**
 * Sprint 156: F346+F347 — 발굴 완료 리포트 타입
 */

/** 탭 2-1: 레퍼런스 분석 */
export interface ReferenceAnalysisData {
  threeLayers?: {
    macro: Array<{ factor: string; trend: string; impact: string }>;
    meso: Array<{ factor: string; trend: string; impact: string }>;
    micro: Array<{ factor: string; trend: string; impact: string }>;
  };
  jtbd?: Array<{
    job: string;
    current: string;
    painLevel: number;
    frequency: string;
  }>;
  competitors?: Array<{
    name: string;
    strength: string;
    weakness: string;
    share?: string;
  }>;
}

/** 탭 2-2: 시장 검증 */
export interface MarketValidationData {
  tam?: { value: number; unit: string; description: string };
  sam?: { value: number; unit: string; description: string };
  som?: { value: number; unit: string; description: string };
  painPoints?: Array<{
    pain: string;
    severity: number;
    frequency: string;
    segment: string;
  }>;
  roi?: {
    investment: number;
    return: number;
    period: string;
    metrics: Array<{ label: string; value: string }>;
  };
}

/** 탭 2-3: 경쟁 구도 */
export interface CompetitiveLandscapeData {
  swot?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  porter?: {
    axes: Array<{ axis: string; score: number; description: string }>;
  };
  positioning?: Array<{
    name: string;
    x: number;
    y: number;
    isOurs?: boolean;
  }>;
}

/** 탭 2-4: 기회 도출 */
export interface OpportunityIdeationData {
  hmw?: Array<{
    question: string;
    category: string;
    priority: number;
  }>;
  bmc?: {
    keyPartners: string[];
    keyActivities: string[];
    keyResources: string[];
    valuePropositions: string[];
    customerRelationships: string[];
    channels: string[];
    customerSegments: string[];
    costStructure: string[];
    revenueStreams: string[];
  };
  phases?: Array<{
    phase: string;
    description: string;
    duration: string;
    deliverables: string[];
  }>;
}

/** 탭 2-5: 기회 선정 */
export interface OpportunityScoringData {
  iceMatrix?: Array<{
    opportunity: string;
    impact: number;
    confidence: number;
    ease: number;
    totalScore: number;
  }>;
  goNoGoGate?: Array<{
    criterion: string;
    passed: boolean;
    note?: string;
  }>;
  recommendation?: string;
}

/** 탭 2-6: 고객 페르소나 */
export interface CustomerPersonaData {
  personas?: Array<{
    name: string;
    role: string;
    demographics: string;
    goals: string[];
    painPoints: string[];
    behaviors: string[];
    quote?: string;
  }>;
  journeySteps?: Array<{
    stage: string;
    action: string;
    emotion: string;
    touchpoint: string;
    opportunity: string;
  }>;
}

/** 탭 2-7: 비즈니스 모델 */
export interface BusinessModelData {
  bmc?: {
    keyPartners: string[];
    keyActivities: string[];
    keyResources: string[];
    valuePropositions: string[];
    customerRelationships: string[];
    channels: string[];
    customerSegments: string[];
    costStructure: string[];
    revenueStreams: string[];
  };
  unitEconomics?: {
    cac: number;
    ltv: number;
    arpu: number;
    grossMargin: number;
    paybackMonths: number;
    metrics: Array<{ label: string; value: string; unit: string }>;
  };
  revenueScenarios?: Array<{
    scenario: string;
    year1: number;
    year2: number;
    year3: number;
    assumptions: string[];
  }>;
}

/** 탭 2-8: 패키징 */
export interface PackagingData {
  gtmStrategy?: {
    beachhead: string;
    targetSegment: string;
    positioning: string;
    channels: string[];
    pricing?: string;
  };
  executiveSummary?: {
    problem: string;
    solution: string;
    uniqueValue: string;
    targetMarket: string;
    businessModel: string;
    askAmount?: string;
  };
  milestones?: Array<{
    phase: string;
    deliverables: string[];
    timeline: string;
    kpis: string[];
  }>;
}

/** 탭 2-9: 페르소나 평가 결과 */
export interface PersonaEvalResultData {
  overallScore?: number;
  overallVerdict?: "Go" | "Conditional" | "NoGo";
  radarAxes?: Array<{ axis: string; score: number }>;
  personaResults?: Array<{
    personaId: string;
    personaName: string;
    personaRole: string;
    verdict: "Go" | "Conditional" | "NoGo";
    score: number;
    summary: string;
    concerns: string[];
    conditions: string[];
  }>;
  consensusSummary?: string;
}

/** 팀 검토 투표 */
export interface TeamReviewVote {
  id: string;
  reviewerId: string;
  reviewerName: string;
  decision: "Go" | "Hold" | "Drop";
  comment: string;
  createdAt: string;
}

/** Executive Summary */
export interface ExecutiveSummaryData {
  oneLiner: string;
  problem: string;
  solution: string;
  market: string;
  competition: string;
  businessModel: string;
  recommendation: string;
  openQuestions: string[];
}

/** Handoff 체크리스트 항목 */
export interface HandoffCheckItem {
  id: string;
  label: string;
  checked: boolean;
  requiredForGo: boolean;
}

/** 전체 리포트 응답 */
export interface DiscoveryReportResponse {
  id: string;
  bizItemId: string;
  title: string;
  type: "I" | "M" | "P" | "T" | "S" | null;
  completedStages: string[];
  overallProgress: number;
  tabs: {
    "2-1"?: ReferenceAnalysisData;
    "2-2"?: MarketValidationData;
    "2-3"?: CompetitiveLandscapeData;
    "2-4"?: OpportunityIdeationData;
    "2-5"?: OpportunityScoringData;
    "2-6"?: CustomerPersonaData;
    "2-7"?: BusinessModelData;
    "2-8"?: PackagingData;
    "2-9"?: PersonaEvalResultData;
    [key: string]: unknown;
  };
}
