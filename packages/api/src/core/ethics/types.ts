// F607: AI 투명성 + 윤리 임계
export const ETHICS_VIOLATION_TYPES = ["confidence_threshold", "fp_burst", "manual_kill"] as const;
export type EthicsViolationType = typeof ETHICS_VIOLATION_TYPES[number];

export const CONFIDENCE_THRESHOLD = 0.7;
export type ConfidenceLevel = "low" | "medium" | "high";

export interface EthicsViolation {
  id: string;
  orgId: string;
  agentId: string;
  violationType: EthicsViolationType;
  thresholdValue: number;
  actualValue: number;
  traceId: string | null;
  escalatedToHuman: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: number;
}

export interface KillSwitchState {
  id: string;
  orgId: string;
  agentId: string;
  active: boolean;
  reason: string | null;
  activatedAt: number | null;
  deactivatedAt: number | null;
}

export interface FPRateResult {
  agentId: string;
  totalCalls: number;
  fpCount: number;
  fpRate: number;
  windowDays: number;
}

export { EthicsEnforcer } from "./services/ethics-enforcer.service.js";
export * from "./schemas/ethics.js";
