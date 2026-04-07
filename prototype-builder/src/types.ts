// Builder Server 내부 타입 — shared types 위에 Builder 전용 타입 추가

export type {
  Prototype,
  PrototypeStatus,
  PrototypeCreateRequest,
  PrototypeUpdateRequest,
} from '@foundry-x/shared';

export interface PrototypeJob {
  id: string;
  projectId: string;
  name: string;
  prdContent: string;
  feedbackContent: string | null;
  workDir: string;
  round: number;
}

export interface OgdResult {
  output: string;
  score: number;
  rounds: number;
  totalCost: number;
  qualityScore?: QualityScore;
  converged: boolean;
}

export interface OgdEvaluation {
  qualityScore: number;
  feedback: string;
  tokensUsed: { input: number; output: number };
  pass: boolean;
}

export interface CostRecord {
  jobId: string;
  round: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
  /** F428: 실제 생성 모드 (max-cli / api / fallback 등) */
  generation_mode?: GenerationMode;
}

export interface BuilderConfig {
  apiBaseUrl: string;
  apiToken: string;
  anthropicApiKey: string;
  cloudflareApiToken: string;
  cloudflareAccountId: string;
  pollIntervalMs: number;
  maxOgdRounds: number;
  qualityThreshold: number;
  monthlyBudgetUsd: number;
  slackWebhookUrl: string | null;
}

export interface DeployResult {
  url: string;
  projectName: string;
}

/** 5차원 품질 차원 */
export type ScoreDimension = 'build' | 'ui' | 'functional' | 'prd' | 'code';

/** 차원별 가중치 */
export const DIMENSION_WEIGHTS: Record<ScoreDimension, number> = {
  build: 0.20,
  ui: 0.25,
  functional: 0.20,
  prd: 0.25,
  code: 0.10,
};

/** 차원별 점수 상세 */
export interface DimensionScore {
  dimension: ScoreDimension;
  score: number;       // 0.0 ~ 1.0
  weight: number;
  weighted: number;    // score * weight
  details: string;
}

/** LLM 차원별 판별 결과 (F426) */
export interface LlmDimensionResult {
  score: number;      // 0 ~ 100
  rationale: string;
  fix: string | null;
}

/** LLM 통합 판별 전체 결과 (F426) */
export interface LlmIntegratedEvaluation {
  build: LlmDimensionResult;
  ui: LlmDimensionResult;
  functional: LlmDimensionResult;
  prd: LlmDimensionResult;
  code: LlmDimensionResult;
}

/** 전체 품질 스코어 */
export interface QualityScore {
  total: number;           // 0 ~ 100 (가중 평균 * 100)
  dimensions: DimensionScore[];
  evaluatedAt: string;
  round: number;
  jobId: string;
  /** F426: LLM 통합 판별 결과 (선택) */
  llmEvaluation?: LlmIntegratedEvaluation;
  /** F426: 원본 정적 분석 결과 (LLM 통합 시 보조 데이터) */
  staticAnalysis?: DimensionScore[];
}

/** 타겟 피드백 */
export interface TargetFeedback {
  weakestDimension: ScoreDimension;
  score: number;
  prompt: string;
}

/** 생성 모드 */
export type GenerationMode = 'max-cli' | 'cli' | 'api' | 'fallback';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface BuilderLogger {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
}
