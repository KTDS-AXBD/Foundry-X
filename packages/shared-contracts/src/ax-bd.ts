/**
 * AX BD 도메인 공용 비즈니스 타입 (v1.0)
 *
 * 규칙: 타입과 인터페이스만 — 구현 함수, 클래스, DB 접근 코드 금지.
 * 소비자: fx-shaping (BMC, Shaping 파이프라인), fx-discovery (Idea, Evaluation)
 *
 * @see packages/shared-contracts/DESIGN.md
 */

// ── BMC ──────────────────────────────────────────────────────

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

export interface IdeaBmcLink {
  id: string;
  ideaId: string;
  bmcId: string;
  createdAt: number;
}

export interface BmcComment {
  id: string;
  bmcId: string;
  blockType?: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: number;
}

// ── Evaluation ───────────────────────────────────────────────

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

// ── Shaping 파이프라인 타입 ───────────────────────────────────

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
