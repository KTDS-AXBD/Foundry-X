/**
 * Discovery 도메인 public API 계약 (v1.0)
 *
 * 규칙: 타입과 인터페이스만 — 구현 함수, 클래스, DB 접근 코드 금지.
 * 소비자: fx-shaping (BdArtifact, ExecuteSkillInput 등), fx-discovery (DiscoveryReportResponse)
 *
 * @see packages/shared-contracts/DESIGN.md
 */

// ── BD Artifact ──────────────────────────────────────────────

export interface ExecuteSkillInput {
  /** @format hex(randomblob(16)) lowercase */
  bizItemId: string;
  stageId: string;
  inputText: string;
}

export interface ArtifactListQuery {
  bizItemId?: string;
  stageId?: string;
  skillId?: string;
  status?: "pending" | "running" | "completed" | "failed" | "approved" | "rejected";
  page?: number;
  limit?: number;
}

export interface BdArtifact {
  id: string;
  orgId: string;
  /** @format hex(randomblob(16)) lowercase — 생산자: foundry-x-db biz_items */
  bizItemId: string;
  skillId: string;
  stageId: string;
  version: number;
  inputText: string;
  outputText: string | null;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: "pending" | "running" | "completed" | "failed" | "approved" | "rejected";
  createdBy: string;
  /** @format ISO 8601 UTC — 생산자: datetime('now') D1 */
  createdAt: string;
}

export interface SkillExecutionResult {
  artifactId: string;
  skillId: string;
  version: number;
  outputText: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: "completed" | "failed";
}

// ── Discovery Pipeline ────────────────────────────────────────

export interface TriggerShapingInput {
  mode: "hitl" | "auto";
  maxIterations?: number;
}

// ── Discovery-X 연동 계약 (fx-shaping 소비) ──────────────────

export interface DiscoveryIngestPayload {
  version: "v1";
  source: DiscoveryCollectionSource;
  timestamp: number;
  data: DiscoveryDataItem[];
}

export interface DiscoveryCollectionSource {
  id: string;
  type: "market_trend" | "competitor" | "pain_point" | "technology" | "regulation";
  name: string;
  url?: string;
}

export interface DiscoveryDataItem {
  id: string;
  sourceId: string;
  type: DiscoveryCollectionSource["type"];
  title: string;
  summary: string;
  content?: string;
  tags: string[];
  confidence: number;
  collectedAt: number;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryStatus {
  connected: boolean;
  lastSyncAt: number | null;
  pendingItems: number;
  failedItems: number;
  version: string;
}

// ── Discovery Report (fx-discovery 소비) ─────────────────────

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

export interface DiscoveryReportResponse {
  id: string;
  /** @format hex(randomblob(16)) lowercase */
  bizItemId: string;
  title: string;
  type: "I" | "M" | "P" | "T" | "S" | null;
  completedStages: string[];
  overallProgress: number;
  tabs: Record<string, unknown>;
}
