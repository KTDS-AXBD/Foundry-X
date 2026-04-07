// F355: O-G-D Quality Loop shared types (Sprint 160)
// F431: StructuredInstruction + OgdRound.structuredInstructions (Sprint 207)

export type OgdStatus = "pending" | "running" | "passed" | "failed" | "max_rounds";

/** F431: 판별 피드백 구체화 — 구체적 수정 지시 단위 */
export interface StructuredInstruction {
  /** 문제 항목 (체크리스트 항목명) */
  issue: string;
  /** 구체적 수정 지시 (동사형: "~하라") */
  action: string;
  /** CSS/HTML 예시 코드 스니펫 (선택) */
  example?: string;
}

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
  /** F431: 구체적 수정 지시 목록 (다음 라운드 Generator에 주입됨) */
  structuredInstructions?: StructuredInstruction[];
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
