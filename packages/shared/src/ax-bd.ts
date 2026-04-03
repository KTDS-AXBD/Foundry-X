// AX BD 모듈 공유 타입

export type BmcBlockType =
  | "customer_segments"
  | "value_propositions"
  | "channels"
  | "customer_relationships"
  | "revenue_streams"
  | "key_resources"
  | "key_activities"
  | "key_partnerships"
  | "cost_structure";

export interface BmcBlock {
  blockType: BmcBlockType;
  content: string | null;
  updatedAt: number;
}

export interface Bmc {
  id: string;
  ideaId: string | null;
  title: string;
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  blocks: BmcBlock[];
  createdAt: number;
  updatedAt: number;
}

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  createdAt: number;
  updatedAt: number;
}

// Sprint 64: F203 아이디어-BMC 연결
export interface IdeaBmcLink {
  id: string;
  ideaId: string;
  bmcId: string;
  createdAt: number;
}

// Sprint 64: F204 BMC 댓글
export interface BmcComment {
  id: string;
  bmcId: string;
  blockType?: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: number;
}

export interface CommentCounts {
  [blockType: string]: number;
  _total: number;
}

// Sprint 65: F201 BMC 블록 인사이트
export interface BlockInsight {
  title: string;
  description: string;
  suggestedContent: string;
}

export interface InsightResult {
  insights: BlockInsight[];
  processingTimeMs: number;
  model: string;
  masked: boolean;
}

// Sprint 65: F202 시장 키워드 요약
export interface InsightJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  keywords: string[];
  result: MarketSummary | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface MarketSummary {
  summary: string;
  trends: string[];
  opportunities: string[];
  risks: string[];
}

// Sprint 65: F207 평가관리
export type EvalStatus = "draft" | "active" | "go" | "kill" | "hold";
export type KpiCategory = "market" | "tech" | "revenue" | "risk" | "custom";

export interface Evaluation {
  id: string;
  orgId: string;
  ideaId: string | null;
  bmcId: string | null;
  title: string;
  description: string | null;
  ownerId: string;
  status: EvalStatus;
  decisionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Kpi {
  id: string;
  evalId: string;
  name: string;
  category: KpiCategory;
  target: number;
  actual: number | null;
  unit: string;
  achievement: number | null;
  updatedAt: number;
}

export interface EvalHistoryEntry {
  id: string;
  evalId: string;
  actorId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: number;
}

export interface PortfolioSummary {
  total: number;
  byStatus: Record<EvalStatus, number>;
  recentChanges: EvalHistoryEntry[];
}

// Sprint 112: F286+F287 BD 형상화 Phase F

export type ShapingRunStatus = "running" | "completed" | "failed" | "escalated";
export type ShapingMode = "hitl" | "auto";
export type ShapingPhase = "A" | "B" | "C" | "D" | "E" | "F";
export type PhaseVerdict = "PASS" | "MINOR_FIX" | "MAJOR_ISSUE" | "ESCALATED";
export type ExpertRole = "TA" | "AA" | "CA" | "DA" | "QA";
export type HatColor = "white" | "red" | "black" | "yellow" | "green" | "blue";
export type HatVerdict = "accept" | "concern" | "reject";
export type ReviewAction = "approved" | "revision_requested" | "rejected";

export interface ShapingRun {
  id: string;
  tenantId: string;
  discoveryPrdId: string;
  status: ShapingRunStatus;
  mode: ShapingMode;
  currentPhase: ShapingPhase;
  totalIterations: number;
  maxIterations: number;
  qualityScore: number | null;
  tokenCost: number;
  tokenLimit: number;
  gitPath: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ShapingPhaseLog {
  id: string;
  runId: string;
  phase: ShapingPhase;
  round: number;
  inputSnapshot: string | null;
  outputSnapshot: string | null;
  verdict: PhaseVerdict | null;
  qualityScore: number | null;
  findings: string | null;
  durationMs: number | null;
  createdAt: string;
}

export interface ShapingExpertReview {
  id: string;
  runId: string;
  expertRole: ExpertRole;
  reviewBody: string;
  findings: string | null;
  qualityScore: number | null;
  createdAt: string;
}

export interface ShapingSixHats {
  id: string;
  runId: string;
  hatColor: HatColor;
  round: number;
  opinion: string;
  verdict: HatVerdict | null;
  createdAt: string;
}

export interface ShapingRunDetail extends ShapingRun {
  phaseLogs: ShapingPhaseLog[];
  expertReviews: ShapingExpertReview[];
  sixHats: ShapingSixHats[];
}

export interface ReviewResult {
  runId: string;
  section: string;
  action: ReviewAction;
  newStatus: ShapingRunStatus;
}

export interface AutoReviewResult {
  runId: string;
  results: Array<{
    persona: string;
    pass: boolean;
    reasoning: string;
  }>;
  consensus: "approved" | "escalated";
  newStatus: ShapingRunStatus;
}
