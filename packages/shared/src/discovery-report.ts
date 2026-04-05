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
    [key: string]: unknown;
  };
}
