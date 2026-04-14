/**
 * F538: Discovery 도메인 공용 계약 타입 (cross-domain contract)
 * shaping, agent 등 타 도메인에서 discovery 타입이 필요한 경우 여기서 import.
 *
 * 이 파일은 discovery 도메인의 public API 계약만 포함한다.
 * discovery 내부 구현 타입은 packages/fx-discovery에만 있음.
 */

// ── BD Artifact (shaping 도메인에서 사용) ─────────────────

export interface ExecuteSkillInput {
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

// ── Discovery Pipeline (shaping 도메인에서 사용) ──────────

export interface TriggerShapingInput {
  mode: "hitl" | "auto";
  maxIterations?: number;
}
