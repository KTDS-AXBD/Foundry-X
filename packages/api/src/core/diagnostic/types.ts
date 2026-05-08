// F602: 4대 진단 PoC types

export const DIAGNOSTIC_TYPES = ["missing", "duplicate", "overspec", "inconsistency"] as const;
export type DiagnosticType = (typeof DIAGNOSTIC_TYPES)[number];

export const SEVERITIES = ["info", "warning", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface DiagnosticFinding {
  id: string;
  runId: string;
  orgId: string;
  diagnosticType: DiagnosticType;
  severity: Severity;
  entityId: string | null;
  detail: Record<string, unknown>;
  createdAt: number;
}

export interface DiagnosticReport {
  runId: string;
  orgId: string;
  status: "running" | "completed" | "failed";
  summary: Record<DiagnosticType, number>;
  findings: DiagnosticFinding[];
  startedAt: number;
  completedAt: number | null;
}

export { DiagnosticEngine } from "./services/diagnostic-engine.service.js";
// NOTE: schemas/diagnostic.js 의 z.enum(DIAGNOSTIC_TYPES/SEVERITIES) 가 이 파일을 import 하므로
// 여기서 re-export 하면 순환 import → const=undefined 위험 (S336 entity 선례).
// schemas 심볼은 호출자가 "./schemas/diagnostic.js" 에서 직접 import.
