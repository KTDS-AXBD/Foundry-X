---
code: FX-DESIGN-355
title: Sprint 355 — F631 자동화 정책 코드 강제 (core/policy/ 신규)
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 355
f_item: F631
req: FX-REQ-696
priority: P2
---

# Sprint 355 — F631 자동화 정책 코드 강제 Design

## §1 설계 목표

BeSir 차별화 코어: **whitelist + default-deny** 패턴으로 자동화 액션 유형별 허용 여부를 DB에서 관리.
F606 audit-bus와 통합하여 `policy.evaluated` + `policy.violation` 이벤트를 기록.

## §2 구조 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 위치 | `core/policy/` 신규 | 5-Asset Policy 자산, F615 Guard-X와 명확 분리 |
| Router 타입 | `Hono` (not OpenAPIHono) | asset 패턴 재현, 내부 서비스용 |
| AuditBus 호출 | 즉석 TraceContext 생성 | emit() 시그니처 필수 파라미터 |
| D1 | migration 0143 | automation_policies + policy_violations |

## §3 테스트 계약 (TDD Red Target)

```typescript
// packages/api/src/core/policy/policy-engine.test.ts
describe("F631 PolicyEngine", () => {
  it("whitelist 통과: allowed=true 정책 → evaluate → allowed=true")
  it("default-deny: 미등록 action_type → evaluate → allowed=false + violation INSERT")
  it("policy.evaluated audit 이벤트 발행 (2 case)")
  it("policy.violation audit 이벤트 발행 (default-deny 시)")
})
```

## §4 파일 매핑 (§5 Worker 파일 목록)

| 파일 | 작업 | 비고 |
|------|------|------|
| `packages/api/src/db/migrations/0143_automation_policy.sql` | 신규 | 2 테이블 + 2 인덱스 + trigger |
| `packages/api/src/core/policy/types.ts` | 신규 | AutomationActionType + 2 인터페이스 |
| `packages/api/src/core/policy/schemas/policy.ts` | 신규 | 3 Zod 스키마 |
| `packages/api/src/core/policy/services/policy-engine.service.ts` | 신규 | PolicyEngine class |
| `packages/api/src/core/policy/routes/index.ts` | 신규 | Hono sub-app, 2 endpoints |
| `packages/api/src/core/policy/policy-engine.test.ts` | 신규 | TDD 4 test cases |
| `packages/api/src/app.ts` | 수정 | /api/policy mount 1줄 + import |

## §5 API 계약

### POST /api/policy/evaluate
Request: `{ orgId: string, actionType: AutomationActionType, context?: object }`
Response 200: `{ allowed: boolean, reason: string, policyId: string|null, evaluatedAt: number }`

### POST /api/policy/register
Request: `{ orgId: string, actionType: AutomationActionType, allowed: boolean, reason?: string, metadata?: object }`
Response 201: `{ id: string }`

## §6 AuditBus 통합 계획

```typescript
// emit 호출 시 TraceContext 즉석 생성
const ctx = {
  traceId: generateTraceId(),
  spanId: generateSpanId(),
  sampled: true,
};
await this.auditBus.emit("policy.evaluated", payload, ctx);
```

## §7 D1 체크리스트 (Stage 3 Exit)

- D1: 주입 사이트 전수 — PolicyEngine.evaluate + registerPolicy 2곳, app.ts 1줄
- D2: ID 계약 — policy.id = crypto.randomUUID() (UUID v4)
- D3: Breaking change 없음 (신규 도메인)
- D4: TDD Red 파일 존재 → 아래 구현에서 확인
