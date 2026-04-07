---
code: FX-DSGN-194
title: "Sprint 194 — Gate-X 외부 웹훅 연동 + 멀티테넌시 격리 설계 (F410)"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
system-version: "2.0.0"
sprint: 194
f-items: [F410]
---

# Sprint 194 Design — Gate-X 외부 웹훅 연동 + 멀티테넌시 격리

## 1. DB 스키마 (Migration 0004)

```sql
-- Gate-X 외부 웹훅 연동 + 멀티테넌시 격리 (Sprint 194, F410)

-- 웹훅 구독 테이블
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL,
  url         TEXT NOT NULL,
  events      TEXT NOT NULL DEFAULT '["evaluation.completed"]',  -- JSON array
  secret      TEXT NOT NULL,                                       -- HMAC 서명 키
  description TEXT NOT NULL DEFAULT '',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_webhooks_org_active
  ON webhook_subscriptions(org_id, is_active);

-- 테넌트 관리 테이블
CREATE TABLE IF NOT EXISTS tenants (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free',   -- free / pro / enterprise
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 테넌트 멤버 테이블
CREATE TABLE IF NOT EXISTS tenant_members (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',  -- tenant_admin / member
  is_active   INTEGER NOT NULL DEFAULT 1,
  invited_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_members_uniq
  ON tenant_members(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant
  ON tenant_members(tenant_id, is_active);
```

---

## 2. 타입 정의

### 2.1 웹훅 타입
```typescript
// packages/gate-x/src/types/webhook.ts
export type WebhookEventType =
  | "evaluation.completed"
  | "evaluation.failed"
  | "evaluation.started"
  | "decision.made";

export interface WebhookSubscription {
  id: string;
  orgId: string;
  url: string;
  events: WebhookEventType[];
  secret: string;          // 생성 시만 노출, 이후 조회 시 마스킹
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDispatchPayload {
  event: WebhookEventType;
  timestamp: string;
  orgId: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  subscriptionId: string;
  status: "delivered" | "failed";
  statusCode?: number;
  error?: string;
}
```

### 2.2 테넌트 타입
```typescript
// packages/gate-x/src/types/tenant.ts
export type TenantPlan = "free" | "pro" | "enterprise";
export type TenantRole = "tenant_admin" | "member";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  role: TenantRole;
  isActive: boolean;
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Zod 스키마

### 3.1 webhook-schema.ts
```typescript
// packages/gate-x/src/schemas/webhook-schema.ts
import { z } from "zod";

const WEBHOOK_EVENTS = [
  "evaluation.completed",
  "evaluation.failed",
  "evaluation.started",
  "decision.made",
] as const;

export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  description: z.string().max(200).optional().default(""),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  description: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
});
```

### 3.2 tenant-schema.ts
```typescript
// packages/gate-x/src/schemas/tenant-schema.ts
import { z } from "zod";

export const CreateTenantSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(50),
  plan: z.enum(["free", "pro", "enterprise"]).optional().default("free"),
});

export const InviteMemberSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["tenant_admin", "member"]).optional().default("member"),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(["tenant_admin", "member"]),
});
```

---

## 4. 서비스 API

### 4.1 webhook-service.ts
| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `create` | `(orgId, data, createdBy, db) => WebhookSubscription` | 구독 생성 (secret 자동 생성) |
| `list` | `(orgId, db) => WebhookSubscription[]` | 구독 목록 (secret 마스킹) |
| `get` | `(id, orgId, db) => WebhookSubscription` | 단건 조회 (secret 마스킹) |
| `update` | `(id, orgId, data, db) => WebhookSubscription` | 업데이트 |
| `delete` | `(id, orgId, db) => void` | 삭제 |
| `dispatch` | `(event, orgId, data, db) => DeliveryResult[]` | 이벤트 발송 (HMAC 서명) |
| `signPayload` | `(payload, secret) => string` | HMAC-SHA256 서명 계산 |

**dispatch 흐름**:
1. `org_id` + `is_active=1` + `events LIKE '%event%'` 로 구독 목록 조회
2. 각 구독에 대해 `signPayload(payload, secret)` → `X-Signature-256` 헤더
3. `fetch(url, { method: 'POST', headers, body })` — 비동기 fire-and-forget
4. 결과 배열 반환 (성공/실패 기록)

### 4.2 tenant-service.ts
| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `create` | `(data, createdBy, db) => Tenant` | 테넌트 생성 |
| `get` | `(id, db) => Tenant` | 단건 조회 |
| `listMembers` | `(tenantId, db) => TenantMember[]` | 멤버 목록 |
| `invite` | `(tenantId, data, invitedBy, db) => TenantMember` | 멤버 초대 |
| `updateRole` | `(tenantId, memberId, role, db) => TenantMember` | 역할 변경 |
| `removeMember` | `(tenantId, memberId, db) => void` | 멤버 제거 |

---

## 5. API 엔드포인트

### 5.1 웹훅 API (`/api/gate/webhooks`)
| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| GET | `/api/gate/webhooks` | member | 구독 목록 |
| POST | `/api/gate/webhooks` | tenant_admin | 구독 생성 |
| GET | `/api/gate/webhooks/:id` | member | 단건 조회 |
| PUT | `/api/gate/webhooks/:id` | tenant_admin | 업데이트 |
| DELETE | `/api/gate/webhooks/:id` | tenant_admin | 삭제 |

### 5.2 테넌트 API (`/api/tenants`)
| Method | Path | 권한 | 설명 |
|--------|------|------|------|
| POST | `/api/tenants` | 인증 | 테넌트 생성 |
| GET | `/api/tenants/:id` | member | 테넌트 조회 |
| GET | `/api/tenants/:id/members` | member | 멤버 목록 |
| POST | `/api/tenants/:id/members` | tenant_admin | 멤버 초대 |
| PUT | `/api/tenants/:id/members/:memberId` | tenant_admin | 역할 변경 |
| DELETE | `/api/tenants/:id/members/:memberId` | tenant_admin | 멤버 제거 |

---

## 6. RBAC 확장 (tenantGuard)

```typescript
// 역할 체크 헬퍼 (middleware/tenant.ts에 추가)
export function requireTenantAdmin(
  c: Context<{ Bindings: GateEnv; Variables: TenantVariables }>,
  next: Next,
) {
  const role = c.get("orgRole");
  if (role !== "tenant_admin") {
    return c.json({ error: "Tenant admin role required" }, 403);
  }
  return next();
}
```

---

## 7. 이벤트 연동 (evaluation-service.ts 수정)

검증 완료/실패 시 `webhookService.dispatch()` 호출:
```typescript
// evaluation-service.ts 내부
const result = await runEvaluation(evaluationId, env.DB);
// dispatch는 fire-and-forget (await 없음)
webhookService.dispatch(
  result.passed ? "evaluation.completed" : "evaluation.failed",
  orgId,
  { evaluationId, score: result.score, details: result.details },
  env.DB,
).catch((e) => console.error("Webhook dispatch error:", e));
```

---

## 8. Worker 파일 매핑

| Worker | 담당 파일 |
|--------|-----------|
| Worker A (웹훅) | `packages/gate-x/src/db/migrations/0004_webhooks_tenants.sql` · `packages/gate-x/src/types/webhook.ts` · `packages/gate-x/src/schemas/webhook-schema.ts` · `packages/gate-x/src/services/webhook-service.ts` · `packages/gate-x/src/routes/webhooks.ts` · `packages/gate-x/src/test/webhook-service.test.ts` |
| Worker B (테넌트) | `packages/gate-x/src/types/tenant.ts` · `packages/gate-x/src/schemas/tenant-schema.ts` · `packages/gate-x/src/services/tenant-service.ts` · `packages/gate-x/src/routes/tenants.ts` · `packages/gate-x/src/test/tenant-service.test.ts` |
| Worker C (통합) | `packages/gate-x/src/middleware/tenant.ts` (requireTenantAdmin 추가) · `packages/gate-x/src/services/evaluation-service.ts` (dispatch 연동) · `packages/gate-x/src/routes/index.ts` (라우트 등록) · `packages/gate-x/src/app.ts` (tenants 라우트 추가) |

---

## 9. 테스트 계획

### webhook-service.test.ts
- `create()` — 구독 생성, secret 자동 생성 확인
- `list()` — secret 마스킹(`***`) 확인
- `dispatch()` — HMAC 서명 헤더 포함 fetch 호출 확인 (fetch mock)
- `dispatch()` — 구독 없을 시 빈 배열 반환

### tenant-service.test.ts
- `create()` — 테넌트 생성
- `invite()` — 멤버 초대 (중복 초대 시 에러)
- `updateRole()` — 역할 변경
- `removeMember()` — 멤버 비활성화

---

## 10. 제외 범위 (Intentional Gaps)

| 항목 | 사유 |
|------|------|
| 웹훅 재시도 로직 | Cloudflare DO/Queue 기반 재시도는 F411 이후 단계 (현재는 fire-and-forget) |
| 웹훅 발송 이력 테이블 | `webhook_deliveries` 로깅은 Phase 21-D SaaS 기반에서 추가 |
| 테넌트 생성 UI (Web) | Gate-X Web UI는 별도 스프린트 (현재 API만) |
| 과금 플랜 enforcement | F411 과금 체계에서 구현 (현재는 plan 필드만 저장) |
