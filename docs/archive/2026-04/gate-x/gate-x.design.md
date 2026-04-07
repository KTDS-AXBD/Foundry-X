---
code: FX-DSGN-S189
title: Gate-X 독립 서비스 Phase 21-A Design
version: 1.0
status: Draft
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Gate-X 독립 서비스 Design Document

> **Summary**: Gate-X 코어 API + 독립 배포 — Sprint 189~190 구현 설계
>
> **Project**: Foundry-X → Gate-X
> **Author**: Sinclair Seo
> **Date**: 2026-04-07
> **Status**: Draft
> **Planning Doc**: [gate-x.plan.md](../../01-plan/features/gate-x.plan.md)
> **PRD**: [prd-final.md](../../specs/gate-x/prd-final.md)

---

## 1. Overview

### 1.1 Design Goals

1. **완전 독립 배포**: Gate-X가 Foundry-X와 독립적인 Workers 서비스로 동작
2. **기능 동등성**: modules/gate/ 7개 엔드포인트가 Gate-X에서 동일하게 동작
3. **비동기 O-G-D**: Workers CPU time 제한을 Queue+DO로 해소
4. **멀티테넌시 준비**: 모든 테이블에 tenant_id 초기 포함
5. **외부 제공 가능**: JWT + API Key 인증으로 외부 개발자 접근

### 1.2 Design Principles

- **Minimal FX 의존성**: gate 코드의 FX 코어 의존 2건(Env, TenantVariables)만 해소
- **harness-kit 활용**: 미들웨어(JWT, CORS, RBAC), EventBus, D1 유틸리티 재사용
- **API v1 접두사**: 모든 엔드포인트에 `/v1/` prefix — 향후 버전 관리
- **Queue-First**: LLM 호출이 필요한 모든 작업은 Queue를 통한 비동기 처리

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────┐     ┌─────────────────────────────────┐
│   Client     │     │  Gate-X Workers                  │
│  (API/Web)   │────▶│                                  │
│              │     │  ┌──────────┐   ┌────────────┐  │
│              │◀────│  │  Hono    │──▶│  Services  │  │
│              │     │  │  Router  │   │  (7개)     │  │
│              │     │  └──────────┘   └─────┬──────┘  │
│              │     │       │               │         │
│              │     │  ┌────▼────┐   ┌──────▼──────┐  │
│              │     │  │  Auth   │   │  D1 (gate-  │  │
│              │     │  │  MW     │   │  x-db)      │  │
│              │     │  └─────────┘   └─────────────┘  │
│              │     │       │                         │
│              │     │  ┌────▼────────────────┐        │
│              │     │  │  Queue Producer     │        │
│              │     │  │  (O-G-D 비동기)     │        │
│              │     │  └────────┬────────────┘        │
│              │     └───────────┼──────────────────────┘
│              │                 │
│              │     ┌───────────▼──────────────────────┐
│              │     │  Cloudflare Queue                 │
│              │     │  ┌──────────────────────────┐    │
│              │     │  │  Queue Consumer           │    │
│              │     │  │  ├── LLM API 호출        │    │
│              │     │  │  ├── 결과 D1 저장        │    │
│              │     │  │  └── DO 상태 업데이트    │    │
│              │     │  └──────────────────────────┘    │
│              │     └──────────────────────────────────┘
│              │
│              │     ┌──────────────────────────────────┐
│              │     │  Durable Object                   │
│              │────▶│  ValidationSession                │
│  GET status  │     │  (pending→running→completed)      │
│              │◀────│                                    │
└──────────────┘     └──────────────────────────────────┘
```

### 2.2 Data Flow

#### 동기 API (CRUD)
```
Client → JWT/API Key 인증 → Hono Router → Service → D1 → Response (200)
```

#### 비동기 O-G-D (검증 실행)
```
Client → POST /v1/validate → Queue 등록 → 202 Accepted (job_id)
                                ↓
Queue Consumer → LLM Generator → LLM Discriminator → D1 저장 → DO 갱신
                                ↓
Client → GET /v1/validate/:job_id → DO 상태 조회 → 200 (status + result)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| Gate-X Workers | Cloudflare Workers runtime | HTTP 서빙 |
| Hono Router | hono 패키지 | 라우팅 + 미들웨어 |
| Auth MW | @foundry-x/harness-kit | JWT 검증 + RBAC |
| D1 Access | @foundry-x/harness-kit | getDb, runQuery |
| Queue Producer | Cloudflare Queues API | 비동기 작업 등록 |
| Queue Consumer | Cloudflare Queues API | 비동기 작업 처리 |
| Durable Object | Cloudflare DO API | 세션 상태 관리 |
| EventBus | @foundry-x/harness-kit D1EventBus | FX 이벤트 연동 (M2) |

---

## 3. Data Model

### 3.1 Entity Definition

```typescript
// Gate-X 환경 바인딩 (FX Env 대체)
interface GateXEnv {
  DB: D1Database;
  VALIDATION_QUEUE: Queue;
  VALIDATION_SESSION: DurableObjectNamespace;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
}

// 테넌트 변수 (FX TenantVariables 대체)
interface GateXVariables {
  tenantId: string;
  orgId: string;
  jwtPayload: JwtPayload;
}

// API Key
interface ApiKey {
  id: string;
  tenantId: string;
  keyHash: string;       // SHA-256 해시 저장 (원본 미저장)
  keyPrefix: string;     // "gx_" + 앞 8자리 (표시용)
  name: string;
  permissions: string[]; // ["read", "write", "validate"]
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

// Queue Job (비동기 작업 추적)
interface QueueJob {
  id: string;
  tenantId: string;
  type: "ogd-validate";
  payload: string;       // JSON serialized
  status: "pending" | "running" | "completed" | "failed";
  result: string | null; // JSON serialized
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}
```

### 3.2 기존 Gate 엔티티 (FX에서 이전)

modules/gate/ 관련 D1 테이블 — `tenant_id` 컬럼 추가:

| 테이블 | 원본 마이그레이션 | 설명 |
|--------|-------------------|------|
| `ax_evaluations` | 0052 | AX BD 평가 |
| `ax_evaluation_history` | 0054 | 평가 이력 |
| `ax_commit_gates` | 0060 | 커밋 게이트 |
| `decisions` | 0069 | 의사결정 |
| `gate_packages` | 0071 | 게이트 패키지 |
| `evaluation_reports` | 0085 | 평가 리포트 |
| `expert_meetings` | 0086 | 전문가 미팅 |
| `validation_history` | 0086 | 검증 이력 |
| `ax_team_reviews` | 0101 | 팀 리뷰 |

### 3.3 Database Schema (Gate-X 전용 D1)

#### 0001_init.sql — 기존 gate 테이블 + tenant_id + 신규 테이블

```sql
-- 테넌트 관리
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- API 키 관리
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT '["read"]',
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);

-- 비동기 작업 추적
CREATE TABLE IF NOT EXISTS queue_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ogd-validate',
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  error TEXT
);
CREATE INDEX idx_queue_jobs_status ON queue_jobs(status);
CREATE INDEX idx_queue_jobs_tenant ON queue_jobs(tenant_id);
```

#### 0002_gate_tables.sql — FX gate 테이블 이전 (tenant_id 추가)

```sql
-- ax_evaluations (from FX 0052) + tenant_id
CREATE TABLE IF NOT EXISTS ax_evaluations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  evaluator_id TEXT,
  score REAL,
  verdict TEXT,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_eval_tenant ON ax_evaluations(tenant_id);
CREATE INDEX idx_eval_biz_item ON ax_evaluations(biz_item_id);

-- decisions (from FX 0069) + tenant_id
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  gate_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_decisions_tenant ON decisions(tenant_id);

-- gate_packages (from FX 0071) + tenant_id
CREATE TABLE IF NOT EXISTS gate_packages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  gate_type TEXT NOT NULL,
  items TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  download_url TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_gate_pkg_tenant ON gate_packages(tenant_id);

-- evaluation_reports (from FX 0085) + tenant_id
CREATE TABLE IF NOT EXISTS evaluation_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  content TEXT NOT NULL,
  score REAL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_eval_report_tenant ON evaluation_reports(tenant_id);

-- expert_meetings (from FX 0086) + tenant_id
CREATE TABLE IF NOT EXISTS expert_meetings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_meetings_tenant ON expert_meetings(tenant_id);

-- validation_history (from FX 0086) + tenant_id
CREATE TABLE IF NOT EXISTS validation_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  performed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_val_history_tenant ON validation_history(tenant_id);

-- ax_team_reviews (from FX 0101) + tenant_id
CREATE TABLE IF NOT EXISTS ax_team_reviews (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  score REAL,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_team_reviews_tenant ON ax_team_reviews(tenant_id);
```

---

## 4. API Specification

### 4.1 Endpoint List

모든 엔드포인트에 `/v1/` prefix. 인증: JWT Bearer 또는 API Key (`X-API-Key` 헤더).

| Method | Path | Description | Auth | F-item |
|--------|------|-------------|------|--------|
| **인증/키 관리** | | | | F405 |
| POST | `/v1/auth/token` | JWT 토큰 발급 (email+password) | Public | F405 |
| POST | `/v1/api-keys` | API Key 생성 | JWT | F405 |
| GET | `/v1/api-keys` | API Key 목록 | JWT | F405 |
| DELETE | `/v1/api-keys/:id` | API Key 삭제 | JWT | F405 |
| **검증 파이프라인** | | | | F403 |
| POST | `/v1/validate` | 비동기 검증 실행 (Queue 등록) | JWT/Key | F404 |
| GET | `/v1/validate/:jobId` | 검증 작업 상태 조회 (DO) | JWT/Key | F404 |
| **평가 (Evaluations)** | | | | F403 |
| GET | `/v1/evaluations` | 평가 목록 | JWT/Key | F403 |
| GET | `/v1/evaluations/:id` | 평가 상세 | JWT/Key | F403 |
| POST | `/v1/evaluations` | 평가 생성 | JWT/Key | F403 |
| PUT | `/v1/evaluations/:id` | 평가 수정 | JWT/Key | F403 |
| **의사결정 (Decisions)** | | | | F403 |
| GET | `/v1/decisions` | 의사결정 목록 | JWT/Key | F403 |
| POST | `/v1/decisions` | 의사결정 생성 | JWT/Key | F403 |
| **게이트 패키지 (Gate Packages)** | | | | F403 |
| POST | `/v1/gate-package/:bizItemId` | 게이트 패키지 생성 | JWT/Key | F403 |
| GET | `/v1/gate-package/:id` | 게이트 패키지 조회 | JWT/Key | F403 |
| PUT | `/v1/gate-package/:id/status` | 게이트 상태 변경 | JWT/Key | F403 |
| **평가 리포트 (Reports)** | | | | F403 |
| GET | `/v1/reports` | 리포트 목록 | JWT/Key | F403 |
| GET | `/v1/reports/:id` | 리포트 상세 | JWT/Key | F403 |
| **팀 리뷰 (Team Reviews)** | | | | F403 |
| GET | `/v1/team-reviews` | 팀 리뷰 목록 | JWT/Key | F403 |
| POST | `/v1/team-reviews` | 팀 리뷰 생성 | JWT/Key | F403 |
| **검증 미팅/이력** | | | | F403 |
| GET | `/v1/meetings` | 미팅 목록 | JWT/Key | F403 |
| POST | `/v1/meetings` | 미팅 생성 | JWT/Key | F403 |
| GET | `/v1/validation-history` | 검증 이력 | JWT/Key | F403 |

### 4.2 비동기 검증 API 상세

#### `POST /v1/validate` (F404)

**Request:**
```json
{
  "bizItemId": "biz-001",
  "gateType": "ORB",
  "generatorModel": "claude-sonnet-4-5-20250514",
  "discriminatorModel": "claude-sonnet-4-5-20250514",
  "rubric": { "criteria": [...] }
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "job-uuid-001",
  "status": "pending",
  "statusUrl": "/v1/validate/job-uuid-001"
}
```

#### `GET /v1/validate/:jobId`

**Response (200 — 진행 중):**
```json
{
  "jobId": "job-uuid-001",
  "status": "running",
  "progress": { "step": "discriminator", "attempt": 1 }
}
```

**Response (200 — 완료):**
```json
{
  "jobId": "job-uuid-001",
  "status": "completed",
  "result": {
    "verdict": "PASS",
    "score": 0.87,
    "generatorOutput": "...",
    "discriminatorFeedback": "...",
    "iterations": 2
  },
  "completedAt": "2026-04-07T15:30:00Z"
}
```

### 4.3 Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable message",
    "details": { "field": "rubric", "reason": "missing criteria" }
  }
}
```

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_INPUT` | 400 | Zod 스키마 검증 실패 |
| `UNAUTHORIZED` | 401 | JWT/API Key 누락 또는 만료 |
| `FORBIDDEN` | 403 | RBAC 권한 부족 |
| `NOT_FOUND` | 404 | 리소스 미존재 |
| `QUEUE_FULL` | 429 | Queue 용량 초과 (rate limit) |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |
| `LLM_ERROR` | 502 | 외부 LLM API 호출 실패 |

---

## 5. Queue + Durable Objects Design (F404 핵심)

### 5.1 wrangler.toml 설정

```toml
name = "gate-x-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[[d1_databases]]
binding = "DB"
database_name = "gate-x-db"
database_id = "<to-be-created>"

[[queues.producers]]
binding = "VALIDATION_QUEUE"
queue = "gate-x-validation"

[[queues.consumers]]
queue = "gate-x-validation"
max_batch_size = 5
max_retries = 3
dead_letter_queue = "gate-x-dlq"

[durable_objects]
bindings = [
  { name = "VALIDATION_SESSION", class_name = "ValidationSession" }
]

[[migrations]]
tag = "v1"
new_classes = ["ValidationSession"]
```

### 5.2 Queue Consumer 설계

```typescript
// src/queue/consumer.ts
export async function handleQueue(
  batch: MessageBatch<QueueMessage>,
  env: GateXEnv
): Promise<void> {
  for (const msg of batch.messages) {
    const { jobId, tenantId, bizItemId, gateType, rubric, models } = msg.body;
    
    // 1. DO 상태 → running
    const sessionId = env.VALIDATION_SESSION.idFromName(jobId);
    const session = env.VALIDATION_SESSION.get(sessionId);
    await session.fetch("/status", { method: "PUT", body: JSON.stringify({ status: "running" }) });
    
    try {
      // 2. LLM Generator 호출
      const generatorResult = await callLLM(models.generator, {
        role: "generator", bizItemId, gateType, rubric
      }, env);
      
      // 3. LLM Discriminator 호출
      const discriminatorResult = await callLLM(models.discriminator, {
        role: "discriminator", generatorOutput: generatorResult, rubric
      }, env);
      
      // 4. D1에 결과 저장
      await saveResult(env.DB, { jobId, tenantId, generatorResult, discriminatorResult });
      
      // 5. DO 상태 → completed
      await session.fetch("/status", { method: "PUT", body: JSON.stringify({
        status: "completed", result: { verdict: discriminatorResult.verdict, score: discriminatorResult.score }
      })});
      
      msg.ack();
    } catch (error) {
      // 6. 실패 시 DO 상태 → failed, 재시도는 Queue가 자동 관리
      await session.fetch("/status", { method: "PUT", body: JSON.stringify({
        status: "failed", error: String(error)
      })});
      msg.retry();
    }
  }
}
```

### 5.3 Durable Object 설계

```typescript
// src/durables/validation-session.ts
export class ValidationSession implements DurableObject {
  state: DurableObjectState;
  
  constructor(state: DurableObjectState) {
    this.state = state;
  }
  
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/status" && request.method === "GET") {
      const status = await this.state.storage.get("status") ?? "pending";
      const result = await this.state.storage.get("result");
      const error = await this.state.storage.get("error");
      return Response.json({ status, result, error });
    }
    
    if (url.pathname === "/status" && request.method === "PUT") {
      const body = await request.json();
      await this.state.storage.put("status", body.status);
      if (body.result) await this.state.storage.put("result", body.result);
      if (body.error) await this.state.storage.put("error", body.error);
      return new Response("OK");
    }
    
    return new Response("Not Found", { status: 404 });
  }
}
```

---

## 6. Security Considerations

- [x] JWT 인증 (harness-kit createAuthMiddleware)
- [x] API Key 인증 (SHA-256 해시 저장, 원본 미저장)
- [x] RBAC (admin: 전체, user: 자기 테넌트, guest: 읽기 전용)
- [x] CORS (harness-kit createCorsMiddleware)
- [x] Zod 입력 검증 (모든 엔드포인트)
- [x] tenant_id 기반 데이터 격리 (쿼리에 WHERE tenant_id = ? 필수)
- [ ] Rate Limiting (M2에서 구현)
- [ ] API Key rotation (M3에서 구현)

---

## 7. Test Plan

### 7.1 Test Scope

| Type | Target | Tool | Sprint |
|------|--------|------|--------|
| Unit Test | Services (7개) | Vitest | 189 |
| Unit Test | Queue Consumer | Vitest + mock | 190 |
| Unit Test | DO ValidationSession | Vitest + miniflare | 190 |
| Integration Test | API endpoints (Hono) | Vitest + app.request() | 189 |
| Smoke Test | Workers 배포 후 | CI/CD deploy.yml | 190 |

### 7.2 Test Cases (Key)

**Sprint 189 (F402 + F403)**
- [ ] D1 마이그레이션이 gate-x-db에 성공적으로 적용
- [ ] 모든 CRUD 엔드포인트가 올바른 JSON 응답 반환
- [ ] tenant_id가 모든 쿼리에 포함되어 데이터 격리 동작
- [ ] FX 코어 import가 0건 (eslint no-cross-module 통과)

**Sprint 190 (F404 + F405)**
- [ ] POST /v1/validate → 202 + jobId 반환
- [ ] Queue consumer가 LLM mock과 함께 정상 동작
- [ ] DO 상태가 pending → running → completed 전이
- [ ] 실패 시 재시도 3회 후 DLQ로 이동
- [ ] JWT 없는 요청 → 401
- [ ] API Key로 인증 → 200
- [ ] 잘못된 API Key → 401
- [ ] CI/CD: D1 migration → deploy → smoke test 자동 실행

---

## 8. Implementation Guide

### 8.1 File Structure

```
packages/gate-x/
├── src/
│   ├── routes/
│   │   ├── evaluations.ts        # from modules/gate/routes/ax-bd-evaluations.ts
│   │   ├── decisions.ts          # from modules/gate/routes/decisions.ts
│   │   ├── evaluation-report.ts  # from modules/gate/routes/evaluation-report.ts
│   │   ├── gate-package.ts       # from modules/gate/routes/gate-package.ts
│   │   ├── team-reviews.ts       # from modules/gate/routes/team-reviews.ts
│   │   ├── validation.ts         # from modules/gate/routes/validation-meetings.ts + tier
│   │   ├── validate.ts           # NEW: POST /v1/validate (Queue producer)
│   │   ├── validate-status.ts    # NEW: GET /v1/validate/:jobId (DO 조회)
│   │   ├── auth.ts               # NEW: POST /v1/auth/token
│   │   └── api-keys.ts           # NEW: API Key CRUD
│   ├── services/
│   │   ├── evaluation-service.ts         # from modules/gate/
│   │   ├── evaluation-criteria.ts        # from modules/gate/
│   │   ├── evaluation-report-service.ts  # from modules/gate/
│   │   ├── gate-package-service.ts       # from modules/gate/
│   │   ├── decision-service.ts           # from modules/gate/
│   │   ├── meeting-service.ts            # from modules/gate/
│   │   ├── validation-service.ts         # from modules/gate/
│   │   ├── api-key-service.ts            # NEW
│   │   ├── auth-service.ts               # NEW
│   │   └── llm-client.ts                 # NEW: LLM API 추상화
│   ├── schemas/
│   │   ├── evaluation.schema.ts          # from modules/gate/
│   │   ├── decision.schema.ts            # from modules/gate/
│   │   ├── gate-package.schema.ts        # from modules/gate/
│   │   ├── evaluation-report.schema.ts   # from modules/gate/
│   │   ├── team-review-schema.ts         # from modules/gate/
│   │   ├── validation.schema.ts          # from modules/gate/
│   │   ├── api-key.schema.ts             # NEW
│   │   └── validate.schema.ts            # NEW: 비동기 검증 입력
│   ├── queue/
│   │   ├── producer.ts           # Queue에 작업 등록
│   │   ├── consumer.ts           # Queue 소비 + LLM 호출
│   │   └── types.ts              # QueueMessage 타입
│   ├── durables/
│   │   └── validation-session.ts # DO 클래스
│   ├── middleware/
│   │   ├── auth.ts               # JWT + API Key 인증 통합
│   │   └── tenant.ts             # tenant_id 주입
│   ├── db/
│   │   └── migrations/
│   │       ├── 0001_init.sql
│   │       └── 0002_gate_tables.sql
│   ├── env.ts                    # GateXEnv 타입
│   ├── app.ts                    # Hono app 구성
│   └── index.ts                  # Workers 엔트리
├── __tests__/
│   ├── services/
│   ├── routes/
│   ├── queue/
│   └── durables/
├── wrangler.toml
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 8.2 Implementation Order

#### Sprint 189 (F402 + F403)
1. [ ] `harness-kit scaffold generate gate-x` → packages/gate-x/ 생성
2. [ ] wrangler.toml 작성 (D1 + Queue + DO 바인딩)
3. [ ] `wrangler d1 create gate-x-db` 실행
4. [ ] 0001_init.sql + 0002_gate_tables.sql 마이그레이션 작성
5. [ ] env.ts — GateXEnv 타입 정의
6. [ ] middleware/tenant.ts — tenant_id 주입 미들웨어
7. [ ] modules/gate/ services 7개 복사 → import 경로 수정 + tenant_id 파라미터 추가
8. [ ] modules/gate/ schemas 6개 복사 → import 경로 수정
9. [ ] modules/gate/ routes 7개 복사 → Env/TenantVariables 타입 교체 + /v1/ prefix
10. [ ] app.ts — Hono app 조립 (CORS + auth + routes)
11. [ ] index.ts — Workers 엔트리 (export default)
12. [ ] 단위 테스트: services 7개 + routes smoke test
13. [ ] eslint 확인: FX 코어 import 0건

#### Sprint 190 (F404 + F405)
1. [ ] schemas/validate.schema.ts — 비동기 검증 입력 Zod
2. [ ] services/llm-client.ts — LLM API 추상화 (Anthropic/OpenAI/Google)
3. [ ] queue/types.ts — QueueMessage 타입
4. [ ] queue/producer.ts — POST /v1/validate → Queue 등록
5. [ ] durables/validation-session.ts — DO 클래스
6. [ ] queue/consumer.ts — Queue 소비 + LLM + D1 + DO
7. [ ] routes/validate.ts — POST /v1/validate 라우트
8. [ ] routes/validate-status.ts — GET /v1/validate/:jobId
9. [ ] services/auth-service.ts — JWT 토큰 발급
10. [ ] services/api-key-service.ts — API Key CRUD + 해시 검증
11. [ ] middleware/auth.ts — JWT + API Key 통합 인증
12. [ ] routes/auth.ts + routes/api-keys.ts
13. [ ] .github/workflows/gate-x-deploy.yml
14. [ ] 테스트: Queue mock + DO miniflare + auth 테스트
15. [ ] 로컬 배포 테스트 → Production 배포

### 8.3 FX 코어 의존성 해소 가이드

| FX Import | Gate-X 대체 |
|-----------|-------------|
| `import type { Env } from "../../../env.js"` | `import type { GateXEnv } from "../env.js"` |
| `import type { TenantVariables } from "../../../middleware/tenant.js"` | `import type { GateXVariables } from "../middleware/tenant.js"` |
| `Hono<{ Bindings: Env; Variables: TenantVariables }>` | `Hono<{ Bindings: GateXEnv; Variables: GateXVariables }>` |
| `c.get("orgId")` | `c.get("orgId")` (동일, GateXVariables에서 제공) |
| `c.get("jwtPayload")` | `c.get("jwtPayload")` (동일) |
| `c.env.DB` | `c.env.DB` (동일, GateXEnv에서 제공) |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-07 | 초안 — Phase 21-A Sprint 189~190 Design | Sinclair Seo |
