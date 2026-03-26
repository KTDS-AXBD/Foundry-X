---
code: FX-DSGN-065
title: "Sprint 65 Design — F201 BMC 블록 인사이트 + F202 시장 키워드 요약 + F207 평가관리 MVP"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 65
features: [F201, F202, F207]
req: [FX-REQ-AX-005, FX-REQ-AX-006, FX-REQ-199]
plan: "[[FX-PLAN-065]]"
---

## Executive Summary

| 관점 | 결과 |
|------|------|
| **Match Rate 목표** | 92% |
| **신규 파일** | 18 (services 4, routes 2, schemas 3, migrations 4, tests 2, shared types 3) |
| **수정 파일** | 3 (app.ts, execution-types.ts, shared/ax-bd.ts) |
| **D1 테이블** | 4 (ax_insight_jobs, ax_evaluations, ax_kpis, ax_evaluation_history) |

---

## 1. 아키텍처 개요

```
[BMC 에디터 UI]               [시장 요약 UI]              [평가관리 UI]
  블록 편집 (20자+, 5s)         키워드 입력                 KPI 입력/Go-Kill
       │                          │                          │
       ▼                          ▼                          ▼
  POST .../blocks/:type/insights  POST .../market-summary   CRUD /evaluations
       │                          │                          │
       ▼                          ▼                          ▼
  BmcInsightService           InsightAgentService         EvaluationService
       │                          │                      + KpiService
       ├─ PromptGateway           ├─ PromptGateway           │
       ├─ Anthropic API           ├─ Anthropic API           ├─ D1 ax_evaluations
       └─ 인사이트 3개 응답        └─ D1 ax_insight_jobs      ├─ D1 ax_kpis
                                                             └─ D1 ax_evaluation_history
```

---

## 2. F201 — BMC 블록 인사이트 상세 설계

### 2.1 BmcInsightService

```typescript
// packages/api/src/services/bmc-insight-service.ts

export interface BlockInsight {
  title: string;
  description: string;
  suggestedContent: string;
}

export interface InsightResult {
  insights: BlockInsight[];
  processingTimeMs: number;
  model: string;
  masked: boolean;
}

const INSIGHT_SYSTEM_PROMPT = `You are a Business Model Canvas (BMC) expert.
Given a BMC block type and its current content, suggest exactly 3 improvements.

Return ONLY a valid JSON array with 3 objects, each having:
- "title": short improvement title (max 50 chars)
- "description": why this improvement matters (max 150 chars)
- "suggestedContent": improved content for the block (max 200 chars)

Write in the same language as the input. Return ONLY the JSON array.`;

export class BmcInsightService {
  constructor(private db: D1Database, private anthropicApiKey: string) {}

  async generateInsights(
    blockType: string, currentContent: string, bmcContext?: Record<string, string>,
    tenantId?: string
  ): Promise<InsightResult> {
    // 1. Validate blockType
    // 2. PromptGateway sanitize
    // 3. Build user prompt with block type + content + optional other blocks context
    // 4. Call Anthropic API (15s timeout)
    // 5. Parse JSON array of 3 insights
    // 6. Return InsightResult
  }
}
```

### 2.2 Route: ax-bd-insights.ts

```typescript
// packages/api/src/routes/ax-bd-insights.ts

// POST /ax-bd/bmcs/:bmcId/blocks/:blockType/insights → generateInsights
//   - Rate Limit: KV 기반 분당 5회 (key: bmc-insight:{userId})
//   - Body: { currentContent: string, bmcContext?: Record<string, string> }
//   - Response: InsightResult

// POST /ax-bd/insights/market-summary → createMarketSummaryJob (F202)
//   - Rate Limit: KV 기반 분당 3회 (key: market-insight:{userId})
//   - Body: { keywords: string[] }
//   - Response: { jobId: string, status: "pending" }

// GET /ax-bd/insights/jobs/:jobId → getJobStatus (F202)
//   - Response: InsightJob (status, result if completed)
```

### 2.3 Schema: bmc-insight.schema.ts

```typescript
import { z } from "@hono/zod-openapi";

export const GenerateInsightSchema = z.object({
  currentContent: z.string().min(20).max(2000),
  bmcContext: z.record(z.string(), z.string()).optional(),
}).openapi("GenerateInsight");

export const BlockInsightSchema = z.object({
  title: z.string(),
  description: z.string(),
  suggestedContent: z.string(),
}).openapi("BlockInsight");

export const InsightResultSchema = z.object({
  insights: z.array(BlockInsightSchema),
  processingTimeMs: z.number(),
  model: z.string(),
  masked: z.boolean(),
}).openapi("InsightResult");
```

---

## 3. F202 — 시장 키워드 요약 (InsightAgent) 상세 설계

### 3.1 InsightAgentService

```typescript
// packages/api/src/services/insight-agent-service.ts

export interface InsightJob {
  id: string;
  orgId: string;
  userId: string;
  keywords: string[];
  status: "pending" | "processing" | "completed" | "failed";
  result: MarketSummary | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface MarketSummary {
  summary: string;
  trends: Array<{ keyword: string; trend: string; relevance: string }>;
  opportunities: string[];
  risks: string[];
  generatedAt: number;
}

const MARKET_SUMMARY_PROMPT = `You are a market analyst. Given keywords, provide:
1. A brief market summary (max 300 chars)
2. Trend analysis per keyword (keyword, trend description, relevance: high/medium/low)
3. Key opportunities (max 3)
4. Key risks (max 3)

Return ONLY valid JSON with keys: summary, trends (array), opportunities (array), risks (array).
Write in the same language as the input.`;

export class InsightAgentService {
  constructor(private db: D1Database, private anthropicApiKey: string) {}

  /** Job 생성 (즉시 반환) */
  async createJob(orgId: string, userId: string, keywords: string[]): Promise<InsightJob>

  /** Job 실행 (내부) — createJob 내에서 비동기 호출 */
  private async executeJob(jobId: string): Promise<void> {
    // 1. status → processing
    // 2. PromptGateway sanitize
    // 3. Anthropic API 호출
    // 4. 결과 파싱 → D1 UPDATE (status=completed, result=JSON)
    // 5. 실패 시 status=failed, error 기록
  }

  /** Job 상태 조회 */
  async getJob(jobId: string, orgId: string): Promise<InsightJob | null>
}
```

**비동기 구현 전략**:
- Workers 환경에서 `ctx.waitUntil()`을 사용하여 응답 반환 후 Job 실행
- 클라이언트는 polling으로 상태 확인 (GET /jobs/:jobId)
- SSE는 Phase 2로 미룸 (복잡도 절감)

### 3.2 Schema: insight-job.schema.ts

```typescript
import { z } from "@hono/zod-openapi";

export const CreateMarketSummarySchema = z.object({
  keywords: z.array(z.string().min(1).max(100)).min(1).max(10),
}).openapi("CreateMarketSummary");

export const InsightJobSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  result: z.any().nullable(),
  error: z.string().nullable(),
  createdAt: z.number(),
  completedAt: z.number().nullable(),
}).openapi("InsightJob");
```

---

## 4. F207 — 평가관리 프레임워크 MVP 상세 설계

### 4.1 EvaluationService

```typescript
// packages/api/src/services/evaluation-service.ts

export type EvalStatus = "draft" | "active" | "go" | "kill" | "hold";

const VALID_TRANSITIONS: Record<EvalStatus, EvalStatus[]> = {
  draft: ["active"],
  active: ["go", "kill", "hold"],
  go: ["active", "kill"],       // 재검토 가능
  kill: ["active"],              // 부활 가능
  hold: ["active", "kill"],      // 보류 해제/폐기
};

export class EvaluationService {
  constructor(private db: D1Database) {}

  async create(orgId: string, ownerId: string, data: CreateEvalInput): Promise<Evaluation>
  async list(orgId: string, filters?: EvalFilters): Promise<{ items: Evaluation[]; total: number }>
  async getById(evalId: string, orgId: string): Promise<Evaluation | null>

  async updateStatus(
    evalId: string, orgId: string, actorId: string,
    newStatus: EvalStatus, reason?: string
  ): Promise<Evaluation> {
    // 1. 현재 상태 조회
    // 2. VALID_TRANSITIONS 검증
    // 3. UPDATE ax_evaluations
    // 4. INSERT ax_evaluation_history (from→to, reason, actor)
    // 5. Return updated
  }

  async getHistory(evalId: string, orgId: string): Promise<EvalHistoryEntry[]>

  async getPortfolio(orgId: string): Promise<PortfolioSummary> {
    // 상태별 카운트 + 최근 변경 목록
  }
}
```

### 4.2 KpiService

```typescript
// packages/api/src/services/kpi-service.ts

export type KpiCategory = "market" | "tech" | "revenue" | "risk" | "custom";

export class KpiService {
  constructor(private db: D1Database) {}

  async create(evalId: string, data: CreateKpiInput): Promise<Kpi>
  async listByEval(evalId: string): Promise<Kpi[]>
  async update(kpiId: string, evalId: string, data: UpdateKpiInput): Promise<Kpi>

  /** 달성률 계산 */
  calculateAchievement(target: number, actual: number | null): number | null {
    if (actual === null) return null;
    if (target === 0) return actual === 0 ? 100 : 0;
    return Math.round((actual / target) * 100);
  }
}
```

### 4.3 Route: ax-bd-evaluations.ts

```typescript
// packages/api/src/routes/ax-bd-evaluations.ts

// POST   /ax-bd/evaluations                         → create
// GET    /ax-bd/evaluations                         → list (?status=, ?limit=, ?offset=)
// GET    /ax-bd/evaluations/portfolio                → getPortfolio
// GET    /ax-bd/evaluations/:evalId                  → getById
// PATCH  /ax-bd/evaluations/:evalId                  → updateStatus { status, reason }
// POST   /ax-bd/evaluations/:evalId/kpis            → createKpi
// GET    /ax-bd/evaluations/:evalId/kpis            → listKpis
// PATCH  /ax-bd/evaluations/:evalId/kpis/:kpiId     → updateKpi
// GET    /ax-bd/evaluations/:evalId/history          → getHistory
```

### 4.4 Schemas: evaluation.schema.ts

```typescript
import { z } from "@hono/zod-openapi";

export const CreateEvaluationSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  ideaId: z.string().optional(),
  bmcId: z.string().optional(),
}).openapi("CreateEvaluation");

export const UpdateEvalStatusSchema = z.object({
  status: z.enum(["draft", "active", "go", "kill", "hold"]),
  reason: z.string().max(500).optional(),
}).openapi("UpdateEvalStatus");

export const CreateKpiSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(["market", "tech", "revenue", "risk", "custom"]),
  target: z.number().min(0),
  unit: z.string().max(20).default("%"),
}).openapi("CreateKpi");

export const UpdateKpiSchema = z.object({
  actual: z.number().nullable().optional(),
  target: z.number().min(0).optional(),
}).openapi("UpdateKpi");
```

---

## 5. 공유 타입 확장

```typescript
// packages/shared/src/ax-bd.ts (추가)

// Sprint 65: F201 BMC 블록 인사이트
export interface BlockInsight {
  title: string;
  description: string;
  suggestedContent: string;
}

// Sprint 65: F202 시장 키워드 요약
export interface InsightJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  keywords: string[];
  result: MarketSummary | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
}

export interface MarketSummary {
  summary: string;
  trends: Array<{ keyword: string; trend: string; relevance: string }>;
  opportunities: string[];
  risks: string[];
  generatedAt: number;
}

// Sprint 65: F207 평가관리
export type EvalStatus = "draft" | "active" | "go" | "kill" | "hold";
export type KpiCategory = "market" | "tech" | "revenue" | "risk" | "custom";

export interface Evaluation {
  id: string;
  orgId: string;
  ideaId: string | null;
  bmcId: string | null;
  title: string;
  description: string | null;
  ownerId: string;
  status: EvalStatus;
  decisionReason: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Kpi {
  id: string;
  evalId: string;
  name: string;
  category: KpiCategory;
  target: number;
  actual: number | null;
  unit: string;
  achievement: number | null;  // 계산 필드
  updatedAt: number;
}

export interface EvalHistoryEntry {
  id: string;
  evalId: string;
  actorId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  createdAt: number;
}

export interface PortfolioSummary {
  total: number;
  byStatus: Record<EvalStatus, number>;
  recentChanges: EvalHistoryEntry[];
}
```

---

## 6. D1 마이그레이션 (0051~0054)

Plan 문서 §2와 동일. 4개 테이블:
- `ax_insight_jobs` (0051) — F202 비동기 Job
- `ax_evaluations` (0052) — F207 평가 항목
- `ax_kpis` (0053) — F207 KPI
- `ax_evaluation_history` (0054) — F207 이력

---

## 7. 수정 대상 기존 파일

### 7.1 execution-types.ts

```typescript
// AgentTaskType에 추가:
| "bmc-insight"      // F201
| "market-summary"   // F202
```

### 7.2 model-router.ts DEFAULT_MODEL_MAP

```typescript
"bmc-insight": "anthropic/claude-sonnet-4-6",    // F201
"market-summary": "anthropic/claude-sonnet-4-6",  // F202
```

### 7.3 app.ts

```typescript
import { axBdInsightsRoute } from "./routes/ax-bd-insights.js";
import { axBdEvaluationsRoute } from "./routes/ax-bd-evaluations.js";
// ...
app.route("/api", axBdInsightsRoute);
app.route("/api", axBdEvaluationsRoute);
```

---

## 8. Worker 파일 매핑 (충돌 방지)

### W1: F201+F202 인사이트
**수정 허용 파일:**
- `packages/api/src/services/bmc-insight-service.ts` (NEW)
- `packages/api/src/services/insight-agent-service.ts` (NEW)
- `packages/api/src/routes/ax-bd-insights.ts` (NEW)
- `packages/api/src/schemas/bmc-insight.schema.ts` (NEW)
- `packages/api/src/schemas/insight-job.schema.ts` (NEW)
- `packages/api/src/db/migrations/0051_ax_insight_jobs.sql` (NEW)
- `packages/api/src/__tests__/ax-bd-insights.test.ts` (NEW)

### W2: F207 평가관리
**수정 허용 파일:**
- `packages/api/src/services/evaluation-service.ts` (NEW — F207 전용, 기존 evaluation-criteria.ts와 별개)
- `packages/api/src/services/kpi-service.ts` (NEW)
- `packages/api/src/routes/ax-bd-evaluations.ts` (NEW)
- `packages/api/src/schemas/evaluation.schema.ts` (NEW)
- `packages/api/src/db/migrations/0052_ax_evaluations.sql` (NEW)
- `packages/api/src/db/migrations/0053_ax_kpis.sql` (NEW)
- `packages/api/src/db/migrations/0054_ax_evaluation_history.sql` (NEW)
- `packages/api/src/__tests__/ax-bd-evaluations.test.ts` (NEW)

### 리더 처리 (merge 후):
- `packages/api/src/app.ts` — 라우트 등록 2줄 추가
- `packages/api/src/services/execution-types.ts` — AgentTaskType 2개 추가
- `packages/api/src/services/model-router.ts` — DEFAULT_MODEL_MAP 2개 추가
- `packages/shared/src/ax-bd.ts` — 타입 추가

---

## 9. 테스트 설계

### F201+F202 테스트 (~20건)
| # | 테스트 | 유형 |
|---|--------|------|
| 1 | 블록 인사이트 생성 (happy path) | Happy |
| 2 | 유효하지 않은 blockType → 400 | Validation |
| 3 | 20자 미만 content → 400 | Validation |
| 4 | Rate Limit 초과 → 429 | RateLimit |
| 5 | ANTHROPIC_API_KEY 미설정 → 500 | Config |
| 6 | LLM 타임아웃 → 504 | Error |
| 7 | LLM 파싱 에러 → 502 | Error |
| 8 | 시장 요약 Job 생성 | Happy |
| 9 | Job 상태 조회 (pending) | Happy |
| 10 | Job 상태 조회 (completed) | Happy |
| 11 | Job 상태 조회 (failed) | Happy |
| 12 | 미존재 Job → 404 | Error |
| 13 | 타 테넌트 Job 접근 → 404 | Auth |
| 14 | 시장 요약 Rate Limit → 429 | RateLimit |
| 15 | 키워드 빈 배열 → 400 | Validation |
| 16 | 키워드 10개 초과 → 400 | Validation |

### F207 테스트 (~25건)
| # | 테스트 | 유형 |
|---|--------|------|
| 1 | 평가 생성 | Happy |
| 2 | 평가 목록 조회 | Happy |
| 3 | 평가 상세 조회 | Happy |
| 4 | 상태 전이: draft → active | Happy |
| 5 | 상태 전이: active → go | Happy |
| 6 | 상태 전이: active → kill | Happy |
| 7 | 상태 전이: active → hold | Happy |
| 8 | 잘못된 전이: draft → go → 400 | Validation |
| 9 | 잘못된 전이: draft → kill → 400 | Validation |
| 10 | 이력 자동 기록 확인 | Happy |
| 11 | 이력 조회 | Happy |
| 12 | KPI 생성 | Happy |
| 13 | KPI 목록 조회 | Happy |
| 14 | KPI 실적 갱신 | Happy |
| 15 | KPI 달성률 계산 (100%) | Unit |
| 16 | KPI 달성률 계산 (50%) | Unit |
| 17 | KPI 달성률 target=0 | Edge |
| 18 | KPI actual=null → achievement=null | Edge |
| 19 | 포트폴리오 현황판 | Happy |
| 20 | 미존재 평가 → 404 | Error |
| 21 | 타 테넌트 접근 → 404 | Auth |
| 22 | 상태 필터 조회 | Happy |
| 23 | 페이지네이션 | Happy |
| 24 | idea/bmc 연결 조회 | Happy |
