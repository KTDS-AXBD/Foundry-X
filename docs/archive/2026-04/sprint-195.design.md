---
code: FX-DSGN-S195
title: Sprint 195 Design — F411 과금 체계
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 195 Design — F411 과금 체계

## 1. 개요

멀티테넌시 기반 API 사용량 추적과 요금제별 한도 제어를 구현한다.
실제 결제 연동(Stripe 등)은 제외, 인프라(DB 스키마 + 미들웨어 + API)만 구축한다.

## 2. DB 스키마 (Migration 0116)

```sql
-- 요금제 정의 (시드 데이터 포함)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,           -- 'free' | 'pro' | 'enterprise'
  name TEXT NOT NULL,
  monthly_limit INTEGER NOT NULL, -- -1 = unlimited
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO subscription_plans (id, name, monthly_limit) VALUES
  ('free',       'Free',       1000),
  ('pro',        'Pro',        50000),
  ('enterprise', 'Enterprise', -1);

-- 테넌트 구독 (현재 플랜)
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  org_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL DEFAULT 'free',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 월별 사용량 집계
CREATE TABLE IF NOT EXISTS usage_records (
  org_id     TEXT    NOT NULL,
  month      TEXT    NOT NULL,  -- 'YYYY-MM' 형식
  api_calls  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_org
  ON usage_records (org_id, month);
```

## 3. 서비스 설계

### 3.1 UsageTrackingService (`modules/billing/services/usage-tracking.service.ts`)

```typescript
interface UsageSummary {
  orgId: string;
  month: string;       // 'YYYY-MM'
  used: number;
  limit: number;       // -1 = unlimited
  planId: string;
  remaining: number;   // -1 = unlimited
}

class UsageTrackingService {
  // D1 UPSERT — 원자적 카운터 증가
  async recordCall(db: D1Database, orgId: string): Promise<void>

  // 현재 월 사용량 + 플랜 한도 조회
  async getSummary(db: D1Database, orgId: string): Promise<UsageSummary>

  // 한도 초과 여부 (Enterprise = 항상 false)
  async isOverLimit(db: D1Database, orgId: string): Promise<boolean>
}
```

### 3.2 PlanService (`modules/billing/services/plan.service.ts`)

```typescript
class PlanService {
  async getTenantPlan(db: D1Database, orgId: string): Promise<SubscriptionPlan>
  async updateTenantPlan(db: D1Database, orgId: string, planId: string): Promise<void>
  async listPlans(db: D1Database): Promise<SubscriptionPlan[]>
}
```

## 4. 미들웨어 설계 (`middleware/usage-limiter.ts`)

```
요청 흐름:
  JWT Auth → tenantGuard (orgId 주입) → usageLimiter → 라우트 핸들러
                                            ↓
                              isOverLimit(orgId)?
                                 yes → 429 + headers
                                 no  → recordCall(orgId) + next()
```

**응답 헤더** (항상 추가):
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 750
X-RateLimit-Reset: 2026-05-01T00:00:00Z
```

**제외 경로** (사용량 추적 스킵):
- `GET /api/billing/*` (과금 조회 자체는 카운트 안 함)
- `GET /api/health`

## 5. API 엔드포인트

### GET /api/billing/usage
현재 월 사용량 조회

**응답**:
```json
{
  "orgId": "org-123",
  "month": "2026-04",
  "used": 250,
  "limit": 1000,
  "remaining": 750,
  "planId": "free"
}
```

### GET /api/billing/plans
사용 가능한 요금제 목록

**응답**:
```json
{
  "plans": [
    { "id": "free", "name": "Free", "monthlyLimit": 1000 },
    { "id": "pro", "name": "Pro", "monthlyLimit": 50000 },
    { "id": "enterprise", "name": "Enterprise", "monthlyLimit": -1 }
  ]
}
```

### PUT /api/billing/plan
플랜 변경 (admin 전용)

**요청**:
```json
{ "planId": "pro" }
```

**응답**: 200 OK `{ "success": true, "planId": "pro" }`

## 6. Zod 스키마

```typescript
// billing.schema.ts
export const UpdatePlanSchema = z.object({
  planId: z.enum(['free', 'pro', 'enterprise'])
});

export const UsageSummarySchema = z.object({
  orgId: z.string(),
  month: z.string(),
  used: z.number().int().min(0),
  limit: z.number().int().min(-1),
  remaining: z.number().int().min(-1),
  planId: z.string()
});
```

## 7. Worker 파일 매핑

| Worker | 담당 파일 | 작업 |
|--------|-----------|------|
| W1 | `0116_billing.sql`, `modules/billing/services/usage-tracking.service.ts`, `modules/billing/services/plan.service.ts`, `modules/billing/schemas/billing.schema.ts`, `modules/billing/index.ts` | DB 스키마 + 서비스 레이어 |
| W2 | `middleware/usage-limiter.ts`, `modules/billing/routes/billing.ts`, `modules/index.ts`, `app.ts`, `__tests__/billing.test.ts`, `__tests__/services/usage-tracking.test.ts` | 미들웨어 + 라우트 + 테스트 |

## 8. 테스트 계획

### 단위 테스트 (`__tests__/services/usage-tracking.test.ts`)
- `recordCall` — UPSERT 정상 동작 (월별 카운터 증가)
- `getSummary` — 사용량 + 한도 반환
- `isOverLimit` — Free 한도 초과 시 true, Enterprise 항상 false

### 통합 테스트 (`__tests__/billing.test.ts`)
- `GET /api/billing/usage` → 200 + UsageSummary
- `GET /api/billing/plans` → 200 + 3개 플랜
- `PUT /api/billing/plan` → 200 (admin), 403 (member)
- 한도 초과 시 다음 API 호출 → 429

## 9. 구현 시 주의

- **UPSERT 쿼리**: `INSERT INTO usage_records ... ON CONFLICT(org_id, month) DO UPDATE SET api_calls = api_calls + 1`
- **month 계산**: `new Date().toISOString().slice(0, 7)` → 'YYYY-MM'
- **tenantGuard 없는 경로**: `/api/billing` 라우트는 tenantGuard 후에 mount
- **plan_id 기본값**: tenant_subscriptions에 없는 org는 free로 간주
