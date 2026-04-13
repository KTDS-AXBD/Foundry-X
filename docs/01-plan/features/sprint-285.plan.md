# Sprint 285 Plan — F532 에이전트 스트리밍 E2E

> **Sprint**: 285 | **F-item**: F532 | **REQ**: FX-REQ-562 | **Priority**: P0
> **Date**: 2026-04-14

## §1 목적

Sprint 282(F529)에서 구현한 SSE/WebSocket 스트리밍 레이어를 E2E로 검증한다.

현재 상태:
- `POST /api/agents/run/stream` — SSE 스트리밍 엔드포인트 (구현 완료)
- `GET /api/agents/stream/ws` — WebSocket 업그레이드 엔드포인트 (구현 완료)
- `AgentStreamHandler` — AgentRuntime 훅 → SSE 이벤트 변환기 (구현 완료)
- `AgentMetricsService` — 실행 지표 D1 저장 (구현 완료)
- `runAgentStream()` — Web SSE 클라이언트 (구현 완료)
- `SSEClient` — EventSource auto-reconnect 래퍼 (구현 완료)

갭:
- SSE 전 구간(API→이벤트 발행→Web 클라이언트 수신) 통합 테스트 없음
- WebSocket 메시지 왕복 테스트 없음
- 연결 끊김/재접속 복원력 테스트 없음
- Playwright E2E 스트리밍 시나리오 없음

목표 상태:
- `streaming.test.ts` — SSE + WebSocket 통합 테스트 5건 (API 레이어)
- `agent-stream-client.test.ts` — Web SSE 클라이언트 유닛 테스트 3건
- `agent-streaming.spec.ts` — Playwright E2E 스트리밍 시나리오 3건
- 연결 끊김/재접속 복원력 테스트 포함

## §2 범위

| 변경 | 파일 | 타입 |
|------|------|------|
| SSE/WebSocket 통합 테스트 | `packages/api/src/__tests__/streaming.test.ts` | 신규 |
| Web SSE 클라이언트 테스트 | `packages/web/src/__tests__/agent-stream-client.test.ts` | 신규 |
| Playwright E2E 스트리밍 | `packages/web/e2e/agent-streaming.spec.ts` | 신규 |

> 구현 파일 변경 없음 — 순수 테스트 추가

## §3 요구사항 (FX-REQ-562)

1. Agent 실행 → SSE 이벤트 발행 → 이벤트 타입 순서 검증 (`run_started` → `text_delta` → `run_completed`)
2. WebSocket 메시지 왕복 (request→response) 검증
3. SSE 클라이언트의 비정상 응답(HTTP 오류, JSON 파싱 실패) 처리 검증
4. 연결 끊김 후 재접속 로직(`SSEClient`) 검증
5. Playwright E2E: 에이전트 실행 → 스트리밍 텍스트 UI 렌더링 → 완료 상태 표시

## §4 TDD 계획 (Red Phase 대상)

```
# API 통합 테스트 (streaming.test.ts)
test 1: POST /agents/run/stream → Content-Type: text/event-stream + X-Session-Id 헤더 확인
test 2: POST /agents/run/stream → body에서 run_started 이벤트 수신 확인
test 3: POST /agents/run/stream → agentId/input 미제공 시 400 반환
test 4: GET /agents/stream/ws + upgrade 헤더 없음 → 400 반환
test 5: AgentStreamHandler → run_started → text_delta → run_completed 이벤트 순서 확인

# Web 클라이언트 테스트 (agent-stream-client.test.ts)
test 6: runAgentStream → HTTP 오류 시 onError 호출
test 7: runAgentStream → SSE data 파싱 후 onEvent 호출
test 8: runAgentStream → AbortSignal로 취소 시 onError 미호출

# Playwright E2E (agent-streaming.spec.ts)
test 9: 에이전트 실행 → SSE mock → 스트리밍 텍스트 UI 렌더링
test 10: 스트리밍 완료 → "완료" 상태 배지 표시
test 11: 스트리밍 오류 → 에러 메시지 표시
```

## §5 완료 기준

- [ ] API 통합 테스트 5건 GREEN (vitest)
- [ ] Web 클라이언트 테스트 3건 GREEN (vitest)
- [ ] Playwright E2E 3건 GREEN
- [ ] typecheck PASS
- [ ] Match Rate ≥ 90%
