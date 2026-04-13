// ─── F529: AgentStreamHandler — SSE 이벤트 발행기 (Sprint 282) ───
// TDD Red Phase: stub 구현 (테스트 FAIL 예상)

import type { AgentHooks } from "@foundry-x/shared";
import type { AgentStreamEvent } from "@foundry-x/shared";
import type { AgentMetricsService } from "./agent-metrics-service.js";

export function formatSSE(event: AgentStreamEvent): string {
  throw new Error("not implemented");
}

export class AgentStreamHandler {
  constructor(
    private sessionId: string,
    private metricsService: AgentMetricsService,
  ) {}

  createHooks(
    ctrl: ReadableStreamDefaultController,
    onComplete?: (metricId: string) => void,
  ): AgentHooks {
    throw new Error("not implemented");
  }
}
