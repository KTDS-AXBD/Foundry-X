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
export * from "./schemas/diagnostic.js";
