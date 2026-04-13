# Sprint 285 Design — F532 에이전트 스트리밍 E2E

> **Sprint**: 285 | **F-item**: F532 | **REQ**: FX-REQ-562 | **Priority**: P0
> **Date**: 2026-04-14

## §1 개요

기존 스트리밍 인프라(F529, Sprint 282)에 대한 E2E 테스트 계약을 추가한다.
구현 코드는 변경하지 않고 테스트 파일 3개만 신규 생성한다.

## §2 테스트 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  API 통합 테스트 (Vitest + Hono app.request())           │
│  streaming.test.ts                                       │
│  └─ streamingRoute.request()                            │
│     ├─ POST /agents/run/stream → SSE 검증               │
│     ├─ GET /agents/stream/ws → WebSocket 헤더 검증      │
│     └─ AgentStreamHandler 이벤트 순서 검증              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Web 클라이언트 단위 테스트 (Vitest + fetch mock)         │
│  agent-stream-client.test.ts                            │
│  └─ vi.stubGlobal('fetch', mockFetch)                   │
│     ├─ HTTP 오류 → onError 호출                         │
│     ├─ SSE data 파싱 → onEvent 호출                     │
│     └─ AbortSignal 취소 → onError 미호출                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Playwright E2E (agent-streaming.spec.ts)                │
│  └─ page.route() mock SSE 응답                          │
│     ├─ 스트리밍 텍스트 UI 렌더링 확인                    │
│     ├─ 완료 상태 배지 표시 확인                          │
│     └─ 에러 메시지 표시 확인                             │
└─────────────────────────────────────────────────────────┘
```

## §3 핵심 설계 결정

### API 통합 테스트 — ReadableStream 소비 패턴

Hono `app.request()`는 실제 Fetch API를 사용하므로 ReadableStream을 직접 읽을 수 있다.

```ts
// SSE 스트림에서 첫 이벤트 읽기 패턴
const res = await streamingRoute.request("/agents/run/stream", { method: "POST", ... });
const reader = res.body!.getReader();
const { value } = await reader.read();
const text = new TextDecoder().decode(value);
// text에서 "data: {...}" 파싱
reader.cancel();
```

### AgentStreamHandler 단위 테스트 패턴

`createHooks(ctrl)`에 가짜 `ReadableStreamDefaultController`를 주입하여 이벤트를 캡처한다.

```ts
const chunks: string[] = [];
const fakeCtrl = {
  enqueue: (chunk: Uint8Array) => chunks.push(new TextDecoder().decode(chunk)),
  close: vi.fn(),
  error: vi.fn(),
} as unknown as ReadableStreamDefaultController;
```

### Web 클라이언트 테스트 — fetch mock 패턴

`runAgentStream()`은 `fetch`를 직접 호출하므로 `vi.stubGlobal`로 mock한다.

```ts
// SSE 응답 시뮬레이션
const sseBody = 'data: {"type":"run_started",...}\n\ndata: {"type":"run_completed",...}\n\n';
const mockStream = new ReadableStream({
  start(ctrl) {
    ctrl.enqueue(new TextEncoder().encode(sseBody));
    ctrl.close();
  }
});
```

### Playwright E2E — SSE mock 패턴

`page.route()`로 SSE 응답을 mock하고 UI 상태 변화를 확인한다.

```ts
// ReadableStream + TransformStream으로 SSE 청크 전송
await page.route("**/api/agents/run/stream", async (route) => {
  // fulfill은 스트리밍 미지원 → 완성된 SSE 응답 전송
  await route.fulfill({
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
    body: buildSSEBody([...events]),
  });
});
```

## §4 테스트 계약 (TDD Red Target)

### streaming.test.ts (API)

| # | 테스트 | 검증 포인트 |
|---|--------|------------|
| 1 | SSE 엔드포인트 헤더 | `Content-Type: text/event-stream`, `X-Session-Id` 헤더 존재 |
| 2 | SSE run_started 이벤트 | body 첫 청크에 `"type":"run_started"` 포함 |
| 3 | 유효성 검사 | agentId 없음 → 400 반환 |
| 4 | WebSocket upgrade 없음 | `{"error":"Expected WebSocket upgrade"}` + 400 |
| 5 | AgentStreamHandler 이벤트 순서 | run_started → text_delta → run_completed 순서 |

### agent-stream-client.test.ts (Web)

| # | 테스트 | 검증 포인트 |
|---|--------|------------|
| 6 | HTTP 오류 처리 | HTTP 500 → `onError` 호출, `onEvent` 미호출 |
| 7 | SSE 데이터 파싱 | 유효한 SSE → `onEvent` 2회 호출 (run_started, run_completed) |
| 8 | AbortSignal 취소 | AbortError → `onError` 미호출, `onComplete` 호출 |

### agent-streaming.spec.ts (Playwright)

| # | 테스트 | 검증 포인트 |
|---|--------|------------|
| 9 | 스트리밍 텍스트 렌더링 | SSE text_delta mock → UI에 스트리밍 텍스트 표시 |
| 10 | 완료 상태 표시 | run_completed → "완료" 배지/텍스트 |
| 11 | 에러 상태 표시 | run_failed → 에러 메시지 |

## §5 파일 매핑

| 파일 | 역할 | 의존성 |
|------|------|--------|
| `packages/api/src/__tests__/streaming.test.ts` | API 통합 테스트 | `streamingRoute`, `AgentStreamHandler`, `createTestEnv` |
| `packages/web/src/__tests__/agent-stream-client.test.ts` | Web 클라이언트 유닛 | `runAgentStream`, `vi.stubGlobal('fetch')` |
| `packages/web/e2e/agent-streaming.spec.ts` | E2E 시나리오 | `./fixtures/auth`, `page.route()` |

## §6 완료 기준

- [ ] API 통합 테스트 5건 RED → GREEN
- [ ] Web 클라이언트 테스트 3건 RED → GREEN
- [ ] Playwright E2E 3건 GREEN
- [ ] typecheck PASS
- [ ] Match Rate ≥ 90%
