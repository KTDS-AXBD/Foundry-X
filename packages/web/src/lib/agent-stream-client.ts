// ─── F529: Agent Stream Client — SSE + WebSocket 클라이언트 (Sprint 282) ───

import type { AgentStreamEvent, AgentStreamRequest } from "@foundry-x/shared";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export type AgentStreamEventHandler = (event: AgentStreamEvent) => void;

export interface AgentStreamClientOptions {
  onEvent: AgentStreamEventHandler;
  onComplete?: () => void;
  onError?: (err: Error) => void;
}

/**
 * SSE 기반 에이전트 스트리밍 클라이언트.
 * POST /api/agents/run/stream 엔드포인트로 에이전트를 실행하고
 * 이벤트를 실시간으로 수신한다.
 */
export async function runAgentStream(
  request: AgentStreamRequest,
  options: AgentStreamClientOptions,
  signal?: AbortSignal,
): Promise<void> {
  const { onEvent, onComplete, onError } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/agents/run/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!response.ok || !response.body) {
    onError?.(new Error(`HTTP ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE 이벤트 파싱: `data: {...}\n\n`
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as AgentStreamEvent;
          onEvent(event);
        } catch {
          // 파싱 오류는 무시
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  } finally {
    reader.releaseLock();
    onComplete?.();
  }
}

/** 에이전트 실행 메트릭 조회 */
export async function getAgentMetrics(sessionId: string) {
  const res = await fetch(`${BASE_URL}/agents/metrics/${sessionId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
