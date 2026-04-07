import type { GateXClientOptions, HealthResponse } from "./types.js";
import { GateXRequestError } from "./types.js";
import { EvaluationsResource } from "./resources/evaluations.js";
import { GatePackageResource } from "./resources/gate-package.js";
import { OgdResource } from "./resources/ogd.js";

const DEFAULT_BASE_URL = "https://gate-x.ktds-axbd.workers.dev";

/** Internal type for resource classes to call the shared request method */
export type Requester = <T>(path: string, init?: RequestInit) => Promise<T>;

export class GateXClient {
  readonly evaluations: EvaluationsResource;
  readonly gatePackage: GatePackageResource;
  readonly ogd: OgdResource;

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: GateXClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");

    const requester: Requester = (path, init) => this.request(path, init);
    this.evaluations = new EvaluationsResource(requester);
    this.gatePackage = new GatePackageResource(requester);
    this.ogd = new OgdResource(requester);
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/api/health");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } });

    if (!res.ok) {
      let body: { error?: string; details?: unknown } = {};
      try {
        body = (await res.json()) as typeof body;
      } catch {
        // ignore parse errors
      }
      throw new GateXRequestError(res.status, body.error ?? res.statusText, body.details);
    }

    return res.json() as Promise<T>;
  }
}
