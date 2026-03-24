---
code: FX-DSGN-057
title: Sprint 57 — 수집 채널 통합 + 시장/트렌드 데이터 자동 연동 (F179, F190) Design
version: 0.1
status: Draft
category: DSGN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
references: FX-PLAN-057
---

# Sprint 57 Design Document

> **Reference**: [[FX-PLAN-057]] `docs/01-plan/features/sprint-57.plan.md`
>
> F179: 사업 아이템 수집 3채널(Agent 자동 / Field-driven / IDEA Portal) 통합 파이프라인
> F190: 외부 시장·경쟁사·트렌드 데이터 자동 연동 + LLM 요약

---

## 1. Service Interfaces

### 1.1 CollectionPipelineService (F179 — 수집 오케스트레이터)

```typescript
// packages/api/src/services/collection-pipeline.ts

export interface CollectionCandidate {
  title: string;
  description: string;
  source: "agent" | "idea_portal";
  sourceUrl?: string;          // 원본 URL (뉴스, 블로그 등)
  keywords?: string[];         // 수집에 사용된 키워드
}

export interface CollectionResult {
  jobId: string;
  channel: "agent" | "idea_portal";
  itemsFound: number;
  itemsNew: number;
  itemsDuplicate: number;
  items: Array<{ id: string; title: string; status: string }>;
}

export interface CollectionStats {
  total: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  recentJobs: Array<{
    id: string;
    channel: string;
    status: string;
    itemsFound: number;
    itemsNew: number;
    startedAt: string;
  }>;
  approvalRate: number;   // approved / (approved + rejected)
}

export class CollectionPipelineService {
  constructor(private db: D1Database) {}

  /** 수집 후보를 정규화하고 중복 검사 후 biz_items에 저장 */
  async ingest(
    orgId: string,
    userId: string,
    candidates: CollectionCandidate[],
    jobId: string,
  ): Promise<CollectionResult>;

  /** 제목 기반 중복 검사 (정확 매칭 + 유사도) */
  async checkDuplicate(orgId: string, title: string): Promise<{
    isDuplicate: boolean;
    matchedItemId?: string;
    similarity?: number;
  }>;

  /** 수집 작업(Job) 생성 */
  async createJob(
    orgId: string,
    userId: string,
    channel: string,
    keywords?: string[],
  ): Promise<string>;

  /** 수집 작업 완료 처리 */
  async completeJob(
    jobId: string,
    result: { itemsFound: number; itemsNew: number; itemsDuplicate: number },
  ): Promise<void>;

  /** 수집 작업 실패 처리 */
  async failJob(jobId: string, error: string): Promise<void>;

  /** 수집 작업 이력 조회 */
  async listJobs(
    orgId: string,
    filters?: { channel?: string; limit?: number },
  ): Promise<Array<{
    id: string;
    channel: string;
    status: string;
    keywords: string[];
    itemsFound: number;
    itemsNew: number;
    itemsDuplicate: number;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  }>>;

  /** 채널별 수집 통계 */
  async getStats(orgId: string): Promise<CollectionStats>;

  /** Screening 큐 — pending_review 상태 아이템 목록 */
  async getScreeningQueue(orgId: string): Promise<Array<{
    id: string;
    title: string;
    description: string | null;
    source: string;
    createdAt: string;
  }>>;

  /** 아이템 승인 (pending_review → draft) */
  async approveItem(id: string): Promise<void>;

  /** 아이템 반려 (pending_review → rejected) */
  async rejectItem(id: string, reason?: string): Promise<void>;
}
```

### 1.2 AgentCollector (F179 — LLM 기반 자동 수집)

```typescript
// packages/api/src/services/agent-collector.ts

export interface AgentCollectRequest {
  keywords: string[];           // 검색 키워드 (예: ["AI 손해사정", "보험 자동화"])
  maxItems?: number;            // 최대 수집 건수 (기본 5)
  focusArea?: string;           // 산업 분야 힌트
}

export interface AgentCollectResult {
  items: CollectionCandidate[];
  tokensUsed: number;
  model: string;
  duration: number;
}

export class AgentCollector {
  constructor(private runner: AgentRunner) {}

  /** LLM을 활용해 키워드 기반 사업 아이템 후보를 생성 */
  async collect(request: AgentCollectRequest): Promise<AgentCollectResult>;
}

// 에러 클래스
export class CollectorError extends Error {
  constructor(
    message: string,
    public code: "LLM_EXECUTION_FAILED" | "LLM_PARSE_ERROR" | "EMPTY_RESULT",
  ) {
    super(message);
    this.name = "CollectorError";
  }
}
```

### 1.3 TrendDataService (F190 — 시장/트렌드 데이터)

```typescript
// packages/api/src/services/trend-data-service.ts

export interface TrendReport {
  id: string;
  bizItemId: string;
  marketSummary: string;
  marketSizeEstimate: {
    tam: string;
    sam: string;
    som: string;
    currency: string;
    year: number;
    confidence: "high" | "medium" | "low";
  } | null;
  competitors: Array<{
    name: string;
    description: string;
    url?: string;
    relevance: "high" | "medium" | "low";
  }>;
  trends: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    timeframe: string;
  }>;
  keywordsUsed: string[];
  modelUsed: string;
  tokensUsed: number;
  analyzedAt: string;
  expiresAt: string;
}

export class TrendDataService {
  constructor(
    private runner: AgentRunner,
    private db: D1Database,
  ) {}

  /** 사업 아이템 기반 트렌드 분석 실행 */
  async analyze(
    item: { id: string; title: string; description: string | null },
    options?: { forceRefresh?: boolean },
  ): Promise<TrendReport>;

  /** 캐시된 트렌드 리포트 조회 (TTL 내) */
  async getReport(bizItemId: string): Promise<TrendReport | null>;

  /** 캐시 만료 여부 확인 */
  async isExpired(bizItemId: string): Promise<boolean>;
}

export class TrendAnalysisError extends Error {
  constructor(
    message: string,
    public code: "LLM_EXECUTION_FAILED" | "LLM_PARSE_ERROR",
  ) {
    super(message);
    this.name = "TrendAnalysisError";
  }
}
```

### 1.4 CompetitorScanner (F190 — 경쟁사 스캔)

```typescript
// packages/api/src/services/competitor-scanner.ts

export interface CompetitorScanResult {
  competitors: Array<{
    name: string;
    description: string;
    url?: string;
    relevance: "high" | "medium" | "low";
    strengths: string[];
    weaknesses: string[];
  }>;
  marketPosition: string;       // KT DS 관점 포지셔닝 분석
  tokensUsed: number;
  model: string;
}

export class CompetitorScanner {
  constructor(private runner: AgentRunner) {}

  /** 사업 아이템 기반 경쟁사/유사 서비스 스캔 */
  async scan(
    item: { title: string; description: string | null },
    context?: { itemType?: string; startingPoint?: string },
  ): Promise<CompetitorScanResult>;
}
```

---

## 2. Prompt Design

### 2.1 AgentCollector 시스템 프롬프트

```typescript
// packages/api/src/services/agent-collector-prompts.ts

export const AGENT_COLLECTOR_SYSTEM_PROMPT = `당신은 KT DS AX 사업개발팀의 AI 사업 아이템 발굴 전문가입니다.
주어진 키워드를 기반으로 B2B/B2G AI 사업 기회를 탐색하고, 구체적인 사업 아이템 후보를 제안합니다.

규칙:
- KT DS의 강점(AI/DX 컨설팅, 통신·보험·공공 도메인 전문성)을 고려
- 실현 가능한 사업 아이템만 제안 (기술적으로 구현 가능, 시장 수요 존재)
- 각 아이템에 대해 출처 유형(서비스 벤치마크 / 기술 트렌드 / 고객 페인)을 명시

출력 형식 (JSON):
{
  "items": [
    {
      "title": "아이템 제목 (30자 이내)",
      "description": "아이템 설명 (200자 이내, 핵심 가치 + 타겟 고객 포함)",
      "sourceUrl": "참고 서비스/기술 URL (있으면)",
      "keywords": ["관련", "키워드"]
    }
  ]
}`;

export function buildCollectorPrompt(
  keywords: string[],
  maxItems: number,
  focusArea?: string,
): string {
  return `다음 키워드를 기반으로 KT DS가 추진할 수 있는 AI 사업 아이템 후보를 ${maxItems}개 제안해주세요.

키워드: ${keywords.join(", ")}
${focusArea ? `산업 분야: ${focusArea}` : ""}

각 아이템은 "서비스명 + 핵심 가치" 형태로, 구체적이고 실행 가능한 수준으로 작성해주세요.`;
}
```

### 2.2 TrendDataService 시스템 프롬프트

```typescript
// packages/api/src/services/trend-data-prompts.ts

export const TREND_ANALYSIS_SYSTEM_PROMPT = `당신은 B2B AI 시장 분석 전문가입니다.
사업 아이템에 대해 시장 규모(TAM/SAM/SOM), 경쟁 환경, 핵심 트렌드를 분석합니다.

규칙:
- 시장 규모는 가능한 경우 숫자로 추정 (출처 불확실하면 confidence: "low" 명시)
- 경쟁사는 직접 경쟁 + 간접 경쟁 구분
- 트렌드는 1~2년 내 영향력 기준으로 정렬
- 한국 시장 중심, 글로벌 관점 보충

출력 형식 (JSON):
{
  "marketSummary": "시장 요약 (200자)",
  "marketSizeEstimate": {
    "tam": "총 시장 규모 (예: 5조원)",
    "sam": "유효 시장 (예: 8000억원)",
    "som": "초기 타겟 (예: 200억원)",
    "currency": "KRW",
    "year": 2026,
    "confidence": "medium"
  },
  "competitors": [
    {
      "name": "경쟁사명",
      "description": "핵심 사업/제품",
      "url": "https://...",
      "relevance": "high"
    }
  ],
  "trends": [
    {
      "title": "트렌드 제목",
      "description": "트렌드 설명",
      "impact": "high",
      "timeframe": "2026-2027"
    }
  ]
}`;

export function buildTrendPrompt(item: {
  title: string;
  description: string | null;
}): string {
  return `다음 사업 아이템에 대해 시장·경쟁사·트렌드 분석을 수행해주세요.

사업 아이템: ${item.title}
${item.description ? `설명: ${item.description}` : ""}

KT DS 관점에서 이 아이템이 위치할 시장을 분석해주세요.`;
}
```

### 2.3 CompetitorScanner 시스템 프롬프트

```typescript
// packages/api/src/services/competitor-scanner-prompts.ts

export const COMPETITOR_SCAN_SYSTEM_PROMPT = `당신은 경쟁 분석 전문가입니다.
사업 아이템과 관련된 경쟁사/유사 서비스를 분석하고, KT DS의 포지셔닝 기회를 제시합니다.

규칙:
- 직접 경쟁사 3~5개 + 간접 경쟁사 2~3개
- 각 경쟁사의 강점/약점을 KT DS 대비로 분석
- 차별화 포인트 명시

출력 형식 (JSON):
{
  "competitors": [
    {
      "name": "회사/서비스명",
      "description": "핵심 사업",
      "url": "https://...",
      "relevance": "high|medium|low",
      "strengths": ["강점1", "강점2"],
      "weaknesses": ["약점1"]
    }
  ],
  "marketPosition": "KT DS 포지셔닝 분석 (200자)"
}`;
```

---

## 3. Database Schema

### 3.1 마이그레이션 0038: collection_jobs

```sql
-- 0038_collection_jobs.sql
-- Sprint 57: F179 수집 채널 통합

CREATE TABLE IF NOT EXISTS collection_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  keywords TEXT,
  items_found INTEGER DEFAULT 0,
  items_new INTEGER DEFAULT 0,
  items_duplicate INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_by TEXT NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_collection_jobs_org ON collection_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_channel ON collection_jobs(channel);
CREATE INDEX IF NOT EXISTS idx_collection_jobs_status ON collection_jobs(status);
```

### 3.2 마이그레이션 0039: biz_item_trend_reports

```sql
-- 0039_biz_item_trend_reports.sql
-- Sprint 57: F190 시장/트렌드 데이터 자동 연동

CREATE TABLE IF NOT EXISTS biz_item_trend_reports (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL,
  market_summary TEXT,
  market_size_estimate TEXT,
  competitors TEXT,
  trends TEXT,
  keywords_used TEXT,
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  analyzed_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trend_reports_biz_item
  ON biz_item_trend_reports(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_trend_reports_expires
  ON biz_item_trend_reports(expires_at);
```

### 3.3 기존 스키마 변경

```typescript
// packages/api/src/schemas/biz-item.ts — 변경 사항

// bizItemStatus enum 확장
export const bizItemStatus = z.enum([
  "draft", "pending_review", "rejected",
  "classifying", "classified", "evaluating", "evaluated", "archived",
]);
```

---

## 4. API Route Design

### 4.1 Collection Routes (신규 — `packages/api/src/routes/collection.ts`)

```typescript
// POST /collection/agent-collect
// 요청: { keywords: string[], maxItems?: number, focusArea?: string }
// 응답 201: CollectionResult
// 에러: 502 LLM_EXECUTION_FAILED, 400 INVALID_KEYWORDS

// GET /collection/jobs
// 쿼리: ?channel=agent&limit=20
// 응답 200: { jobs: CollectionJob[] }

// GET /collection/stats
// 응답 200: CollectionStats

// GET /collection/screening-queue
// 응답 200: { items: ScreeningItem[] }

// POST /collection/screening-queue/:id/approve
// 응답 200: { id, status: "draft" }
// 에러: 404 ITEM_NOT_FOUND, 409 NOT_PENDING_REVIEW

// POST /collection/screening-queue/:id/reject
// 요청: { reason?: string }
// 응답 200: { id, status: "rejected" }
// 에러: 404 ITEM_NOT_FOUND, 409 NOT_PENDING_REVIEW

// POST /webhooks/idea-portal
// 헤더: X-Webhook-Signature (HMAC-SHA256)
// 요청: { title: string, description?: string, submittedBy?: string }
// 응답 201: { id, status: "pending_review" }
// 에러: 401 INVALID_SIGNATURE, 400 INVALID_PAYLOAD
```

### 4.2 Trend Routes (기존 biz-items 라우트 확장)

```typescript
// POST /biz-items/:id/trend-report
// 요청: { forceRefresh?: boolean }
// 응답 200: TrendReport (캐시 히트)
// 응답 201: TrendReport (신규 생성)
// 에러: 404 BIZ_ITEM_NOT_FOUND, 502 LLM_EXECUTION_FAILED

// GET /biz-items/:id/trend-report
// 응답 200: TrendReport
// 에러: 404 BIZ_ITEM_NOT_FOUND, 404 TREND_REPORT_NOT_FOUND

// POST /biz-items/:id/competitor-scan
// 응답 200: CompetitorScanResult
// 에러: 404 BIZ_ITEM_NOT_FOUND, 502 LLM_EXECUTION_FAILED
```

### 4.3 Zod 스키마 (신규 — `packages/api/src/schemas/collection.ts`)

```typescript
import { z } from "@hono/zod-openapi";

export const AgentCollectSchema = z.object({
  keywords: z.array(z.string().min(1).max(100)).min(1).max(10),
  maxItems: z.number().int().min(1).max(10).default(5),
  focusArea: z.string().max(200).optional(),
}).openapi("AgentCollectRequest");

export const IdeaPortalWebhookSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  submittedBy: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
}).openapi("IdeaPortalWebhook");

export const ScreeningRejectSchema = z.object({
  reason: z.string().max(500).optional(),
}).openapi("ScreeningReject");
```

```typescript
// packages/api/src/schemas/trend.ts
import { z } from "@hono/zod-openapi";

export const TrendReportRequestSchema = z.object({
  forceRefresh: z.boolean().default(false),
}).openapi("TrendReportRequest");

export const TrendReportSchema = z.object({
  id: z.string(),
  bizItemId: z.string(),
  marketSummary: z.string(),
  marketSizeEstimate: z.object({
    tam: z.string(),
    sam: z.string(),
    som: z.string(),
    currency: z.string(),
    year: z.number(),
    confidence: z.enum(["high", "medium", "low"]),
  }).nullable(),
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().optional(),
    relevance: z.enum(["high", "medium", "low"]),
  })),
  trends: z.array(z.object({
    title: z.string(),
    description: z.string(),
    impact: z.enum(["high", "medium", "low"]),
    timeframe: z.string(),
  })),
  keywordsUsed: z.array(z.string()),
  modelUsed: z.string(),
  tokensUsed: z.number(),
  analyzedAt: z.string(),
  expiresAt: z.string(),
}).openapi("TrendReport");

export const CompetitorScanResultSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    url: z.string().optional(),
    relevance: z.enum(["high", "medium", "low"]),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  })),
  marketPosition: z.string(),
  tokensUsed: z.number(),
  model: z.string(),
}).openapi("CompetitorScanResult");
```

---

## 5. App Registration

```typescript
// packages/api/src/app.ts — 추가 사항

import { collectionRoute } from "./routes/collection.js";

// API routes (tenantGuard 내부)
api.route("/", collectionRoute);   // /collection/* 엔드포인트
// bizItemsRoute는 기존 등록 유지 — trend 엔드포인트는 biz-items 라우트에 추가
```

---

## 6. UI Components

### 6.1 수집 대시보드 페이지

```
packages/web/src/app/(app)/discovery/collection/page.tsx
```

**레이아웃:**
```
┌──────────────────────────────────────────────────────┐
│  수집 채널 통합                            [Agent 수집] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 🤖 Agent │  │ 👤 Field │  │ 👥 IDEA  │           │
│  │   12건   │  │   34건   │  │   5건    │           │
│  │ +3 신규  │  │ 이번 주  │  │ 대기 2건 │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                      │
│  ─── Screening 큐 (pending_review) ──────────────    │
│  ┌──────────────────────────────────────────────┐   │
│  │ 제목              │ 소스    │ 등록일  │ 액션  │   │
│  │ AI 보험사정 자동화 │ agent  │ 03-24  │ ✓ ✗  │   │
│  │ 스마트팩토리 모니터 │ portal │ 03-24  │ ✓ ✗  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ─── 수집 이력 ──────────────────────────────────    │
│  ┌──────────────────────────────────────────────┐   │
│  │ 채널   │ 상태   │ 발견 │ 신규 │ 시작일       │   │
│  │ agent │ 완료   │  5  │  3  │ 03-24 10:30  │   │
│  │ agent │ 완료   │  3  │  2  │ 03-23 14:00  │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 6.2 컴포넌트 목록

| 파일 | 컴포넌트 | Props |
|------|---------|-------|
| `components/feature/ChannelOverview.tsx` | 3채널 카드 그리드 | `stats: CollectionStats` |
| `components/feature/ScreeningQueue.tsx` | 검토 큐 테이블 | `items: ScreeningItem[], onApprove, onReject` |
| `components/feature/CollectionHistory.tsx` | 수집 작업 이력 | `jobs: CollectionJob[]` |
| `components/feature/AgentCollectDialog.tsx` | Agent 수집 다이얼로그 | `onSubmit: (req) => void, isLoading` |
| `components/feature/TrendReportCard.tsx` | 트렌드 요약 카드 | `report: TrendReport` |
| `components/feature/CompetitorTable.tsx` | 경쟁사 테이블 | `competitors: Competitor[]` |
| `components/feature/TrendAnalyzeButton.tsx` | 분석 실행 버튼 | `bizItemId: string, onComplete` |

### 6.3 트렌드 UI (사업 아이템 상세 페이지)

기존 사업 아이템 상세 화면에 트렌드 탭/섹션 추가:

```
┌──────────────────────────────────────────────┐
│  📊 시장·트렌드 분석              [🔄 갱신]  │
├──────────────────────────────────────────────┤
│                                              │
│  시장 요약                                   │
│  "AI 기반 손해사정 시장은 보험 디지털 전환... │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐              │
│  │ TAM  │  │ SAM  │  │ SOM  │              │
│  │ 5조  │  │ 8천억│  │ 200억│              │
│  └──────┘  └──────┘  └──────┘              │
│  confidence: medium                         │
│                                              │
│  ─── 경쟁사 ─────────────────               │
│  │ 회사      │ 설명        │ 관련도│         │
│  │ Company A │ AI 손해사정 │ 🔴   │         │
│  │ Company B │ 보험 RPA    │ 🟡   │         │
│                                              │
│  ─── 핵심 트렌드 ─────────────              │
│  1. 보험업 GenAI 도입 가속 (🔴 high)       │
│  2. 디지털 손해사정 규제 완화 (🟡 medium)   │
└──────────────────────────────────────────────┘
```

---

## 7. File List

### 7.1 신규 파일 (17개)

| # | 파일 경로 | 설명 |
|---|----------|------|
| 1 | `packages/api/src/services/collection-pipeline.ts` | 수집 오케스트레이터 |
| 2 | `packages/api/src/services/agent-collector.ts` | LLM 기반 자동 수집 |
| 3 | `packages/api/src/services/agent-collector-prompts.ts` | 수집 프롬프트 |
| 4 | `packages/api/src/services/trend-data-service.ts` | 트렌드 분석 서비스 |
| 5 | `packages/api/src/services/trend-data-prompts.ts` | 트렌드 프롬프트 |
| 6 | `packages/api/src/services/competitor-scanner.ts` | 경쟁사 스캔 |
| 7 | `packages/api/src/services/competitor-scanner-prompts.ts` | 경쟁사 프롬프트 |
| 8 | `packages/api/src/routes/collection.ts` | 수집 라우트 (7 endpoints) |
| 9 | `packages/api/src/schemas/collection.ts` | 수집 Zod 스키마 |
| 10 | `packages/api/src/schemas/trend.ts` | 트렌드 Zod 스키마 |
| 11 | `packages/api/src/db/migrations/0038_collection_jobs.sql` | D1 마이그레이션 |
| 12 | `packages/api/src/db/migrations/0039_biz_item_trend_reports.sql` | D1 마이그레이션 |
| 13 | `packages/web/src/app/(app)/discovery/collection/page.tsx` | 수집 대시보드 페이지 |
| 14 | `packages/web/src/components/feature/ChannelOverview.tsx` | 채널 카드 |
| 15 | `packages/web/src/components/feature/ScreeningQueue.tsx` | 검토 큐 테이블 |
| 16 | `packages/web/src/components/feature/CollectionHistory.tsx` | 수집 이력 |
| 17 | `packages/web/src/components/feature/AgentCollectDialog.tsx` | 수집 실행 다이얼로그 |

### 7.2 수정 파일 (6개)

| # | 파일 경로 | 변경 내용 |
|---|----------|----------|
| 1 | `packages/api/src/app.ts` | collectionRoute import + 등록 |
| 2 | `packages/api/src/schemas/biz-item.ts` | bizItemStatus enum 확장 |
| 3 | `packages/api/src/routes/biz-items.ts` | trend-report, competitor-scan 엔드포인트 3개 추가 |
| 4 | `packages/api/src/services/biz-item-service.ts` | TrendReport CRUD 메서드 추가 |
| 5 | `packages/web/src/components/feature/TrendReportCard.tsx` | 트렌드 카드 (신규) |
| 6 | `packages/web/src/components/feature/CompetitorTable.tsx` | 경쟁사 테이블 (신규) |

> 참고: TrendReportCard, CompetitorTable, TrendAnalyzeButton은 신규 파일이지만,
> 기존 사업 아이템 상세 페이지에서 import하므로 수정 파일로도 분류 가능.

---

## 8. Implementation Order

```
Phase A: F179 수집 채널 통합
──────────────────────────────

A1. DB 마이그레이션 0038_collection_jobs.sql
A2. 스키마 확장: bizItemStatus + collection.ts
A3. CollectionPipelineService (정규화 + 중복 제거 + 큐)
A4. AgentCollector + agent-collector-prompts.ts
A5. collection 라우트 (7 endpoints)
A6. app.ts에 collectionRoute 등록
A7. Web: ChannelOverview + ScreeningQueue
A8. Web: CollectionHistory + AgentCollectDialog
A9. Web: collection/page.tsx (페이지 조립)
A10. 테스트: API (CollectionPipeline ~15, AgentCollector ~8,
     Webhook ~6, Screening ~8, Stats ~5 = ~42)
A11. 테스트: Web 컴포넌트 (~6)

Phase B: F190 트렌드 데이터 연동
──────────────────────────────

B1. DB 마이그레이션 0039_biz_item_trend_reports.sql
B2. trend.ts 스키마
B3. TrendDataService + trend-data-prompts.ts
B4. CompetitorScanner + competitor-scanner-prompts.ts
B5. biz-items 라우트 확장 (3 endpoints)
B6. BizItemService에 TrendReport CRUD 추가
B7. Web: TrendReportCard + CompetitorTable + TrendAnalyzeButton
B8. 테스트: API (TrendData ~8, Competitor ~5, Route ~8 = ~21)
B9. 테스트: Web 컴포넌트 (~6)
```

---

## 9. Test Design

### 9.1 API 테스트 (예상 63개)

| 테스트 파일 | 테스트 내용 | 예상 수 |
|-----------|------------|--------|
| `collection-pipeline.test.ts` | 정규화, 중복 검사, Job CRUD, 통계, Screening | ~15 |
| `agent-collector.test.ts` | LLM 호출 mock, JSON 파싱, 에러 핸들링 | ~8 |
| `collection-route.test.ts` | 7 endpoints × 정상 + 에러 케이스 | ~14 |
| `idea-portal-webhook.test.ts` | HMAC 검증, 페이로드 파싱, 중복 처리 | ~6 |
| `trend-data-service.test.ts` | LLM 요약, 캐시 TTL, 갱신 | ~8 |
| `competitor-scanner.test.ts` | LLM 경쟁사 스캔, JSON 파싱 | ~5 |
| `trend-route.test.ts` | 3 endpoints × 정상 + 에러 + 캐시 | ~7 |

### 9.2 Web 테스트 (예상 12개)

| 테스트 파일 | 테스트 내용 | 예상 수 |
|-----------|------------|--------|
| `ChannelOverview.test.tsx` | 3채널 카드 렌더링, 수치 표시 | ~2 |
| `ScreeningQueue.test.tsx` | 테이블 렌더링, approve/reject 콜백 | ~3 |
| `AgentCollectDialog.test.tsx` | 다이얼로그 열기, 키워드 입력, 제출 | ~2 |
| `TrendReportCard.test.tsx` | 시장 요약, TAM/SAM/SOM, 트렌드 목록 | ~2 |
| `CompetitorTable.test.tsx` | 경쟁사 테이블 렌더링, 관련도 배지 | ~2 |
| `CollectionHistory.test.tsx` | 이력 테이블 렌더링 | ~1 |

### 9.3 합계: **~75 tests**

---

## 10. Error Handling

| 에러 코드 | HTTP | 발생 조건 |
|----------|------|----------|
| `INVALID_KEYWORDS` | 400 | 키워드 배열이 비어있거나 10개 초과 |
| `ITEM_NOT_FOUND` | 404 | 존재하지 않는 biz_item ID |
| `NOT_PENDING_REVIEW` | 409 | 이미 승인/반려된 아이템 재처리 시도 |
| `INVALID_SIGNATURE` | 401 | IDEA Portal Webhook HMAC 검증 실패 |
| `INVALID_PAYLOAD` | 400 | Webhook 페이로드 Zod 검증 실패 |
| `LLM_EXECUTION_FAILED` | 502 | AgentRunner 실행 실패 |
| `LLM_PARSE_ERROR` | 502 | LLM 응답 JSON 파싱 실패 |
| `TREND_REPORT_NOT_FOUND` | 404 | 트렌드 분석 미수행 |
| `BIZ_ITEM_NOT_FOUND` | 404 | 존재하지 않는 사업 아이템 |
