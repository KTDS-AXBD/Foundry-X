---
code: FX-DSGN-360
title: Sprint 360 — F615 Guard-X Solo Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 360
f_item: F615
req: FX-REQ-680
---

# Sprint 360 — F615 Guard-X Solo Design

## §1 아키텍처 결정

- **위치**: `packages/api/src/core/guard/` (신규 도메인, MSA 평탄 구조)
- **패턴**: PolicyEngine consumer (F631이 정책 정의, Guard-X는 평가만)
- **Mount**: `app.route("/api/guard", guardApp)`
- **HMAC**: 결정 레코드 불변성 보장 (`checkId|orgId|actionType|allowed|decidedAt`)
- **ULID**: `crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase()` — 26자 대문자

## §2 의존성 연결

| 의존 | 소비 방법 | MSA 규칙 |
|------|----------|----------|
| F631 PolicyEngine | `../../policy/types.js` 경유 import | contract (types.ts) import ✅ |
| F606 AuditBus | `../../infra/types.js` 경유 import | contract import ✅ |
| generateTraceId/generateSpanId | `../../infra/types.js` re-export | contract import ✅ |

## §3 D1 스키마

```sql
-- 0145_guard_decisions.sql
CREATE TABLE IF NOT EXISTS guard_decisions (
  id TEXT PRIMARY KEY,          -- ULID 26char
  check_id TEXT NOT NULL UNIQUE,
  org_id TEXT NOT NULL,
  tenant_id TEXT,
  action_type TEXT NOT NULL,    -- F631 AutomationActionType
  policy_id TEXT,               -- nullable
  violation INTEGER NOT NULL DEFAULT 0,  -- 0=allowed, 1=blocked
  audit_event_id INTEGER,
  hmac_signature TEXT NOT NULL,
  actor TEXT,
  metadata TEXT,
  decided_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (violation IN (0, 1))
);
-- 3 INDEX + 1 TRIGGER (append-only)
```

## §4 API 계약

### POST /api/guard/check

**Request**:
```json
{
  "context": { "orgId": "org-xxx", "tenantId": "t-1", "actor": "user-1" },
  "actionType": "read_only",
  "metadata": {}
}
```

**Response (allowed)**:
```json
{
  "checkId": "ABCDEF1234567890ABCDEF1234",
  "allowed": true,
  "violations": [],
  "hmacSignature": "a1b2c3...",
  "auditEventId": null,
  "decidedAt": 1746518400000
}
```

**Response (blocked)**:
```json
{
  "checkId": "XYZ...",
  "allowed": false,
  "violations": [{ "policyId": null, "reason": "default-deny: no policy registered", "severity": "warning" }],
  "hmacSignature": "...",
  "auditEventId": null,
  "decidedAt": 1746518400000
}
```

### audit-bus 이벤트

`guard.checked` — `{ checkId, orgId, actionType, allowed, policyId, violations }`

## §5 파일 매핑

| 파일 | 역할 | 상태 |
|------|------|------|
| `db/migrations/0145_guard_decisions.sql` | D1 스키마 | ✅ 생성 |
| `core/guard/types.ts` | 5 interface + re-export | ✅ 생성 |
| `core/guard/schemas/guard.ts` | 5 Zod schema | ✅ 생성 |
| `core/guard/services/hmac.ts` | generateULID + computeHmacSignature | ✅ 생성 |
| `core/guard/services/guard-engine.service.ts` | GuardEngine class (check method) | ✅ 생성 |
| `core/guard/routes/index.ts` | Hono sub-app POST /check | ✅ 생성 |
| `core/guard/guard-engine.test.ts` | T1 allowed + T2 default-deny | ✅ GREEN |
| `env.ts` | GUARD_HMAC_KEY? 추가 | ✅ 수정 |
| `app.ts` | guardApp import + mount | ✅ 수정 |

## §6 TDD 계약 (GX-S08)

| 테스트 | 입력 | 기대 출력 |
|--------|------|----------|
| T1 allowed=true | PolicyMock(allowed=true) | checkId.length===26, allowed===true, violations=[] |
| T2 default-deny | PolicyMock(allowed=false) | allowed===false, violations[0].reason match /default-deny/ |
