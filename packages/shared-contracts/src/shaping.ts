/**
 * Shaping 도메인 public API 계약 (v1.0)
 *
 * 규칙: 타입과 인터페이스만 — 구현 함수, 클래스, DB 접근 코드 금지.
 * 소비자: fx-discovery (Discovery→Shaping 트리거 계약)
 *
 * @see packages/shared-contracts/DESIGN.md
 */

// ── Shaping 파이프라인 입력 계약 ──────────────────────────────

export interface ShapingTriggerInput {
  /** @format hex(randomblob(16)) lowercase */
  bizItemId: string;
  orgId: string;
  mode: "hitl" | "auto";
  maxIterations?: number;
  requestedBy?: string;
}

export interface ShapingTriggerResult {
  sessionId: string;
  bizItemId: string;
  status: "started" | "queued" | "failed";
  startedAt: string;
}

// ── Shaping 결과 계약 ─────────────────────────────────────────

export type ShapingStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "paused";

export interface ShapingSession {
  id: string;
  bizItemId: string;
  orgId: string;
  status: ShapingStatus;
  currentStage: string | null;
  iterationCount: number;
  maxIterations: number;
  createdAt: string;
  updatedAt: string;
}
