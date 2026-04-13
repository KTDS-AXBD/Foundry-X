---
title: "Sprint 282 Design — F529 Agent Streaming (L1)"
sprint: 282
f_items: [F529]
status: design
date: 2026-04-13
---

# Sprint 282 Design — F529 Agent Streaming (L1)

## §1 아키텍처 결정

### Streaming 메커니즘
Cloudflare Workers에서 가장 안정적인 SSE 패턴을 사용한다.

```
Client → POST /api/agents/run/stream
         └─ Response: ReadableStream (text/event-stream)
              └─ AgentStreamHandler.createHooks() → AgentRuntime.run()
                   └─ beforeModel/afterModel/beforeTool/afterTool → SSE events
                   └─ afterInvocation → D1 메트릭 저장 + run_completed 이벤트
```

WebSocket은 별도 엔드포인트 (`GET /api/agents/stream/ws`)로 지원.
CF Workers `WebSocketPair`를 사용하며, `upgrade: websocket` 헤더 체크.

### SSE 이벤트 흐름 (단일 Request 컨텍스트)
```
[Client POST] → [Workers Handler]
                    ↓ ReadableStream(controller) 생성
                    ↓ AgentStreamHandler.createHooks(controller)
                    ↓ AgentRuntime.run(spec, input, ctx)
                       ↓ beforeInvocation → enqueue("run_started")
                       ↓ loop:
                         beforeModel → enqueue("round_start")
                         afterModel  → enqueue("text_delta")
                         beforeTool  → enqueue("tool_call")
                         afterTool   → enqueue("tool_result")
                         → enqueue("round_end")
                       ↓ afterInvocation → AgentMetricsService.create()
                                        → enqueue("run_completed")
                    ↓ controller.close()
```

## §2 타입 설계 (shared/src/agent-streaming.ts)

```ts
export type AgentStreamEventType =
  | 'run_started' | 'round_start' | 'text_delta' | 'tool_call'
  | 'tool_result' | 'round_end' | 'run_completed' | 'run_failed';

export interface AgentStreamEvent {
  type: AgentStreamEventType;
  sessionId: string;
  timestamp: string;
  payload: AgentStreamEventPayload;
}

type AgentStreamEventPayload =
  | RunStartedPayload | RoundStartPayload | TextDeltaPayload | ToolCallPayload
  | ToolResultPayload | RoundEndPayload | RunCompletedPayload | RunFailedPayload;

interface RunStartedPayload  { agentId: string; input: string }
interface RoundStartPayload  { round: number }
interface TextDeltaPayload   { delta: string; accumulated: string }
interface ToolCallPayload    { toolName: string; input: unknown }
interface ToolResultPayload  { toolName: string; output: string; durationMs: number }
interface RoundEndPayload    { round: number; tokenUsage: LLMTokenUsage }
interface RunCompletedPayload { result: RuntimeResult; metricId: string }
interface RunFailedPayload   { error: string }

export interface AgentRunMetricSummary {
  id: string;
  sessionId: string;
  agentId: string;
  status: 'completed' | 'failed';
  inputTokens: number;
  outputTokens: number;
  rounds: number;
  durationMs: number;
}

// POST /api/agents/run/stream 요청 본문
export interface AgentStreamRequest {
  agentId: string;      // AgentSpec name or YAML 키
  input: string;        // 에이전트에 전달할 입력
  sessionId?: string;   // 클라이언트 세션 ID (없으면 자동 생성)
}
```

## §3 D1 스키마 (0132_agent_run_metrics.sql)

```sql
CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  agent_id         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'running',
  input_tokens     INTEGER DEFAULT 0,
  output_tokens    INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  rounds           INTEGER DEFAULT 0,
  stop_reason      TEXT,
  duration_ms      INTEGER,
  error_msg        TEXT,
  started_at       TEXT NOT NULL,
  finished_at      TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arm_session ON agent_run_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_arm_agent   ON agent_run_metrics(agent_id);
```

## §4 AgentStreamHandler (streaming/agent-stream-handler.ts)

SSE `ReadableStreamDefaultController`를 받아 AgentRuntime 훅을 생성한다.
이 훅은 각 생애주기 이벤트를 SSE 포맷으로 인코딩해 컨트롤러에 enqueue한다.

```ts
export class AgentStreamHandler {
  constructor(
    private sessionId: string,
    private metricsService: AgentMetricsService,
  ) {}

  createHooks(
    ctrl: ReadableStreamDefaultController,
    onComplete?: (metricId: string) => void,
  ): AgentHooks {
    const enc = new TextEncoder();
    const enqueue = (event: AgentStreamEvent) =>
      ctrl.enqueue(enc.encode(formatSSE(event)));

    let metricId: string;
    let accumulated = "";
    const started = Date.now();

    return {
      beforeInvocation: async (ctx) => {
        metricId = await this.metricsService.createRunning(this.sessionId, ctx.agentId);
        enqueue({ type: 'run_started', sessionId: this.sessionId, timestamp: now(), payload: { agentId: ctx.agentId, input: ctx.input } });
      },
      beforeModel: async (modelCtx) => {
        enqueue({ type: 'round_start', sessionId: this.sessionId, timestamp: now(), payload: { round: accumulated ? 2 : 1 } });
        return modelCtx;
      },
      afterModel: async (_modelCtx, result) => {
        const delta = result.content.filter(c => c.type === 'text').map(c => c.text ?? '').join('');
        accumulated += delta;
        if (delta) enqueue({ type: 'text_delta', sessionId: this.sessionId, timestamp: now(), payload: { delta, accumulated } });
        enqueue({ type: 'round_end', sessionId: this.sessionId, timestamp: now(), payload: { round: 1, tokenUsage: result.usage } });
      },
      beforeTool: async (toolCtx) => {
        enqueue({ type: 'tool_call', sessionId: this.sessionId, timestamp: now(), payload: { toolName: toolCtx.toolName, input: toolCtx.input } });
        return toolCtx;
      },
      afterTool: async (toolCtx, toolResult) => {
        enqueue({ type: 'tool_result', sessionId: this.sessionId, timestamp: now(), payload: { toolName: toolCtx.toolName, output: String(toolResult.output), durationMs: 0 } });
        return toolResult;
      },
      afterInvocation: async (_ctx, result) => {
        const durationMs = Date.now() - started;
        await this.metricsService.complete(metricId, result, durationMs);
        enqueue({ type: 'run_completed', sessionId: this.sessionId, timestamp: now(), payload: { result, metricId } });
        onComplete?.(metricId);
      },
    };
  }
}

function formatSSE(event: AgentStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
function now(): string { return new Date().toISOString(); }
```

## §5 파일 매핑 (Worker 구현 상세)

| 파일 | 역할 | 테스트 필요 |
|------|------|------------|
| `packages/shared/src/agent-streaming.ts` | AgentStreamEvent/AgentStreamRequest 타입 | - |
| `packages/shared/src/index.ts` | re-export 추가 | - |
| `packages/api/src/db/migrations/0132_agent_run_metrics.sql` | D1 마이그레이션 | - |
| `packages/api/src/core/agent/streaming/agent-stream-handler.ts` | SSE hook 생성, 이벤트 직렬화 | **Red** |
| `packages/api/src/core/agent/streaming/agent-metrics-service.ts` | D1 create/complete/get | **Red** |
| `packages/api/src/core/agent/streaming/index.ts` | 모듈 re-export | - |
| `packages/api/src/core/agent/routes/streaming.ts` | POST /run/stream + GET /stream/ws | - |
| `packages/api/src/core/agent/index.ts` | streamingRoute export 추가 | - |
| `packages/api/src/app.ts` | app.route 등록 | - |
| `packages/web/src/lib/agent-stream-client.ts` | SSE/WS 클라이언트 | - |
| `packages/web/src/components/feature/AgentStreamDashboard.tsx` | 실시간 대시보드 컴포넌트 | - |
| `packages/web/src/routes/agent-stream.tsx` | 대시보드 라우트 (lazy) | - |
| `packages/web/src/router.tsx` | `/agent-stream` 라우트 추가 | - |

## §6 테스트 계약 (TDD Red Targets)

### agent-stream-handler.test.ts
```
F529 AgentStreamHandler
  createHooks()
    ✗ beforeInvocation → enqueues run_started SSE event
    ✗ afterModel → enqueues text_delta when text content exists
    ✗ beforeTool → enqueues tool_call event
    ✗ afterTool → enqueues tool_result event
    ✗ afterInvocation → enqueues run_completed event
  serializeSSE()
    ✗ formats event as "data: {...}\n\n"
    ✗ handles special chars in payload
```

### agent-metrics-service.test.ts
```
F529 AgentMetricsService
  createRunning()
    ✗ inserts agent_run_metrics row with status='running'
    ✗ returns generated UUID
  complete()
    ✗ updates status='completed', sets finished_at, tokens, rounds
  getBySessionId()
    ✗ returns all metrics for sessionId ordered by started_at
  failRun()
    ✗ updates status='failed', sets error_msg
```

## §7 Web 대시보드 설계

```
/agent-stream
├─ AgentStreamDashboard
│   ├─ 상단: AgentId 입력 + Input 텍스트 + Run 버튼
│   ├─ 중앙: 실시간 이벤트 로그 (스크롤)
│   │   ├─ round_start: "▶ Round N"
│   │   ├─ text_delta: 누적 텍스트 스트리밍
│   │   ├─ tool_call/tool_result: 도구 호출 시각화
│   │   └─ run_completed: 완료 + 메트릭 요약
│   └─ 하단: 토큰/라운드/소요시간 실시간 표시
```

## §8 WebSocket 엔드포인트 설계

```
GET /api/agents/stream/ws?sessionId=xxx
  → upgrade: websocket 체크
  → WebSocketPair() 생성
  → client 반환, server side에서 이벤트 발행
  → AgentStreamHandler 동일 훅 사용 (WebSocket 버전)
```

WebSocket의 경우 `Upgrade` 헤더가 없으면 400 반환.
SSE와 같은 이벤트 스키마를 JSON으로 전달.

## §9 Gap Analysis 체크리스트

- [ ] `AgentStreamEvent` 8종 타입 → shared 정의 완료
- [ ] D1 마이그레이션 0132 → migrations 디렉터리
- [ ] `AgentStreamHandler.createHooks()` → TDD 7 tests GREEN
- [ ] `AgentMetricsService` 4 methods → TDD 4 tests GREEN
- [ ] SSE 엔드포인트 → `Content-Type: text/event-stream` 응답
- [ ] WS 엔드포인트 → 101 Switching Protocols
- [ ] Web 대시보드 → `/agent-stream` 라우트 접근 가능
- [ ] typecheck PASS, lint PASS
