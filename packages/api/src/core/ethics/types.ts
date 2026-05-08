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
// NOTE: schemas/ethics.js 의 z.enum(ETHICS_VIOLATION_TYPES) 가 이 파일을 import 하므로
// 여기서 re-export 하면 순환 import → ETHICS_VIOLATION_TYPES=undefined 위험 (S336 entity 선례).
// schemas 심볼은 호출자가 "./schemas/ethics.js" 에서 직접 import.
