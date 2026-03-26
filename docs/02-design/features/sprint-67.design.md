---
code: FX-DSGN-067
title: "Sprint 67 Design — F209 AI Foundry 흡수 + F210 비밀번호 재설정"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 67
features: [F209, F210]
req: [FX-REQ-201, FX-REQ-202]
plan: "[[FX-PLAN-067]]"
---

## Executive Summary

| 관점 | 결과 |
|------|------|
| **Match Rate 목표** | 92% (F209: 90%, F210: 95%) |
| **신규 파일** | 19 (services 5, routes 1, schemas 2, migrations 3, tests 8) |
| **수정 파일** | 3 (app.ts, routes/auth.ts, env.ts) |
| **D1 테이블** | 3 (poc_environments, tech_reviews, password_reset_tokens) |

---

## 1. 아키텍처 개요

```
[프로토타입 관리 UI]              [로그인 페이지]
 PoC 환경 / 기술검증                "비밀번호 찾기"
       │                              │
       ▼                              ▼
 /api/ax-bd/prototypes/*        /api/auth/forgot-password
       │                        /api/auth/reset-password
       ▼                              │
 PrototypeService                     ▼
 PocEnvService               PasswordResetService
 TechReviewService            EmailService
       │                              │
       ├─ D1 prototypes (기존)         ├─ D1 password_reset_tokens
       ├─ D1 poc_environments          ├─ D1 users (password update)
       └─ D1 tech_reviews              └─ Email API (fetch)
```

---

## 2. F209 — AI Foundry 흡수 상세 설계

### 2.1 PrototypeService (CRUD 래퍼)

```typescript
// packages/api/src/services/prototype-service.ts

export class PrototypeService {
  constructor(private db: D1Database) {}

  /** 프로토타입 목록 (bizItemId 필터 선택적, 페이지네이션) */
  async list(tenantId: string, opts?: {
    bizItemId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: PrototypeRow[]; total: number }>

  /** 프로토타입 상세 (버전 히스토리 포함) */
  async getById(id: string, tenantId: string): Promise<PrototypeDetail | null>

  /** 프로토타입 삭제 (soft delete 아님, CASCADE PoC+TechReview) */
  async delete(id: string, tenantId: string): Promise<void>
}
```

### 2.2 PocEnvService

```typescript
// packages/api/src/services/poc-env-service.ts

export type PocEnvStatus = "pending" | "provisioning" | "ready" | "teardown" | "terminated" | "failed";

export interface PocEnvironment {
  id: string;
  prototypeId: string;
  status: PocEnvStatus;
  config: Record<string, unknown>;  // 환경 설정 JSON
  provisionedAt: string | null;
  terminatedAt: string | null;
  createdAt: string;
}

export class PocEnvService {
  constructor(private db: D1Database) {}

  /** PoC 환경 프로비저닝 요청 */
  async provision(prototypeId: string, tenantId: string, config?: Record<string, unknown>): Promise<PocEnvironment> {
    // 1. 프로토타입 존재 확인 (biz_items.tenant_id로 테넌트 검증)
    // 2. 기존 활성 환경 체크 (중복 방지)
    // 3. INSERT poc_environments (status: "pending")
    // 4. 실제 프로비저닝은 Phase 2 — 여기서는 상태만 관리
  }

  /** PoC 환경 상태 조회 */
  async getByPrototype(prototypeId: string, tenantId: string): Promise<PocEnvironment | null>

  /** PoC 환경 teardown */
  async teardown(prototypeId: string, tenantId: string): Promise<void> {
    // status → "teardown" → "terminated"
  }
}
```

### 2.3 TechReviewService

```typescript
// packages/api/src/services/tech-review-service.ts

export interface TechReviewResult {
  id: string;
  prototypeId: string;
  feasibility: "high" | "medium" | "low";
  stackFit: number;         // 0~100
  complexity: "low" | "medium" | "high";
  risks: string[];
  recommendation: "proceed" | "modify" | "reject";
  estimatedEffort: string;
  reviewedAt: string;
  createdAt: string;
}

export class TechReviewService {
  constructor(private db: D1Database) {}

  /** 기술 타당성 분석 요청 (AI 기반 분석, 현재는 규칙 기반 fallback) */
  async analyze(prototypeId: string, tenantId: string): Promise<TechReviewResult> {
    // 1. 프로토타입 조회 (content, template_used)
    // 2. bizItem 조회 (title, description)
    // 3. 규칙 기반 분석: content 길이, 템플릿 타입, 키워드 기반
    // 4. INSERT tech_reviews
    // 5. 반환
  }

  /** 기술 검증 결과 조회 */
  async getByPrototype(prototypeId: string, tenantId: string): Promise<TechReviewResult | null>
}
```

### 2.4 Route: ax-bd-prototypes.ts

```typescript
// packages/api/src/routes/ax-bd-prototypes.ts

// GET  /api/ax-bd/prototypes                     → list
// GET  /api/ax-bd/prototypes/:id                 → getById
// DELETE /api/ax-bd/prototypes/:id               → delete

// POST /api/ax-bd/prototypes/:id/poc-env         → provision
// GET  /api/ax-bd/prototypes/:id/poc-env         → getByPrototype
// DELETE /api/ax-bd/prototypes/:id/poc-env       → teardown

// POST /api/ax-bd/prototypes/:id/tech-review     → analyze
// GET  /api/ax-bd/prototypes/:id/tech-review     → getByPrototype
```

### 2.5 D1 마이그레이션

**0051_poc_environments.sql**:
```sql
-- Sprint 67: F209 PoC 환경 관리
CREATE TABLE IF NOT EXISTS poc_environments (
  id TEXT PRIMARY KEY,
  prototype_id TEXT NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  config TEXT DEFAULT '{}',
  provisioned_at TEXT,
  terminated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_poc_env_prototype ON poc_environments(prototype_id);
```

**0052_tech_reviews.sql**:
```sql
-- Sprint 67: F209 기술 타당성 분석
CREATE TABLE IF NOT EXISTS tech_reviews (
  id TEXT PRIMARY KEY,
  prototype_id TEXT NOT NULL REFERENCES prototypes(id) ON DELETE CASCADE,
  feasibility TEXT NOT NULL,
  stack_fit INTEGER NOT NULL DEFAULT 0,
  complexity TEXT NOT NULL,
  risks TEXT DEFAULT '[]',
  recommendation TEXT NOT NULL,
  estimated_effort TEXT,
  reviewed_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tech_review_prototype ON tech_reviews(prototype_id);
```

### 2.6 Schema: prototype-ext.ts

```typescript
// packages/api/src/schemas/prototype-ext.ts

export const PocEnvProvisionSchema = z.object({
  config: z.record(z.unknown()).optional(),
}).openapi("PocEnvProvisionRequest");

export const PocEnvResponseSchema = z.object({
  id: z.string(),
  prototypeId: z.string(),
  status: z.enum(["pending", "provisioning", "ready", "teardown", "terminated", "failed"]),
  config: z.record(z.unknown()),
  provisionedAt: z.string().nullable(),
  terminatedAt: z.string().nullable(),
  createdAt: z.string(),
}).openapi("PocEnvResponse");

export const TechReviewResponseSchema = z.object({
  id: z.string(),
  prototypeId: z.string(),
  feasibility: z.enum(["high", "medium", "low"]),
  stackFit: z.number().min(0).max(100),
  complexity: z.enum(["low", "medium", "high"]),
  risks: z.array(z.string()),
  recommendation: z.enum(["proceed", "modify", "reject"]),
  estimatedEffort: z.string(),
  reviewedAt: z.string(),
  createdAt: z.string(),
}).openapi("TechReviewResponse");

export const PrototypeListItemSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number(),
  format: z.string(),
  templateUsed: z.string().nullable(),
  generatedAt: z.string(),
}).openapi("PrototypeListItem");

export const PrototypeListResponseSchema = z.object({
  items: z.array(PrototypeListItemSchema),
  total: z.number(),
}).openapi("PrototypeListResponse");

export const PrototypeDetailSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  version: z.number(),
  format: z.string(),
  content: z.string(),
  templateUsed: z.string().nullable(),
  modelUsed: z.string().nullable(),
  tokensUsed: z.number(),
  generatedAt: z.string(),
  pocEnv: PocEnvResponseSchema.nullable(),
  techReview: TechReviewResponseSchema.nullable(),
}).openapi("PrototypeDetail");
```

---

## 3. F210 — 비밀번호 재설정 상세 설계

### 3.1 PasswordResetService

```typescript
// packages/api/src/services/password-reset-service.ts

export class PasswordResetService {
  constructor(private db: D1Database) {}

  /** 재설정 토큰 생성 (1시간 만료) */
  async createToken(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 3600_000).toISOString();
    // INSERT password_reset_tokens
    // 기존 미사용 토큰 무효화 (같은 userId)
    return token;
  }

  /** 토큰 유효성 검증 */
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    // SELECT → 만료 체크 → 사용 여부 체크
  }

  /** 비밀번호 변경 실행 */
  async resetPassword(token: string, newPasswordHash: string): Promise<{ userId: string }> {
    // 1. validateToken
    // 2. UPDATE users SET password_hash
    // 3. UPDATE password_reset_tokens SET used_at
    // 4. 해당 userId의 모든 refresh_tokens 폐기
    // 5. 반환
  }
}
```

### 3.2 EmailService

```typescript
// packages/api/src/services/email-service.ts

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  constructor(private apiKey?: string) {}

  /** 이메일 발송 — Workers fetch 기반 */
  async send(payload: EmailPayload): Promise<{ success: boolean; messageId?: string }> {
    // RESEND_API_KEY 있으면 Resend API 호출
    // 없으면 로그만 (개발/테스트용)
    if (!this.apiKey) {
      console.log(`[EMAIL_LOG] To: ${payload.to}, Subject: ${payload.subject}`);
      return { success: true, messageId: "log-only" };
    }
    // POST https://api.resend.com/emails
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Foundry-X <noreply@fx.minu.best>",
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });
    const data = await res.json() as { id?: string };
    return { success: res.ok, messageId: data.id };
  }
}
```

### 3.3 Auth Route 확장

```typescript
// packages/api/src/routes/auth.ts (기존 파일에 추가)

// POST /api/auth/forgot-password
//   body: { email }
//   → 사용자 조회 → 토큰 생성 → 이메일 발송 → 200 { message: "이메일을 확인하세요" }
//   → 미등록 이메일도 200 (열거 공격 방지)

// GET /api/auth/reset-password/:token
//   → 토큰 유효성 검증 → 200 { valid: true } | 410 { valid: false, reason }

// POST /api/auth/reset-password
//   body: { token, newPassword }
//   → 토큰 검증 → 비밀번호 해싱 → 업데이트 → refresh tokens 폐기 → 200
```

### 3.4 D1 마이그레이션

**0053_password_reset_tokens.sql**:
```sql
-- Sprint 67: F210 비밀번호 재설정 토큰
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_prt_user ON password_reset_tokens(user_id);
```

### 3.5 Schema: password-reset.ts

```typescript
// packages/api/src/schemas/password-reset.ts

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
}).openapi("ForgotPasswordRequest");

export const ForgotPasswordResponseSchema = z.object({
  message: z.string(),
}).openapi("ForgotPasswordResponse");

export const ResetTokenParamSchema = z.object({
  token: z.string().uuid(),
}).openapi("ResetTokenParam");

export const ResetTokenValidationSchema = z.object({
  valid: z.boolean(),
  reason: z.enum(["not_found", "expired", "already_used"]).optional(),
}).openapi("ResetTokenValidation");

export const ResetPasswordSchema = z.object({
  token: z.string().uuid(),
  newPassword: z.string().min(8).max(128),
}).openapi("ResetPasswordRequest");

export const ResetPasswordResponseSchema = z.object({
  message: z.string(),
}).openapi("ResetPasswordResponse");
```

### 3.6 Env 확장

```typescript
// packages/api/src/env.ts — 추가
export type Env = {
  // ... 기존
  RESEND_API_KEY?: string;  // Sprint 67: 이메일 발송
};
```

---

## 4. 테넌트 격리

F209 프로토타입 관련 쿼리는 기존 `prototypes` → `biz_items.tenant_id` JOIN으로 테넌트 검증.
F210 비밀번호 재설정은 인증 전 public 엔드포인트 — 테넌트 격리 불필요 (사용자 레벨).

---

## 5. Worker 파일 매핑

### W1: F209 — AI Foundry 흡수 (Track A)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `migrations/0051_poc_environments.sql` | PoC 환경 테이블 |
| 2 | `migrations/0052_tech_reviews.sql` | 기술 검증 테이블 |
| 3 | `schemas/prototype-ext.ts` | Zod 스키마 |
| 4 | `services/prototype-service.ts` | 프로토타입 CRUD 래퍼 |
| 5 | `services/poc-env-service.ts` | PoC 환경 관리 |
| 6 | `services/tech-review-service.ts` | 기술 타당성 분석 |
| 7 | `routes/ax-bd-prototypes.ts` | 8 endpoints |
| 8 | `app.ts` | 라우트 등록 |
| 9 | `__tests__/prototype-service.test.ts` | 서비스 테스트 |
| 10 | `__tests__/poc-env-service.test.ts` | 서비스 테스트 |
| 11 | `__tests__/tech-review-service.test.ts` | 서비스 테스트 |
| 12 | `__tests__/ax-bd-prototypes.test.ts` | 라우트 테스트 |

### W2: F210 — 비밀번호 재설정 (Track B)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `migrations/0053_password_reset_tokens.sql` | 토큰 테이블 |
| 2 | `schemas/password-reset.ts` | Zod 스키마 |
| 3 | `services/email-service.ts` | ��메일 발송 |
| 4 | `services/password-reset-service.ts` | 토큰 관리 |
| 5 | `routes/auth.ts` | 3 endpoints 추가 |
| 6 | `env.ts` | RESEND_API_KEY 추가 |
| 7 | `__tests__/email-service.test.ts` | 서비스 테스트 |
| 8 | `__tests__/password-reset-service.test.ts` | 서비스 테스트 |
| 9 | `__tests__/auth-password-reset.test.ts` | 라우트 ���스트 |
