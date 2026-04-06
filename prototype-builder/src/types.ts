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

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface BuilderLogger {
  log(level: LogLevel, message: string, meta?: Record<string, unknown>): void;
}
