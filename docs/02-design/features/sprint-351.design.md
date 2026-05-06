---
code: FX-DSGN-351
title: Sprint 351 — F606 Audit Log Bus Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 351
f_item: F606
req: FX-REQ-670
---

# Sprint 351 — F606 Audit Log Bus Design

## §1 목표

W3C Trace Context 표준 기반 분산 추적 + HMAC SHA256 불변 서명 + append-only D1 audit_events 테이블로 구성된 AI Foundry T1 토대 구축.

## §2 아키텍처

```
incoming request
       │
       ▼
traceContextMiddleware  ← traceparent header 파싱/생성
       │   c.set("traceContext", { traceId, spanId, parentSpanId })
       ▼
  route handler
       │
       ▼
  AuditBus.emit(event_type, payload)  ← HMAC 서명 + D1 INSERT
       │
       ▼
  audit_events table (append-only)
```

## §3 인터페이스 계약

### TraceContext
```typescript
interface TraceContext {
  traceId: string;    // 32 hex chars (W3C)
  spanId: string;     // 16 hex chars (W3C)
  parentSpanId?: string;
  sampled: boolean;
}
```

### AuditEvent (Zod schema)
```typescript
{
  trace_id: string,
  span_id: string,
  parent_span_id?: string,
  event_type: string,   // "agent.run", "diagnostic.completed", ...
  timestamp: number,    // unix epoch ms
  tenant_id?: string,
  actor?: string,
  payload: unknown,     // JSON-serializable
  hmac_signature: string
}
```

### AuditBus class
```typescript
class AuditBus {
  constructor(db: D1Database, hmacKey: string)
  async emit(event_type: string, payload: unknown, ctx: TraceContext, actor?: string, tenant_id?: string): Promise<void>
  async queryByTrace(trace_id: string): Promise<AuditEventRow[]>
}
```

### traceContextMiddleware
- `traceparent` header 파싱 → TraceContext 추출
- 부재 시 신규 traceId(32 hex) + spanId(16 hex) 생성
- `c.set("traceContext", ...)` 주입
- 응답 header: `traceparent` echo

## §4 TDD Red Target

| # | 테스트 | 입력 | 기대 |
|---|--------|------|------|
| T1 | HMAC 서명 생성 | payload object | hmac_signature 비어있지 않음 |
| T2 | HMAC 서명 검증 | 동일 key/payload | 동일 서명 |
| T3 | emit() D1 INSERT | mock DB | 1 row INSERT |
| T4 | traceparent 파싱 | valid header string | traceId/spanId 추출 |
| T5 | traceparent 생성 | header 없음 | 32+16 hex 생성 |
| T6 | append-only: emit() 후 queryByTrace | mock DB | row 반환 |

## §5 파일 매핑

| 파일 | 액션 | 비고 |
|------|------|------|
| `packages/api/src/core/infra/audit-bus.ts` | CREATE | AuditBus class + TraceContext + AuditEvent |
| `packages/api/src/core/infra/middleware/trace-context.middleware.ts` | CREATE | W3C traceparent middleware |
| `packages/api/src/core/infra/types.ts` | MODIFY | AuditBus + types re-export 추가 |
| `packages/api/src/db/migrations/0140_audit_bus.sql` | CREATE | audit_events + trace_links + triggers |
| `packages/api/src/app.ts` | MODIFY | traceContextMiddleware 최상단 등록 |
| `packages/api/src/core/infra/audit-bus.test.ts` | CREATE | TDD Red 6건 |
| `packages/api/src/env.ts` | CHECK | AUDIT_HMAC_KEY 바인딩 확인 |

## §6 D1 Schema

migration: `0140_audit_bus.sql`

테이블: `audit_events` (append-only, UPDATE/DELETE trigger 차단)
테이블: `trace_links` (trace 연결 관계)
인덱스: trace_id, event_type+timestamp, tenant_id(partial)

## §7 MSA 경계

- `core/infra/audit-bus.ts`는 인프라 레이어 (도메인 경계 없음)
- 타 도메인에서 import 시 `core/infra/types.ts` re-export 경유
- 직접 audit-bus.ts import 금지 (ESLint cross-domain 룰)
