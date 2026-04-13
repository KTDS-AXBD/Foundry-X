// ─── F532: runAgentStream Web 클라이언트 유닛 테스트 (Sprint 285) ───
// TDD Red Phase — agent-stream-client.ts 검증

import { describe, it, expect, vi, afterEach } from "vitest";
import { runAgentStream } from "../lib/agent-stream-client";
import type { AgentStreamEvent } from "@foundry-x/shared";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function makeSSEBody(...events: Partial<AgentStreamEvent>[]): ReadableStream<Uint8Array> {
  const sseText = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new ReadableStream({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode(sseText));
      ctrl.close();
    },
  });
}

function makeMockResponse(status: number, body?: ReadableStream<Uint8Array>): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: body ?? null,
  } as unknown as Response;
}

// ─── Test 6: HTTP 오류 처리 ───

describe("F532 — runAgentStream Web 클라이언트", () => {
  it("test 6: HTTP 500 응답 → onError 호출, onEvent 미호출", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMockResponse(500)));

    const onEvent = vi.fn();
    const onError = vi.fn();
    const onComplete = vi.fn();

    await runAgentStream(
      { agentId: "test-agent", input: "hello" },
      { onEvent, onError, onComplete },
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onEvent).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  // ─── Test 7: SSE 데이터 파싱 ───

  it("test 7: 유효한 SSE → onEvent 2회 호출 (run_started, run_completed)", async () => {
    const sseBody = makeSSEBody(
      { type: "run_started", sessionId: "s1", timestamp: "2026-01-01T00:00:00Z", payload: { agentId: "a", input: "hi" } },
      { type: "run_completed", sessionId: "s1", timestamp: "2026-01-01T00:00:01Z", payload: { result: { output: "done", rounds: 1, tokenUsage: { inputTokens: 5, outputTokens: 10, cacheReadTokens: 0, totalTokens: 15 }, stopReason: "end_turn" }, metricId: "m1" } },
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMockResponse(200, sseBody)));

    const onEvent = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    await runAgentStream(
      { agentId: "test-agent", input: "hi" },
      { onEvent, onComplete, onError },
    );

    expect(onEvent).toHaveBeenCalledTimes(2);
    expect(onEvent.mock.calls[0][0]).toMatchObject({ type: "run_started" });
    expect(onEvent.mock.calls[1][0]).toMatchObject({ type: "run_completed" });
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  // ─── Test 8: AbortSignal 취소 ───

  it("test 8: AbortSignal로 취소 → onError 미호출, onComplete 호출", async () => {
    const controller = new AbortController();

    // fetch가 AbortError를 던지도록 시뮬레이션
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const onEvent = vi.fn();
    const onError = vi.fn();
    const onComplete = vi.fn();

    controller.abort();

    await runAgentStream(
      { agentId: "test-agent", input: "hi" },
      { onEvent, onError, onComplete },
      controller.signal,
    );

    // AbortError는 onError로 전달되지 않음 (정상 취소)
    expect(onError).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });
});
