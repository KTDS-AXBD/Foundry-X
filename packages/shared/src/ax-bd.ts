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
