// ─── F529: AgentMetricsService — D1 에이전트 실행 메트릭 저장 (Sprint 282) ───
// TDD Red Phase: stub 구현 (테스트 FAIL 예상)

import type { D1Database } from "@cloudflare/workers-types";
import type { AgentRunMetricSummary, RuntimeResult } from "@foundry-x/shared";

export class AgentMetricsService {
  constructor(private db: D1Database) {}

  /** 새 실행 메트릭 행 생성 (status='running') — UUID 반환 */
  async createRunning(sessionId: string, agentId: string): Promise<string> {
    throw new Error("not implemented");
  }

  /** 실행 완료 — status='completed', 토큰/라운드/duration 업데이트 */
  async complete(id: string, result: RuntimeResult, durationMs: number): Promise<void> {
    throw new Error("not implemented");
  }

  /** 실행 실패 — status='failed', error_msg 저장 */
  async failRun(id: string, errorMsg: string): Promise<void> {
    throw new Error("not implemented");
  }

  /** 세션 ID로 메트릭 목록 조회 */
  async getBySessionId(sessionId: string): Promise<AgentRunMetricSummary[]> {
    throw new Error("not implemented");
  }
}
