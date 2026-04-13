// ─── F530: DiagnosticCollector — 6축 메트릭 수집 (Sprint 283) ───
// TDD Red stub — Green Phase에서 구현 채움

import type { D1Database } from "@cloudflare/workers-types";
import type { DiagnosticReport } from "@foundry-x/shared";

/** 6축 메트릭 수집기. agent_run_metrics D1 테이블에서 데이터를 읽어 DiagnosticReport를 생성한다. */
export class DiagnosticCollector {
  constructor(private readonly db: D1Database) {}

  async collect(_sessionId: string, _agentId: string): Promise<DiagnosticReport> {
    throw new Error("Not implemented");
  }
}
