import type {
  CreateEvaluationInput,
  CreateKpiInput,
  Evaluation,
  EvaluationHistory,
  EvaluationKpi,
  EvaluationPortfolio,
  ListOptions,
  ListResult,
  UpdateEvaluationStatusInput,
  UpdateKpiInput,
} from "../types.js";
import type { Requester } from "../client.js";

export class EvaluationsResource {
  constructor(private readonly req: Requester) {}

  create(input: CreateEvaluationInput): Promise<Evaluation> {
    return this.req("/api/gate/ax-bd/evaluations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  list(opts: ListOptions = {}): Promise<ListResult<Evaluation>> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.offset !== undefined) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return this.req(`/api/gate/ax-bd/evaluations${qs ? `?${qs}` : ""}`);
  }

  get(evalId: string): Promise<Evaluation> {
    return this.req(`/api/gate/ax-bd/evaluations/${evalId}`);
  }

  updateStatus(
    evalId: string,
    status: UpdateEvaluationStatusInput["status"],
    reason?: string,
  ): Promise<Evaluation> {
    const body: UpdateEvaluationStatusInput = { status, ...(reason ? { reason } : {}) };
    return this.req(`/api/gate/ax-bd/evaluations/${evalId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  getPortfolio(): Promise<EvaluationPortfolio> {
    return this.req("/api/gate/ax-bd/evaluations/portfolio");
  }

  getHistory(evalId: string): Promise<EvaluationHistory[]> {
    return this.req(`/api/gate/ax-bd/evaluations/${evalId}/history`);
  }

  createKpi(evalId: string, input: CreateKpiInput): Promise<EvaluationKpi> {
    return this.req(`/api/gate/ax-bd/evaluations/${evalId}/kpis`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  listKpis(evalId: string): Promise<EvaluationKpi[]> {
    return this.req(`/api/gate/ax-bd/evaluations/${evalId}/kpis`);
  }

  updateKpi(
    evalId: string,
    kpiId: string,
    input: UpdateKpiInput,
  ): Promise<EvaluationKpi> {
    return this.req(`/api/gate/ax-bd/evaluations/${evalId}/kpis/${kpiId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }
}
