// ─── F530: Meta Layer (L4) 공유 타입 (Sprint 283) ───

export type DiagnosticAxis =
  | "ToolEffectiveness"
  | "Memory"
  | "Planning"
  | "Verification"
  | "Cost"
  | "Convergence";

export interface AxisScore {
  axis: DiagnosticAxis;
  score: number;       // 0-100
  rawValue: number;    // 원시 수치
  unit: string;
  trend: "up" | "down" | "stable";
}

export interface DiagnosticReport {
  sessionId: string;
  agentId: string;
  collectedAt: string;
  scores: AxisScore[];
  overallScore: number;  // 6축 단순 평균 (0-100)
}

export type ProposalType = "prompt" | "tool" | "model" | "graph";
export type ProposalStatus = "pending" | "approved" | "rejected";

export interface ImprovementProposal {
  id: string;
  sessionId: string;
  agentId: string;
  type: ProposalType;
  title: string;
  reasoning: string;
  yamlDiff: string;
  status: ProposalStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
