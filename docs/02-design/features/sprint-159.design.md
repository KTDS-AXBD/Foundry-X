---
code: FX-DSGN-S159
title: "Sprint 159 — Prototype Auto-Gen Core Pipeline + API Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S159]], [[FX-PLAN-PROTO-001]]"
---

# Sprint 159 Design: Prototype Auto-Gen Core Pipeline + API

## 1. 개요

F353(D1 마이그레이션 + Prototype API) + F354(Fallback 아키텍처 + 비용 모니터링) 구현 설계.
기존 `prototypes` 테이블(Sprint 58, biz_item HTML)과 독립된 **빌드 파이프라인 Job** 시스템.

## 2. F353: D1 마이그레이션 + Prototype API

### 2.1 D1 마이그레이션

**파일**: `packages/api/src/db/migrations/0102_prototype_jobs.sql`

```sql
-- Sprint 159: F353 Prototype Auto-Gen Job Queue
CREATE TABLE IF NOT EXISTS prototype_jobs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  prd_content TEXT NOT NULL,
  prd_title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK(status IN ('queued','building','deploying','live','failed','deploy_failed','dead_letter')),
  builder_type TEXT NOT NULL DEFAULT 'cli'
    CHECK(builder_type IN ('cli','api','ensemble')),
  pages_project TEXT,
  pages_url TEXT,
  build_log TEXT DEFAULT '',
  error_message TEXT,
  cost_input_tokens INTEGER DEFAULT 0,
  cost_output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  model_used TEXT DEFAULT 'haiku',
  fallback_used INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  started_at INTEGER,
  completed_at INTEGER
);

CREATE INDEX idx_prototype_jobs_org ON prototype_jobs(org_id);
CREATE INDEX idx_prototype_jobs_status ON prototype_jobs(org_id, status);
```

### 2.2 State Machine

```
유효한 전이:
  queued      → building
  building    → deploying | failed
  deploying   → live | deploy_failed
  failed      → queued (retry, retry_count < 3)
  failed      → dead_letter (retry_count >= 3)
  deploy_failed → queued (retry)
  deploy_failed → dead_letter (retry_count >= 3)
```

**구현**: `PrototypeJobService.transition(id, toStatus)` — 유효하지 않은 전이 시 에러 throw.

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  queued: ['building'],
  building: ['deploying', 'failed'],
  deploying: ['live', 'deploy_failed'],
  failed: ['queued', 'dead_letter'],
  deploy_failed: ['queued', 'dead_letter'],
};
```

### 2.3 Zod 스키마

**파일**: `packages/api/src/schemas/prototype-job.ts`

```typescript
// 상태 enum
const JobStatus = z.enum([
  'queued', 'building', 'deploying', 'live',
  'failed', 'deploy_failed', 'dead_letter',
]);

const BuilderType = z.enum(['cli', 'api', 'ensemble']);

// 생성 요청
const CreatePrototypeJobSchema = z.object({
  prdContent: z.string().min(10),
  prdTitle: z.string().min(1).max(200),
});

// 상태 업데이트 요청 (Builder Server → API)
const UpdatePrototypeJobSchema = z.object({
  status: JobStatus.optional(),
  buildLog: z.string().optional(),
  pagesProject: z.string().optional(),
  pagesUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
  costInputTokens: z.number().int().min(0).optional(),
  costOutputTokens: z.number().int().min(0).optional(),
  costUsd: z.number().min(0).optional(),
  modelUsed: z.string().optional(),
  fallbackUsed: z.boolean().optional(),
});

// 응답
const PrototypeJobSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  prdTitle: z.string(),
  status: JobStatus,
  builderType: BuilderType,
  pagesUrl: z.string().nullable(),
  costUsd: z.number(),
  modelUsed: z.string(),
  fallbackUsed: z.boolean(),
  retryCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  startedAt: z.number().nullable(),
  completedAt: z.number().nullable(),
});

// 목록 응답
const PrototypeJobListSchema = z.object({
  items: z.array(PrototypeJobSchema),
  total: z.number(),
});

// 상세 응답 (빌드 로그 포함)
const PrototypeJobDetailSchema = PrototypeJobSchema.extend({
  prdContent: z.string(),
  buildLog: z.string(),
  errorMessage: z.string().nullable(),
});
```

### 2.4 PrototypeJobService

**파일**: `packages/api/src/services/prototype-job-service.ts`

```typescript
export class PrototypeJobService {
  constructor(private db: D1Database) {}

  // 생성 — 상태: queued
  async create(orgId: string, prdContent: string, prdTitle: string): Promise<PrototypeJobRecord>

  // 목록 — org_id 필터 + status 선택적 필터 + 페이지네이션
  async list(orgId: string, opts: { status?: string; limit: number; offset: number }): Promise<{ items: PrototypeJobRecord[]; total: number }>

  // 상세 — 빌드 로그 포함
  async getById(id: string, orgId: string): Promise<PrototypeJobDetail | null>

  // 상태 전이 — State Machine 검증
  async transition(id: string, orgId: string, toStatus: string, updates?: Partial<JobUpdates>): Promise<PrototypeJobRecord>

  // retry — failed/deploy_failed → queued (retry_count < 3만 허용)
  async retry(id: string, orgId: string): Promise<PrototypeJobRecord>
}
```

### 2.5 라우트

**파일**: `packages/api/src/routes/prototype-jobs.ts`

| Method | Path | Handler | 설명 |
|--------|------|---------|------|
| POST | `/prototype-jobs` | `create` | Job 생성. body: `{prdContent, prdTitle}` → 201 |
| GET | `/prototype-jobs` | `list` | 목록. query: `status`, `limit`, `offset` |
| GET | `/prototype-jobs/:id` | `getById` | 상세 (빌드 로그 포함) |
| PATCH | `/prototype-jobs/:id` | `update` | Builder Server가 상태/로그/URL 업데이트 |

Hono router + Zod safeParse 패턴 사용 (ax-bd-prototypes.ts 패턴 참조).

## 3. F354: Fallback 아키텍처 + 비용 모니터링

### 3.1 D1 마이그레이션

**파일**: `packages/api/src/db/migrations/0103_prototype_usage_logs.sql`

```sql
-- Sprint 159: F354 Prototype Usage & Cost Tracking
CREATE TABLE IF NOT EXISTS prototype_usage_logs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  builder_type TEXT NOT NULL CHECK(builder_type IN ('cli','api','ensemble')),
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0.0,
  duration_ms INTEGER DEFAULT 0,
  fallback_reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_proto_usage_org ON prototype_usage_logs(org_id);
CREATE INDEX idx_proto_usage_job ON prototype_usage_logs(job_id);
CREATE INDEX idx_proto_usage_created ON prototype_usage_logs(org_id, created_at);
```

### 3.2 Fallback Strategy

**파일**: `packages/api/src/services/prototype-fallback.ts`

```typescript
export type FallbackLevel = 'cli' | 'api' | 'dead_letter';

export interface FallbackDecision {
  level: FallbackLevel;
  model: string;
  reason: string | null;
}

// 모델별 비용 상수 (입력/출력 per 1M tokens)
const MODEL_COSTS = {
  haiku: { input: 0.80, output: 4.00 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 },
};

export class PrototypeFallbackStrategy {
  // CLI 실패 시 다음 level 결정 (reason: 실패 사유 문자열)
  static next(currentLevel: FallbackLevel, reason: string): FallbackDecision

  // 토큰 수 → USD 비용 계산
  static calculateCost(model: string, inputTokens: number, outputTokens: number): number

  // 월 예산 체크 (한도 초과 시 dead_letter로 전환)
  static async checkBudget(db: D1Database, orgId: string, monthlyLimitUsd: number): Promise<{ withinBudget: boolean; currentUsd: number; limitUsd: number }>
}
```

### 3.3 PrototypeUsageService

**파일**: `packages/api/src/services/prototype-usage-service.ts`

```typescript
export class PrototypeUsageService {
  constructor(private db: D1Database) {}

  // 사용 로그 기록
  async log(orgId: string, entry: UsageLogEntry): Promise<void>

  // 월별 사용량 요약
  async getMonthlySummary(orgId: string, year: number, month: number): Promise<UsageSummary>

  // 일별 사용량 (차트용)
  async getDailyBreakdown(orgId: string, days: number): Promise<DailyUsage[]>

  // 예산 상태
  async getBudgetStatus(orgId: string, monthlyLimitUsd: number): Promise<BudgetStatus>
}
```

### 3.4 Zod 스키마

**파일**: `packages/api/src/schemas/prototype-usage.ts`

```typescript
const UsageSummarySchema = z.object({
  totalJobs: z.number(),
  totalCostUsd: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  byModel: z.array(z.object({
    model: z.string(),
    jobs: z.number(),
    costUsd: z.number(),
  })),
  byBuilderType: z.array(z.object({
    builderType: z.string(),
    jobs: z.number(),
    costUsd: z.number(),
  })),
});

const BudgetStatusSchema = z.object({
  currentUsd: z.number(),
  limitUsd: z.number(),
  remainingUsd: z.number(),
  usagePercent: z.number(),
  withinBudget: z.boolean(),
});

const DailyUsageSchema = z.object({
  date: z.string(),
  jobs: z.number(),
  costUsd: z.number(),
});
```

### 3.5 라우트

**파일**: `packages/api/src/routes/prototype-usage.ts`

| Method | Path | Handler | 설명 |
|--------|------|---------|------|
| GET | `/prototype-usage` | `getSummary` | 월별 사용량 요약. query: `year`, `month` |
| GET | `/prototype-usage/budget` | `getBudget` | 예산 상태. query: `limitUsd` (기본 100) |
| GET | `/prototype-usage/daily` | `getDaily` | 일별 차트 데이터. query: `days` (기본 30) |

## 4. app.ts 등록

```typescript
// Sprint 159: Prototype Auto-Gen (F353, F354, Phase 16)
import { prototypeJobsRoute } from "./routes/prototype-jobs.js";
import { prototypeUsageRoute } from "./routes/prototype-usage.js";

// Protected API routes 섹션에 추가:
app.route("/api", prototypeJobsRoute);
app.route("/api", prototypeUsageRoute);
```

## 5. 테스트 설계

### 5.1 PrototypeJobService 테스트

**파일**: `packages/api/src/__tests__/prototype-job-service.test.ts`

| # | 테스트 케이스 |
|---|-------------|
| 1 | Job 생성 — queued 상태로 생성됨 |
| 2 | 목록 조회 — org_id 격리, status 필터, 페이지네이션 |
| 3 | 상세 조회 — 빌드 로그 포함 |
| 4 | 유효 전이 — queued→building→deploying→live |
| 5 | 유효 전이 — building→failed→queued (retry) |
| 6 | 무효 전이 — queued→live 시 에러 |
| 7 | 무효 전이 — live→building 시 에러 |
| 8 | retry — retry_count < 3이면 queued로 복귀 |
| 9 | retry — retry_count >= 3이면 dead_letter |
| 10 | PATCH 업데이트 — status + buildLog + pagesUrl 동시 변경 |

### 5.2 라우트 통합 테스트

**파일**: `packages/api/src/__tests__/prototype-jobs-route.test.ts`

| # | 테스트 케이스 |
|---|-------------|
| 1 | POST /prototype-jobs — 201 + Job 반환 |
| 2 | POST /prototype-jobs — prdContent 빈 문자열 → 400 |
| 3 | GET /prototype-jobs — 목록 + 페이지네이션 |
| 4 | GET /prototype-jobs/:id — 상세 + buildLog |
| 5 | GET /prototype-jobs/:id — 없는 ID → 404 |
| 6 | PATCH /prototype-jobs/:id — status 전이 성공 |
| 7 | PATCH /prototype-jobs/:id — 무효 전이 → 409 |

### 5.3 Fallback + Usage 테스트

**파일**: `packages/api/src/__tests__/prototype-fallback.test.ts`

| # | 테스트 케이스 |
|---|-------------|
| 1 | CLI 실패 → API Fallback 결정 |
| 2 | API 실패 → dead_letter 결정 |
| 3 | 비용 계산 — Haiku 30턴 ≈ $0.5~1 |
| 4 | 비용 계산 — Sonnet 30턴 ≈ $2~5 |

**파일**: `packages/api/src/__tests__/prototype-usage-service.test.ts`

| # | 테스트 케이스 |
|---|-------------|
| 1 | 사용 로그 기록 |
| 2 | 월별 요약 — 모델별/타입별 집계 |
| 3 | 일별 차트 데이터 |
| 4 | 예산 상태 — 한도 내 |
| 5 | 예산 상태 — 한도 초과 경고 |

## 6. 파일 체크리스트

| # | 파일 | 동작 | F-item |
|---|------|------|--------|
| 1 | `packages/api/src/db/migrations/0102_prototype_jobs.sql` | 신규 | F353 |
| 2 | `packages/api/src/db/migrations/0103_prototype_usage_logs.sql` | 신규 | F354 |
| 3 | `packages/api/src/schemas/prototype-job.ts` | 신규 | F353 |
| 4 | `packages/api/src/schemas/prototype-usage.ts` | 신규 | F354 |
| 5 | `packages/api/src/services/prototype-job-service.ts` | 신규 | F353 |
| 6 | `packages/api/src/services/prototype-fallback.ts` | 신규 | F354 |
| 7 | `packages/api/src/services/prototype-usage-service.ts` | 신규 | F354 |
| 8 | `packages/api/src/routes/prototype-jobs.ts` | 신규 | F353 |
| 9 | `packages/api/src/routes/prototype-usage.ts` | 신규 | F354 |
| 10 | `packages/api/src/app.ts` | 수정 | F353+F354 |
| 11 | `packages/api/src/__tests__/prototype-job-service.test.ts` | 신규 | F353 |
| 12 | `packages/api/src/__tests__/prototype-jobs-route.test.ts` | 신규 | F353 |
| 13 | `packages/api/src/__tests__/prototype-fallback.test.ts` | 신규 | F354 |
| 14 | `packages/api/src/__tests__/prototype-usage-service.test.ts` | 신규 | F354 |
