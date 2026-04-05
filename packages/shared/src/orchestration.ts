// ─── F335: Orchestration Types — Phase 14 Foundation v3 (Sprint 150) ───

import type { TaskState, EventSource } from "./task-state.js";
import type { TaskEvent } from "./task-event.js";

// ─── Loop Mode ───

/** 3가지 루프 모드 — in-process TS 전용 (Hook은 별도 Layer) */
export type LoopMode = "retry" | "adversarial" | "fix";

// ─── Convergence ───

export interface ConvergenceCriteria {
  /** 최소 품질 점수 (0.0~1.0, 기본 0.7) */
  minQualityScore: number;
  /** 최대 라운드 수 (기본 3) */
  maxRounds: number;
  /** 연속 pass 필요 횟수 (기본 1) */
  requiredConsecutivePass: number;
}

export const DEFAULT_CONVERGENCE: ConvergenceCriteria = {
  minQualityScore: 0.7,
  maxRounds: 3,
  requiredConsecutivePass: 1,
};

// ─── Loop Round Result ───

export interface LoopRoundResult {
  round: number;
  agentName: string;
  qualityScore: number | null;
  feedback: string[];
  status: "pass" | "fail" | "error";
  durationMs: number;
  timestamp: string;
}

// ─── FeedbackLoopContext ───

export type LoopContextStatus = "active" | "resolved" | "exhausted" | "escalated";

export interface FeedbackLoopContext {
  id: string;
  taskId: string;
  tenantId: string;
  entryState: TaskState;
  triggerEventId: string | null;
  loopMode: LoopMode;
  currentRound: number;
  maxRounds: number;
  exitTarget: TaskState;
  convergence: ConvergenceCriteria;
  history: LoopRoundResult[];
  status: LoopContextStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Loop Outcome ───

export type LoopOutcome =
  | { status: "resolved"; exitState: TaskState; rounds: number; finalScore: number }
  | { status: "exhausted"; rounds: number; bestScore: number; residualIssues: string[] }
  | { status: "escalated"; reason: string; round: number };

// ─── Agent Adapter ───

export type AgentRole = "generator" | "discriminator" | "orchestrator";

export interface AgentExecutionContext {
  taskId: string;
  tenantId: string;
  round: number;
  loopMode: LoopMode;
  previousFeedback: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentResult {
  success: boolean;
  qualityScore: number | null;
  feedback: string[];
  artifacts?: Record<string, unknown>;
}

export interface AgentAdapter {
  name: string;
  role: AgentRole;
  execute(context: AgentExecutionContext): Promise<AgentResult>;
}

// ─── Loop Start Params ───

export interface LoopStartParams {
  taskId: string;
  tenantId: string;
  loopMode: LoopMode;
  agents: AgentAdapter[];
  convergence?: Partial<ConvergenceCriteria>;
  metadata?: Record<string, unknown>;
}

// ─── Telemetry Record ───

export interface ExecutionEventRecord {
  id: string;
  taskId: string;
  tenantId: string;
  source: string;
  severity: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}
