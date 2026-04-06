// F360: O-G-D Generic Interface — 도메인 독립 O-G-D Loop 타입 (Sprint 163)

/** O-G-D Loop 실행 요청 */
export interface OGDRequest {
  domain: string;
  input: unknown;
  rubric?: string;
  maxRounds?: number;
  minScore?: number;
  tenantId: string;
}

/** O-G-D Loop 실행 결과 */
export interface OGDResult {
  runId: string;
  domain: string;
  output: unknown;
  score: number;
  iterations: number;
  converged: boolean;
  rounds: OGDRunRound[];
}

/** 개별 O-G-D 라운드 결과 */
export interface OGDRunRound {
  round: number;
  output: unknown;
  score: number;
  feedback: string;
  passed: boolean;
  durationMs: number;
}

/** 도메인 어댑터 설정 (D1 ogd_domains 행) */
export interface DomainAdapterConfig {
  domain: string;
  displayName: string;
  description: string;
  adapterType: "builtin" | "custom";
  defaultRubric: string;
  defaultMaxRounds: number;
  defaultMinScore: number;
  enabled: boolean;
}

/** 도메인 어댑터 인터페이스 — 각 도메인이 구현 */
export interface DomainAdapterInterface {
  readonly domain: string;
  readonly displayName: string;
  readonly description: string;
  generate(input: unknown, feedback?: string): Promise<{ output: unknown }>;
  discriminate(
    output: unknown,
    rubric: string,
  ): Promise<{ score: number; feedback: string; pass: boolean }>;
  getDefaultRubric(): string;
}

export type OGDRunStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "max_rounds";

/** O-G-D 범용 상수 */
export const OGD_DEFAULT_MAX_ROUNDS = 3;
export const OGD_DEFAULT_MIN_SCORE = 0.85;
