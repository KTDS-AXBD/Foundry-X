---
code: FX-DSGN-S191
title: Sprint 191 Design — F406 이벤트 유실 복구 메커니즘
version: "1.0"
status: Active
category: DSGN
created: "2026-04-07"
updated: "2026-04-07"
author: Claude (Sprint Autopilot)
sprint: 191
f_items: [F406]
---

# FX-DSGN-S191: F406 이벤트 유실 복구 메커니즘

## 1. 설계 목표

Foundry-X ↔ Gate-X 이벤트 연동에서 이벤트 유실 없이 신뢰성 있는 전달을 보장한다.

**핵심 원칙**:
- At-least-once 전달 보장 (D1 기반)
- 최대 3회 재시도 후 Dead-Letter Queue(DLQ) 이관
- Cron Trigger 기반 주기적 복구 (별도 컴포넌트 불필요)

## 2. DB 스키마 변경

### Migration 0115_event_recovery.sql

```sql
ALTER TABLE domain_events ADD COLUMN retry_count  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE domain_events ADD COLUMN last_error   TEXT;
ALTER TABLE domain_events ADD COLUMN next_retry_at TEXT;
```

**상태 흐름**:
```
pending → processed     (정상)
pending → failed        (1~3회 실패 후 retry 대기)
failed  → pending       (retry() 호출 시 → next_retry_at 이전이면 skip)
failed  → dead_letter   (retry_count >= 3)
dead_letter → pending   (수동 reprocess 시)
```

## 3. D1EventBus 확장 (packages/shared/src/events/d1-bus.ts)

### 3.1 retry() 메서드

```typescript
async retry(maxRetries = 3): Promise<number>
```

- `failed` 상태 + `retry_count < maxRetries` + `next_retry_at <= NOW()` 이벤트 조회
- 재처리 성공: `processed` 상태
- 재처리 실패: `retry_count++`, 지수 백오프로 `next_retry_at` 갱신
- `retry_count >= maxRetries`: `dead_letter` 상태로 이관

### 3.2 지수 백오프 공식

```
next_retry_at = NOW() + 2^retry_count * 60초
retry_count=1: +2분
retry_count=2: +4분
retry_count=3: dead_letter
```

### 3.3 getDLQ() + reprocess() 메서드

```typescript
async getDLQ(limit = 20): Promise<DomainEventRow[]>
async reprocess(id: string): Promise<void>  // dead_letter → pending
```

## 4. GateXEventBridge (packages/api/src/modules/gate/services/gate-event-bridge.ts)

Gate-X 검증 완료 이벤트를 D1EventBus로 발행하는 브릿지 서비스.

```typescript
export class GateXEventBridge {
  constructor(private bus: D1EventBus) {}

  /** validation.completed 이벤트 발행 */
  async publishValidationCompleted(params: {
    validationId: string;
    bizItemId: string;
    score: number;
    verdict: 'PASS' | 'CONDITIONAL' | 'FAIL';
    orgId: string;
    tenantId: string;
  }): Promise<void>

  /** validation.rejected 이벤트 발행 */
  async publishValidationRejected(params: {
    validationId: string;
    bizItemId: string;
    reason: string;
    tenantId: string;
  }): Promise<void>

  /** biz-item.stage-changed 이벤트 구독 (Foundry-X → Gate-X) */
  subscribeStageChanged(handler: (payload: BizItemStageChangedPayload) => Promise<void>): void
}
```

## 5. 이벤트 상태 API (packages/api/src/routes/event-status.ts)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/events/status` | pending/failed/dead_letter 건수 통계 |
| GET | `/api/events/dlq` | DLQ 이벤트 목록 (최대 20건) |
| POST | `/api/events/dlq/:id/reprocess` | DLQ 이벤트 수동 재처리 |
| GET | `/api/events/:id` | 특정 이벤트 상태 조회 |

### 응답 예시 — GET /api/events/status

```json
{
  "pending": 3,
  "failed": 1,
  "dead_letter": 0,
  "processed_last_hour": 47
}
```

## 6. event-cron.ts 수정

```typescript
export async function processDomainEvents(env: Env): Promise<void> {
  const bus = new D1EventBus(env.DB as any);
  
  // 1. 일반 이벤트 처리
  const processed = await bus.poll();
  
  // 2. 실패 이벤트 재시도
  const retried = await bus.retry();
  
  if (processed > 0 || retried > 0) {
    console.log(`[event-cron] processed=${processed} retried=${retried}`);
  }
}
```

## 7. Worker 파일 매핑

| Worker | 담당 파일 |
|--------|----------|
| W1 (공유 패키지) | `packages/shared/src/events/d1-bus.ts` (retry + DLQ) |
| W2 (API) | `packages/api/src/db/migrations/0115_event_recovery.sql` + `packages/api/src/modules/gate/services/gate-event-bridge.ts` + `packages/api/src/routes/event-status.ts` + `packages/api/src/core/events/event-cron.ts` |
| W3 (테스트) | `packages/api/src/__tests__/event-recovery.test.ts` |

## 8. 검증 기준

| # | 검증 항목 | 기대 결과 |
|---|----------|----------|
| 1 | `D1EventBus.retry()` — failed 이벤트 재처리 성공 | `processed` 상태 전환 |
| 2 | `D1EventBus.retry()` — 3회 초과 이벤트 | `dead_letter` 상태 이관 |
| 3 | 지수 백오프 — `next_retry_at` 미도달 이벤트 skip | retry 건수 = 0 |
| 4 | `GateXEventBridge.publishValidationCompleted()` | D1 insert 성공 |
| 5 | `GET /api/events/status` 응답 | pending/failed/dead_letter 건수 |
| 6 | `POST /api/events/dlq/:id/reprocess` | dead_letter → pending 전환 |
| 7 | typecheck 오류 0건 | tsc --noEmit 통과 |
| 8 | 단위 테스트 전체 pass | vitest run 성공 |
