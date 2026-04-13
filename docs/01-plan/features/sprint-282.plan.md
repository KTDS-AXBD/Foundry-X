---
title: "Sprint 282 Plan — F529 Agent Streaming (L1)"
sprint: 282
f_items: [F529]
req: FX-REQ-557
phase: 41
status: plan
date: 2026-04-13
---

# Sprint 282 Plan — F529 Agent Streaming (L1)

## 1. 목표

HyperFX Agent Stack 4-Layer 중 Layer 1 (Infrastructure)을 구현한다.
- SSE 기반 에이전트 이벤트 실시간 스트리밍 (primary)
- WebSocket 지원 (secondary, Cloudflare Workers `WebSocketPair`)
- D1 에이전트 실행 메트릭 영속화
- Web 실시간 대시보드 (에이전트 상태/토큰/진행률 시각화)

## 2. 범위 (F529 FX-REQ-557)

### In Scope
| 기능 코드 | 설명 |
|-----------|------|
| F-L1-1 | SSE 에이전트 이벤트 스트리밍 (`POST /api/agents/run/stream` — agent run + SSE 통합) |
| F-L1-2 | WebSocket 엔드포인트 (`GET /api/agents/stream/ws`) |
| F-L1-3 | D1 에이전트 실행 메트릭 저장 (`agent_run_metrics` 테이블) |
| F-L1-4 | Web 실시간 대시보드 (`/agent-stream` 라우트) |

### Out of Scope
- Durable Objects 도입 (CF Workers `WebSocketPair`로 충분)
- OpenTelemetry 통합 (4.2-5, 후속)
- Graph/Flow Editor (F-L1-5, 후속)
- A/B 평가 프레임워크 (후속)

## 3. 아키텍처 결정

### SSE vs WebSocket
**결정: SSE primary, WebSocket secondary**

이유:
- Cloudflare Workers에서 SSE(`streamSSE()`)가 더 안정적
- Agent 실행이 SSE 요청과 동일 컨텍스트에서 실행 (pub/sub 불필요)
- WebSocket은 CF `WebSocketPair` + `upgrade` 헤더로 구현 가능 (DO 불필요)

### D1 메트릭 설계
```sql
CREATE TABLE agent_run_metrics (
  id        TEXT PRIMARY KEY,   -- UUID
  session_id TEXT NOT NULL,     -- 클라이언트 세션 ID
  agent_id  TEXT NOT NULL,      -- AgentSpec.name
  status    TEXT NOT NULL,      -- 'running' | 'completed' | 'failed'
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cache_read_tokens INTEGER,
  rounds    INTEGER,
  stop_reason TEXT,
  duration_ms INTEGER,
  error_msg   TEXT,
  started_at  TEXT NOT NULL,    -- ISO8601
  finished_at TEXT,
  created_at  TEXT NOT NULL
);
```

### 스트리밍 이벤트 타입
```ts
type AgentStreamEvent =
  | { type: 'run_started';   sessionId: string; agentId: string; timestamp: string }
  | { type: 'round_start';   round: number; timestamp: string }
  | { type: 'text_delta';    delta: string; accumulated: string }
  | { type: 'tool_call';     toolName: string; input: unknown }
  | { type: 'tool_result';   toolName: string; output: unknown }
  | { type: 'round_end';     round: number; tokenUsage: LLMTokenUsage }
  | { type: 'run_completed'; result: RuntimeResult; metrics: AgentRunMetricSummary }
  | { type: 'run_failed';    error: string }
```

## 4. 파일 매핑

### API (packages/api/)
| 파일 | 역할 |
|------|------|
| `src/db/migrations/0132_agent_run_metrics.sql` | D1 테이블 |
| `src/core/agent/streaming/agent-stream-handler.ts` | SSE + WebSocket 공통 이벤트 발행 |
| `src/core/agent/streaming/agent-metrics-service.ts` | D1 메트릭 저장 |
| `src/core/agent/streaming/index.ts` | 모듈 re-export |
| `src/core/agent/routes/streaming.ts` | 새 라우트: SSE + WS 엔드포인트 |
| `src/core/agent/index.ts` | streaming 모듈 추가 |
| `src/app.ts` | streamingRoute 등록 |

### Shared (packages/shared/)
| 파일 | 역할 |
|------|------|
| `src/agent-streaming.ts` | AgentStreamEvent 타입, AgentRunMetricSummary |
| `src/index.ts` | re-export 추가 |

### Web (packages/web/)
| 파일 | 역할 |
|------|------|
| `src/routes/agent-stream.tsx` | 실시간 대시보드 라우트 |
| `src/components/feature/AgentStreamDashboard.tsx` | 스트리밍 대시보드 컴포넌트 |
| `src/lib/agent-stream-client.ts` | SSE/WS 클라이언트 |
| `src/router.tsx` | agent-stream 라우트 추가 |

## 5. TDD Red 계획

### API 테스트 (vitest)
- `__tests__/services/agent-stream-handler.test.ts`
  - `AgentStreamHandler.createHooks()` — 이벤트 발행 훅 생성 검증
  - `AgentStreamHandler.serializeEvent()` — SSE 포맷 직렬화
- `__tests__/services/agent-metrics-service.test.ts`
  - `AgentMetricsService.create()` — D1 insert
  - `AgentMetricsService.update()` — status/metrics update
  - `AgentMetricsService.get()` — by sessionId

### Web E2E (playwright)
- `/agent-stream` 페이지 접근 → 스트리밍 대시보드 렌더링 확인

## 6. 성공 기준

- [ ] SSE 엔드포인트 응답: `Content-Type: text/event-stream`
- [ ] WebSocket 업그레이드 응답: 101 Switching Protocols
- [ ] D1 `agent_run_metrics` 테이블 마이그레이션 성공
- [ ] AgentStreamHandler 단위 테스트 통과
- [ ] AgentMetricsService 단위 테스트 통과
- [ ] Web 대시보드 라우트 렌더링 확인
- [ ] TDD Match Rate ≥ 90%

## 7. 의존성

- F527 (AgentRuntime): 구현 완료 ✅
- F528 (GraphEngine): 구현 완료 ✅
- 새 D1 migration: 0132 (0131 다음)
