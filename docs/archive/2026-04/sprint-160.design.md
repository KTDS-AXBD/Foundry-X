---
code: FX-DSGN-S160
title: "Sprint 160 — O-G-D 품질 루프 + Prototype 대시보드 Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S160]], [[FX-SPEC-001]]"
---

# Sprint 160 Design: O-G-D 품질 루프 + Prototype 대시보드

## §1 Overview

Sprint 159(F353+F354)가 구축한 Prototype Job Queue + Cost Tracking 위에:
- **F355**: O-G-D(Orchestrator-Generator-Discriminator) 품질 루프 — API 서비스 레이어
- **F356**: Prototype 대시보드 + 피드백 Loop — Web UI + 피드백 API + Slack 알림

## §2 Database Schema

### 2.1 ogd_rounds (Migration 0104)

```sql
CREATE TABLE IF NOT EXISTS ogd_rounds (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  org_id        TEXT NOT NULL,
  round_number  INTEGER NOT NULL,
  quality_score REAL,
  feedback      TEXT,
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd      REAL DEFAULT 0.0,
  model_used    TEXT DEFAULT 'haiku',
  passed        INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(job_id, round_number)
);
CREATE INDEX idx_ogd_rounds_job ON ogd_rounds(job_id);
CREATE INDEX idx_ogd_rounds_org ON ogd_rounds(org_id);
```

### 2.2 prototype_feedback (Migration 0105)

```sql
CREATE TABLE IF NOT EXISTS prototype_feedback (
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL REFERENCES prototype_jobs(id) ON DELETE CASCADE,
  org_id      TEXT NOT NULL,
  author_id   TEXT,
  category    TEXT NOT NULL CHECK(category IN ('layout','content','functionality','ux','other')),
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','applied','dismissed')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_proto_feedback_job ON prototype_feedback(job_id);
CREATE INDEX idx_proto_feedback_org ON prototype_feedback(org_id);
```

### 2.3 prototype_jobs 확장 (Migration 0106)

```sql
ALTER TABLE prototype_jobs ADD COLUMN quality_score REAL;
ALTER TABLE prototype_jobs ADD COLUMN ogd_rounds INTEGER DEFAULT 0;
ALTER TABLE prototype_jobs ADD COLUMN feedback_content TEXT;
```

## §3 Shared Types

### 3.1 packages/shared/src/ogd.ts

```typescript
export type OgdStatus = 'pending' | 'running' | 'passed' | 'failed' | 'max_rounds';

export interface OgdRound {
  id: string;
  jobId: string;
  roundNumber: number;
  qualityScore: number | null;
  feedback: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelUsed: string;
  passed: boolean;
  createdAt: number;
}

export interface OgdSummary {
  jobId: string;
  totalRounds: number;
  bestScore: number;
  bestRound: number;
  passed: boolean;
  totalCostUsd: number;
  rounds: OgdRound[];
}

export const OGD_THRESHOLD = 0.85;
export const OGD_MAX_ROUNDS = 3;
```

### 3.2 packages/shared/src/prototype-feedback.ts

```typescript
export type FeedbackCategory = 'layout' | 'content' | 'functionality' | 'ux' | 'other';
export type FeedbackStatus = 'pending' | 'applied' | 'dismissed';

export interface PrototypeFeedback {
  id: string;
  jobId: string;
  orgId: string;
  authorId: string | null;
  category: FeedbackCategory;
  content: string;
  status: FeedbackStatus;
  createdAt: number;
}
```

## §4 API Design

### 4.1 O-G-D Quality Routes (ogd-quality.ts)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ogd/evaluate` | O-G-D 루프 실행 (job_id 기반) |
| GET | `/api/ogd/rounds/:jobId` | 특정 job의 O-G-D 라운드 히스토리 |
| GET | `/api/ogd/summary/:jobId` | O-G-D 요약 (bestScore, passed 등) |

**POST /api/ogd/evaluate** 요청:
```json
{ "jobId": "uuid", "prdContent": "..." }
```
**응답:**
```json
{
  "summary": { "totalRounds": 2, "bestScore": 0.88, "passed": true, "totalCostUsd": 0.002 },
  "rounds": [...]
}
```

### 4.2 Prototype Feedback Routes (prototype-feedback.ts)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/prototype-jobs/:id/feedback` | 피드백 저장 + 재생성 트리거 |
| GET | `/api/prototype-jobs/:id/feedback` | 피드백 목록 조회 |

**POST feedback 요청:**
```json
{ "category": "layout", "content": "헤더 영역이 너무 비어 보여요" }
```
**응답:** `{ "feedback": {...}, "jobStatus": "feedback_pending" }`

### 4.3 Slack Notification

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notifications/slack` | Slack 알림 발송 (내부 호출) |

**이벤트 타입:** `build_complete`, `build_failed`, `feedback_received`, `ogd_pass`

## §5 Service Layer

### 5.1 OgdOrchestratorService

```typescript
class OgdOrchestratorService {
  constructor(
    private db: D1Database,
    private generator: OgdGeneratorService,
    private discriminator: OgdDiscriminatorService,
  ) {}

  async runLoop(orgId: string, jobId: string, prdContent: string): Promise<OgdSummary>
  // 1. 체크리스트 전처리 (PRD → 평가 항목 추출)
  // 2. 라운드 반복 (max 3):
  //    a. Generator: PRD + 이전 피드백 → HTML 생성
  //    b. Discriminator: HTML + 체크리스트 → 스코어 + 피드백
  //    c. 스코어 ≥ 0.85 → 조기 탈출
  // 3. 최종 결과 DB 저장 + prototype_jobs.quality_score 갱신
}
```

### 5.2 OgdGeneratorService

```typescript
class OgdGeneratorService {
  constructor(private db: D1Database) {}

  async generate(prdContent: string, previousFeedback?: string): Promise<{
    html: string;
    inputTokens: number;
    outputTokens: number;
    modelUsed: string;
  }>
  // Haiku 모델 기반 PRD → HTML 변환
  // previousFeedback가 있으면 개선 프롬프트 추가
}
```

### 5.3 OgdDiscriminatorService

```typescript
class OgdDiscriminatorService {
  constructor(private db: D1Database) {}

  async evaluate(html: string, checklist: string[]): Promise<{
    qualityScore: number;
    feedback: string;
    inputTokens: number;
    outputTokens: number;
    passed: boolean;
  }>
  // 체크리스트 항목별 0/1 판정 → 평균 스코어
  // 실패 항목에 대해 개선 피드백 생성
}
```

### 5.4 PrototypeFeedbackService

```typescript
class PrototypeFeedbackService {
  constructor(private db: D1Database) {}

  async create(orgId: string, jobId: string, input: {
    authorId?: string;
    category: FeedbackCategory;
    content: string;
  }): Promise<PrototypeFeedback>
  // 피드백 저장 + prototype_jobs 상태를 feedback_pending으로 전환

  async listByJob(orgId: string, jobId: string): Promise<PrototypeFeedback[]>
}
```

### 5.5 SlackNotificationService

```typescript
class SlackNotificationService {
  constructor(private webhookUrl?: string) {}

  async notify(event: SlackEvent): Promise<boolean>
  // webhookUrl 미설정 시 graceful skip (false 반환, 에러 안 냄)
  // 실패 시 로그만 기록, throw 안 함
}

type SlackEvent = {
  type: 'build_complete' | 'build_failed' | 'feedback_received' | 'ogd_pass';
  jobId: string;
  jobTitle: string;
  detail?: string;
};
```

## §6 Web Components

### 6.1 Pages

| 파일 | 라우트 | 내용 |
|------|--------|------|
| `routes/prototype-dashboard.tsx` | `/prototype-dashboard` | 목록 + 상태 필터 + 비용 요약 카드 |
| `routes/prototype-detail.tsx` | `/prototype-dashboard/:id` | 상세: 빌드로그 + iframe 프리뷰 + O-G-D 히스토리 + 피드백 |

### 6.2 Components

| 파일 | 역할 |
|------|------|
| `components/feature/PrototypeCard.tsx` | 목록 카드 — 제목, 상태 뱃지, 비용, 최종 스코어, 생성일 |
| `components/feature/BuildLogViewer.tsx` | 빌드로그 단계별 펼침/접기 (accordion) |
| `components/feature/FeedbackForm.tsx` | 피드백 입력 — 카테고리 드롭다운 + 텍스트 |
| `components/feature/QualityScoreChart.tsx` | O-G-D 라운드별 스코어 바 차트 (threshold 라인 포함) |
| `components/feature/PrototypeCostSummary.tsx` | 월 비용 요약 + 예산 게이지 |

### 6.3 API Client

`lib/api-client.ts`에 추가:
```typescript
// O-G-D
getOgdSummary(jobId: string): Promise<OgdSummary>
getOgdRounds(jobId: string): Promise<OgdRound[]>

// Feedback
submitFeedback(jobId: string, input: FeedbackInput): Promise<PrototypeFeedback>
listFeedback(jobId: string): Promise<PrototypeFeedback[]>

// Jobs (기존 확장)
listPrototypeJobs(params?: JobListParams): Promise<JobListResponse>
getPrototypeJob(id: string): Promise<PrototypeJobDetail>
```

## §7 Route Registration

`packages/api/src/app.ts`에 추가:
```typescript
import { ogdQualityRoute } from "./routes/ogd-quality.js";
import { prototypeFeedbackRoute } from "./routes/prototype-feedback.js";

app.route("/api", ogdQualityRoute);
app.route("/api", prototypeFeedbackRoute);
```

`packages/web/src/routes.ts` (또는 라우트 설정):
```typescript
{ path: "prototype-dashboard", lazy: () => import("./routes/prototype-dashboard") },
{ path: "prototype-dashboard/:id", lazy: () => import("./routes/prototype-detail") },
```

## §8 Zod Schemas

### 8.1 ogd-quality-schema.ts

```typescript
export const OgdEvaluateRequestSchema = z.object({
  jobId: z.string().uuid(),
  prdContent: z.string().min(10),
});

export const OgdRoundSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  roundNumber: z.number().int(),
  qualityScore: z.number().min(0).max(1).nullable(),
  feedback: z.string().nullable(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  costUsd: z.number(),
  modelUsed: z.string(),
  passed: z.boolean(),
  createdAt: z.number(),
});

export const OgdSummarySchema = z.object({
  jobId: z.string(),
  totalRounds: z.number(),
  bestScore: z.number(),
  bestRound: z.number(),
  passed: z.boolean(),
  totalCostUsd: z.number(),
  rounds: z.array(OgdRoundSchema),
});
```

### 8.2 prototype-feedback-schema.ts

```typescript
export const FEEDBACK_CATEGORIES = ['layout','content','functionality','ux','other'] as const;

export const CreateFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  content: z.string().min(1).max(2000),
});

export const PrototypeFeedbackSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  orgId: z.string(),
  authorId: z.string().nullable(),
  category: z.enum(FEEDBACK_CATEGORIES),
  content: z.string(),
  status: z.enum(['pending','applied','dismissed']),
  createdAt: z.number(),
});
```

## §9 Worker 파일 매핑

### Worker A: API Backend (F355 + F356 API)

| # | 파일 | 작업 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0104_ogd_rounds.sql` | ogd_rounds 테이블 |
| 2 | `packages/api/src/db/migrations/0105_prototype_feedback.sql` | prototype_feedback 테이블 |
| 3 | `packages/api/src/db/migrations/0106_prototype_jobs_ogd.sql` | prototype_jobs 확장 컬럼 |
| 4 | `packages/shared/src/ogd.ts` | O-G-D 공유 타입 |
| 5 | `packages/shared/src/prototype-feedback.ts` | 피드백 공유 타입 |
| 6 | `packages/api/src/schemas/ogd-quality-schema.ts` | O-G-D Zod 스키마 |
| 7 | `packages/api/src/schemas/prototype-feedback-schema.ts` | 피드백 Zod 스키마 |
| 8 | `packages/api/src/services/ogd-orchestrator-service.ts` | O-G-D 오케스트레이터 |
| 9 | `packages/api/src/services/ogd-generator-service.ts` | Generator 서비스 |
| 10 | `packages/api/src/services/ogd-discriminator-service.ts` | Discriminator 서비스 |
| 11 | `packages/api/src/services/prototype-feedback-service.ts` | 피드백 서비스 |
| 12 | `packages/api/src/services/slack-notification-service.ts` | Slack 알림 서비스 |
| 13 | `packages/api/src/routes/ogd-quality.ts` | O-G-D 라우트 |
| 14 | `packages/api/src/routes/prototype-feedback.ts` | 피드백 라우트 |
| 15 | `packages/api/src/app.ts` | 라우트 등록 (2줄 추가) |

### Worker B: Web Dashboard (F356 UI)

| # | 파일 | 작업 |
|---|------|------|
| 1 | `packages/web/src/routes/prototype-dashboard.tsx` | 대시보드 페이지 |
| 2 | `packages/web/src/routes/prototype-detail.tsx` | 상세 페이지 |
| 3 | `packages/web/src/components/feature/PrototypeCard.tsx` | 목록 카드 |
| 4 | `packages/web/src/components/feature/BuildLogViewer.tsx` | 빌드로그 뷰어 |
| 5 | `packages/web/src/components/feature/FeedbackForm.tsx` | 피드백 입력 폼 |
| 6 | `packages/web/src/components/feature/QualityScoreChart.tsx` | 품질 스코어 차트 |
| 7 | `packages/web/src/components/feature/PrototypeCostSummary.tsx` | 비용 요약 |

### Tests

| # | 파일 | 대상 |
|---|------|------|
| 1 | `packages/api/src/services/__tests__/ogd-orchestrator-service.test.ts` | 오케스트레이터 (수렴/실패/최대라운드) |
| 2 | `packages/api/src/services/__tests__/ogd-generator-service.test.ts` | Generator 단위 |
| 3 | `packages/api/src/services/__tests__/ogd-discriminator-service.test.ts` | Discriminator 단위 |
| 4 | `packages/api/src/services/__tests__/prototype-feedback-service.test.ts` | 피드백 CRUD |
| 5 | `packages/api/src/services/__tests__/slack-notification-service.test.ts` | Slack 알림 |
| 6 | `packages/api/src/routes/__tests__/ogd-quality.test.ts` | O-G-D 라우트 통합 |
| 7 | `packages/api/src/routes/__tests__/prototype-feedback.test.ts` | 피드백 라우트 통합 |

## §10 PrototypeJobService 확장

기존 `VALID_TRANSITIONS`에 `feedback_pending` 추가:

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  queued: ["building"],
  building: ["deploying", "failed"],
  deploying: ["live", "deploy_failed"],
  live: ["feedback_pending"],          // ← 추가
  failed: ["queued", "dead_letter"],
  deploy_failed: ["queued", "dead_letter"],
  feedback_pending: ["building"],      // ← 추가
};
```

`JOB_STATUSES` 배열에도 `"feedback_pending"` 추가.

## §11 Sidebar Navigation

`packages/web/src/components/sidebar.tsx`에 Prototype Dashboard 메뉴 추가:
- 아이콘: Beaker 또는 Box
- 위치: 기존 메뉴 하단 "도구" 섹션
- 경로: `/prototype-dashboard`
