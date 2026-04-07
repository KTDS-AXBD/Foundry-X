// Gate-X SDK — inline type definitions (no external dependencies)

export interface GateXClientOptions {
  apiKey: string;
  /** @default "https://gate-x.ktds-axbd.workers.dev" */
  baseUrl?: string;
}

// ─── Evaluations ──────────────────────────────────────────────

export type EvaluationStatus = "draft" | "in_review" | "approved" | "rejected";

export interface Evaluation {
  id: string;
  orgId: string;
  title: string;
  bizItemId?: string | null;
  gateType: string;
  status: EvaluationStatus;
  description?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvaluationInput {
  title: string;
  gateType: string;
  bizItemId?: string;
  description?: string;
}

export interface UpdateEvaluationStatusInput {
  status: EvaluationStatus;
  reason?: string;
}

export type KpiStatus = "pending" | "met" | "not_met";

export interface EvaluationKpi {
  id: string;
  evalId: string;
  name: string;
  target: string;
  actual?: string | null;
  status: KpiStatus;
  createdAt: string;
}

export interface CreateKpiInput {
  name: string;
  target: string;
  actual?: string;
}

export interface UpdateKpiInput {
  actual?: string;
  status?: KpiStatus;
}

export interface EvaluationHistory {
  id: string;
  evalId: string;
  fromStatus: string;
  toStatus: string;
  reason?: string | null;
  changedBy: string;
  changedAt: string;
}

export interface EvaluationPortfolio {
  total: number;
  byStatus: Record<EvaluationStatus, number>;
  byGateType: Record<string, number>;
}

export interface ListOptions {
  status?: EvaluationStatus;
  limit?: number;
  offset?: number;
}

export interface ListResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ─── GatePackage ──────────────────────────────────────────────

export interface GatePackage {
  id: string;
  bizItemId: string;
  orgId: string;
  gateType: string;
  status: string;
  artifacts?: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGatePackageInput {
  gateType: string;
}

export interface GatePackageDownload {
  downloadUrl: string;
  expiresAt: string;
}

// ─── OGD ──────────────────────────────────────────────────────

export type ModelProvider = "anthropic" | "openai" | "google";

export interface OgdRunInput {
  content: string;
  rubric?: string;
  maxIterations?: number;
  modelProvider?: ModelProvider;
}

export interface OgdJobStatus {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  iterations: number;
  output?: string | null;
  score?: number | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Health ───────────────────────────────────────────────────

export interface HealthResponse {
  service: string;
  status: string;
  ts: string;
}

// ─── Error ────────────────────────────────────────────────────

export class GateXRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: string,
    public readonly details?: unknown,
  ) {
    super(`[${status}] ${error}`);
    this.name = "GateXRequestError";
  }
}
