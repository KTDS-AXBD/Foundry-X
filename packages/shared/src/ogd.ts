// F355: O-G-D Quality Loop shared types (Sprint 160)

export type OgdStatus = "pending" | "running" | "passed" | "failed" | "max_rounds";

export interface OgdRound {
  id: string;
  jobId: string;
  roundNumber: number;
  qualityScore: number | null;
  feedback: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelUsed: string;
  passed: boolean;
  createdAt: number;
}

export interface OgdSummary {
  jobId: string;
  totalRounds: number;
  bestScore: number;
  bestRound: number;
  passed: boolean;
  totalCostUsd: number;
  rounds: OgdRound[];
}

export const OGD_THRESHOLD = 0.85;
export const OGD_MAX_ROUNDS = 3;
