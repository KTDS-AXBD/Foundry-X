---
code: FX-DSGN-S107
title: "Sprint 107 — F278 BD ROI 벤치마크 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-270]], [[FX-PLAN-S107]], [[FX-DSGN-S103]], [[FX-DSGN-S105]]"
---

# Sprint 107: F278 BD ROI 벤치마크 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F278: Track E BD ROI 벤치마크 — Cold Start vs Warm Run + BD_ROI 공식 + 신호등 달러 환산 |
| Sprint | 107 |
| 상위 Plan | [[FX-PLAN-S107]] |
| 핵심 | D1 0084 2테이블 + 서비스 3종 + API 8개 + Shared 타입 6종 + ~35 tests |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 반복 실행 시 비용 절감 정량 데이터 부재 + 사업성 신호등 달러 비교 불가 |
| Solution | Cold Start vs Warm Run 자동 분류 + BD_ROI 공식 + 신호등 달러 환산 |
| Function UX Effect | 스킬별/단계별 ROI 즉시 확인 + 비용 절감 예측값 제공 |
| Core Value | Skill Evolution의 경제적 가치를 숫자로 증명 |

## §1 데이터 모델

### 1.1 roi_benchmarks — Cold vs Warm 비교 스냅샷

```sql
CREATE TABLE IF NOT EXISTS roi_benchmarks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  cold_threshold INTEGER NOT NULL DEFAULT 3,
  cold_executions INTEGER NOT NULL DEFAULT 0,
  warm_executions INTEGER NOT NULL DEFAULT 0,
  cold_avg_cost_usd REAL NOT NULL DEFAULT 0,
  warm_avg_cost_usd REAL NOT NULL DEFAULT 0,
  cold_avg_duration_ms REAL NOT NULL DEFAULT 0,
  warm_avg_duration_ms REAL NOT NULL DEFAULT 0,
  cold_avg_tokens REAL NOT NULL DEFAULT 0,
  warm_avg_tokens REAL NOT NULL DEFAULT 0,
  cold_success_rate REAL NOT NULL DEFAULT 0
    CHECK(cold_success_rate >= 0 AND cold_success_rate <= 1),
  warm_success_rate REAL NOT NULL DEFAULT 0
    CHECK(warm_success_rate >= 0 AND warm_success_rate <= 1),
  cost_savings_pct REAL,
  duration_savings_pct REAL,
  token_savings_pct REAL,
  pipeline_stage TEXT
    CHECK(pipeline_stage IS NULL OR pipeline_stage IN (
      'collection', 'discovery', 'shaping', 'validation', 'productization', 'gtm'
    )),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rb_tenant_skill ON roi_benchmarks(tenant_id, skill_id, created_at);
CREATE INDEX idx_rb_tenant_stage ON roi_benchmarks(tenant_id, pipeline_stage);
CREATE INDEX idx_rb_created ON roi_benchmarks(created_at);
```

### 1.2 roi_signal_valuations — 신호등 달러 환산 설정

```sql
CREATE TABLE IF NOT EXISTS roi_signal_valuations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK(signal_type IN ('go', 'pivot', 'drop')),
  value_usd REAL NOT NULL DEFAULT 0 CHECK(value_usd >= 0),
  description TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, signal_type)
);

CREATE INDEX idx_rsv_tenant ON roi_signal_valuations(tenant_id);
```

### 1.3 마이그레이션 파일

`packages/api/src/db/migrations/0084_roi_benchmark.sql` — 위 2개 테이블 생성.

## §2 API 설계

### 2.1 엔드포인트 목록

| # | Method | Path | 설명 | Zod Schema |
|---|--------|------|------|------------|
| 1 | POST | `/api/roi/benchmark/run` | 벤치마크 실행 (전체 스킬 스냅샷 생성) | runBenchmarkSchema |
| 2 | GET | `/api/roi/benchmark/latest` | 최신 벤치마크 결과 목록 | latestBenchmarkQuerySchema |
| 3 | GET | `/api/roi/benchmark/history` | 벤치마크 이력 (스킬별 시계열) | benchmarkHistoryQuerySchema |
| 4 | GET | `/api/roi/benchmark/skill/:skillId` | 스킬별 Cold/Warm 상세 | — |
| 5 | GET | `/api/roi/benchmark/by-stage` | BD 단계별 집계 | byStageQuerySchema |
| 6 | GET | `/api/roi/summary` | BD_ROI 종합 (공식 계산 결과) | roiSummaryQuerySchema |
| 7 | GET | `/api/roi/signal-valuations` | 신호등 달러 환산 설정 조회 | — |
| 8 | PUT | `/api/roi/signal-valuations` | 신호등 달러 환산 설정 갱신 | updateSignalValuationsSchema |

### 2.2 Zod 스키마

```typescript
// schemas/roi-benchmark.ts

import { z } from "zod";

const pipelineStageEnum = z.enum([
  "collection", "discovery", "shaping", "validation", "productization", "gtm",
]);

export const runBenchmarkSchema = z.object({
  coldThreshold: z.number().int().min(1).max(20).optional().default(3),
  pipelineStage: pipelineStageEnum.optional(),
  skillId: z.string().optional(),              // 특정 스킬만 벤치마크
  minExecutions: z.number().int().min(2).optional().default(4),
    // cold + warm 최소 실행 수 (cold_threshold + 1 이상)
});
export type RunBenchmarkInput = z.infer<typeof runBenchmarkSchema>;

export const latestBenchmarkQuerySchema = z.object({
  pipelineStage: pipelineStageEnum.optional(),
  minSavings: z.coerce.number().min(-100).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});
export type LatestBenchmarkQuery = z.infer<typeof latestBenchmarkQuerySchema>;

export const benchmarkHistoryQuerySchema = z.object({
  skillId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type BenchmarkHistoryQuery = z.infer<typeof benchmarkHistoryQuerySchema>;

export const byStageQuerySchema = z.object({
  metric: z.enum(["cost", "duration", "tokens", "success_rate"]).optional().default("cost"),
});
export type ByStageQuery = z.infer<typeof byStageQuerySchema>;

export const roiSummaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  pipelineStage: pipelineStageEnum.optional(),
});
export type RoiSummaryQuery = z.infer<typeof roiSummaryQuerySchema>;

export const updateSignalValuationsSchema = z.object({
  valuations: z.array(z.object({
    signalType: z.enum(["go", "pivot", "drop"]),
    valueUsd: z.number().min(0).max(10_000_000),
    description: z.string().max(500).optional(),
  })).min(1).max(3),
});
export type UpdateSignalValuationsInput = z.infer<typeof updateSignalValuationsSchema>;
```

### 2.3 응답 포맷

#### POST /api/roi/benchmark/run

```json
{
  "benchmarks": [
    {
      "id": "rb_abc123",
      "skillId": "skill_market_analysis",
      "coldThreshold": 3,
      "coldExecutions": 3,
      "warmExecutions": 12,
      "coldAvgCostUsd": 0.045,
      "warmAvgCostUsd": 0.028,
      "costSavingsPct": 37.8,
      "durationSavingsPct": 22.1,
      "tokenSavingsPct": 31.5,
      "pipelineStage": "discovery"
    }
  ],
  "count": 15,
  "skipped": 3,
  "skippedReason": "insufficient executions (< minExecutions)"
}
```

#### GET /api/roi/summary

```json
{
  "period": { "days": 30, "from": "2026-03-04", "to": "2026-04-03" },
  "bdRoi": 245.3,
  "totalInvestment": 12.45,
  "totalSavings": 8.72,
  "signalValue": 100000,
  "breakdown": {
    "warmRunSavings": {
      "totalSaved": 8.72,
      "avgSavingsPerExecution": 0.017,
      "warmExecutionCount": 513
    },
    "signalBreakdown": {
      "go": { "count": 2, "valuePerUnit": 50000, "total": 100000 },
      "pivot": { "count": 3, "valuePerUnit": 10000, "total": 30000 },
      "drop": { "count": 1, "valuePerUnit": 0, "total": 0 }
    }
  },
  "topSkillsBySavings": [
    { "skillId": "skill_competitor_analysis", "savingsPct": 42.1 },
    { "skillId": "skill_market_sizing", "savingsPct": 38.5 }
  ]
}
```

## §3 서비스 설계

### 3.1 RoiBenchmarkService

```typescript
// services/roi-benchmark.ts

export class RoiBenchmarkService {
  constructor(private db: D1Database) {}

  /**
   * 벤치마크 실행 — skill_executions에서 Cold/Warm 분류 후 스냅샷 저장
   */
  async run(
    tenantId: string,
    params: RunBenchmarkInput,
  ): Promise<{ benchmarks: RoiBenchmark[]; count: number; skipped: number }>;

  /**
   * 최신 벤치마크 결과 조회 (스킬별 가장 최근 스냅샷)
   */
  async getLatest(
    tenantId: string,
    query: LatestBenchmarkQuery,
  ): Promise<{ benchmarks: RoiBenchmark[]; total: number }>;

  /**
   * 스킬별 벤치마크 이력 (시계열)
   */
  async getHistory(
    tenantId: string,
    query: BenchmarkHistoryQuery,
  ): Promise<{ benchmarks: RoiBenchmark[] }>;

  /**
   * 스킬 상세 — Cold/Warm 개별 실행 내역 포함
   */
  async getSkillDetail(
    tenantId: string,
    skillId: string,
  ): Promise<RoiBenchmarkDetail | null>;

  /**
   * BD 단계별 집계
   */
  async getByStage(
    tenantId: string,
    query: ByStageQuery,
  ): Promise<RoiByStage[]>;
}
```

**핵심 SQL: Cold/Warm 분류 쿼리**

```sql
-- ROW_NUMBER() 윈도우 함수로 스킬별 실행 순서 부여
WITH ordered_executions AS (
  SELECT
    skill_id,
    cost_usd,
    duration_ms,
    (input_tokens + output_tokens) AS total_tokens,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY skill_id ORDER BY executed_at ASC
    ) AS exec_order
  FROM skill_executions
  WHERE tenant_id = ?
),
cold_warm AS (
  SELECT
    skill_id,
    CASE WHEN exec_order <= ? THEN 'cold' ELSE 'warm' END AS phase,
    cost_usd,
    duration_ms,
    total_tokens,
    status
  FROM ordered_executions
)
SELECT
  skill_id,
  phase,
  COUNT(*) AS exec_count,
  AVG(cost_usd) AS avg_cost_usd,
  AVG(duration_ms) AS avg_duration_ms,
  AVG(total_tokens) AS avg_tokens,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS success_rate
FROM cold_warm
GROUP BY skill_id, phase
HAVING
  -- warm 그룹이 최소 1개 이상 있어야 함
  (phase = 'cold') OR (phase = 'warm' AND exec_count >= 1)
```

**pipeline_stage별 필터 추가 시:**
- `biz_item_id`를 `pipeline_stages` 테이블과 JOIN하여 stage 정보 획득
- 또는 `skill_executions.biz_item_id`에 직접 stage 값이 있으면 WHERE 절 추가

### 3.2 SignalValuationService

```typescript
// services/signal-valuation.ts

export class SignalValuationService {
  constructor(private db: D1Database) {}

  /**
   * 테넌트별 신호등 환산 설정 조회 (없으면 기본값 반환)
   */
  async getValuations(tenantId: string): Promise<SignalValuation[]>;

  /**
   * 신호등 환산 설정 갱신 (UPSERT)
   */
  async updateValuations(
    tenantId: string,
    input: UpdateSignalValuationsInput,
    updatedBy: string,
  ): Promise<SignalValuation[]>;

  /**
   * 포트폴리오 기대가치 산출 — bd-process-tracker의 trafficLight 데이터 연동
   */
  async calculatePortfolioValue(
    tenantId: string,
  ): Promise<{ go: number; pivot: number; drop: number; total: number }>;
}
```

**기본값 상수:**

```typescript
export const DEFAULT_SIGNAL_VALUATIONS = {
  go: 50_000,     // $50,000 — Go 판정 1건의 기대수익
  pivot: 10_000,  // $10,000 — Pivot은 부분 가치
  drop: 0,        // $0 — Drop은 가치 0
} as const;
```

**UPSERT 패턴 (D1 SQLite):**

```sql
INSERT INTO roi_signal_valuations (id, tenant_id, signal_type, value_usd, description, updated_by)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(tenant_id, signal_type)
DO UPDATE SET value_usd = excluded.value_usd,
              description = excluded.description,
              updated_by = excluded.updated_by,
              updated_at = datetime('now')
```

### 3.3 BdRoiCalculatorService

```typescript
// services/bd-roi-calculator.ts

export class BdRoiCalculatorService {
  constructor(
    private db: D1Database,
    private benchmarkSvc: RoiBenchmarkService,
    private signalSvc: SignalValuationService,
  ) {}

  /**
   * BD_ROI 종합 계산
   *
   * BD_ROI = (Total_Savings + Signal_Value) / Total_Investment × 100
   *
   * Total_Savings = Σ (cold_avg - warm_avg) × warm_executions [per skill]
   * Signal_Value  = Σ (signal_count × signal_value_usd) [per signal type]
   * Total_Investment = Σ cost_usd from skill_executions
   */
  async calculate(
    tenantId: string,
    query: RoiSummaryQuery,
  ): Promise<BdRoiSummary>;
}
```

**BD_ROI 계산 흐름:**

```
1. benchmarkSvc.getLatest() → 최신 Cold/Warm 비교 데이터
2. Total_Savings = Σ (cold_avg_cost_usd - warm_avg_cost_usd) × warm_executions
3. signalSvc.getValuations() → Go/Pivot/Drop 단가
4. signalSvc.calculatePortfolioValue() → Signal_Value (F262 연동)
5. Total_Investment = SUM(cost_usd) FROM skill_executions WHERE executed_at >= dateFrom
6. BD_ROI = (Total_Savings + Signal_Value) / Total_Investment × 100
7. Division by zero 방어: Total_Investment = 0이면 BD_ROI = 0 (투입 없음)
```

## §4 Shared 타입

```typescript
// shared/types/roi.ts

export interface RoiBenchmark {
  id: string;
  tenantId: string;
  skillId: string;
  coldThreshold: number;
  coldExecutions: number;
  warmExecutions: number;
  coldAvgCostUsd: number;
  warmAvgCostUsd: number;
  coldAvgDurationMs: number;
  warmAvgDurationMs: number;
  coldAvgTokens: number;
  warmAvgTokens: number;
  coldSuccessRate: number;
  warmSuccessRate: number;
  costSavingsPct: number | null;
  durationSavingsPct: number | null;
  tokenSavingsPct: number | null;
  pipelineStage: string | null;
  createdAt: string;
}

export interface RoiBenchmarkDetail extends RoiBenchmark {
  coldExecutionsList: SkillExecutionSummary[];
  warmExecutionsList: SkillExecutionSummary[];
}

export interface SkillExecutionSummary {
  id: string;
  costUsd: number;
  durationMs: number;
  totalTokens: number;
  status: string;
  executedAt: string;
}

export interface RoiByStage {
  pipelineStage: string;
  skillCount: number;
  avgCostSavingsPct: number;
  avgDurationSavingsPct: number;
  totalWarmSavingsUsd: number;
}

export interface SignalValuation {
  id: string;
  tenantId: string;
  signalType: "go" | "pivot" | "drop";
  valueUsd: number;
  description: string | null;
  updatedBy: string;
  updatedAt: string;
}

export interface BdRoiSummary {
  period: { days: number; from: string; to: string };
  bdRoi: number;
  totalInvestment: number;
  totalSavings: number;
  signalValue: number;
  breakdown: {
    warmRunSavings: {
      totalSaved: number;
      avgSavingsPerExecution: number;
      warmExecutionCount: number;
    };
    signalBreakdown: {
      go: { count: number; valuePerUnit: number; total: number };
      pivot: { count: number; valuePerUnit: number; total: number };
      drop: { count: number; valuePerUnit: number; total: number };
    };
  };
  topSkillsBySavings: Array<{ skillId: string; savingsPct: number }>;
}
```

## §5 라우트 설계

```typescript
// routes/roi-benchmark.ts

import { Hono } from "hono";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";
import { RoiBenchmarkService } from "../services/roi-benchmark.js";
import { SignalValuationService } from "../services/signal-valuation.js";
import { BdRoiCalculatorService } from "../services/bd-roi-calculator.js";
import {
  runBenchmarkSchema,
  latestBenchmarkQuerySchema,
  benchmarkHistoryQuerySchema,
  byStageQuerySchema,
  roiSummaryQuerySchema,
  updateSignalValuationsSchema,
} from "../schemas/roi-benchmark.js";

export const roiBenchmarkRoute = new Hono<{
  Bindings: Env;
  Variables: TenantVariables;
}>();

// POST /roi/benchmark/run — 벤치마크 실행
roiBenchmarkRoute.post("/roi/benchmark/run", async (c) => {
  const parsed = runBenchmarkSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const result = await svc.run(c.get("orgId"), parsed.data);
  return c.json(result, 201);
});

// GET /roi/benchmark/latest — 최신 결과
roiBenchmarkRoute.get("/roi/benchmark/latest", async (c) => {
  const parsed = latestBenchmarkQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const result = await svc.getLatest(c.get("orgId"), parsed.data);
  return c.json(result);
});

// GET /roi/benchmark/history — 스킬별 이력
roiBenchmarkRoute.get("/roi/benchmark/history", async (c) => {
  const parsed = benchmarkHistoryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const result = await svc.getHistory(c.get("orgId"), parsed.data);
  return c.json(result);
});

// GET /roi/benchmark/skill/:skillId — 스킬 상세
roiBenchmarkRoute.get("/roi/benchmark/skill/:skillId", async (c) => {
  const svc = new RoiBenchmarkService(c.env.DB);
  const detail = await svc.getSkillDetail(c.get("orgId"), c.req.param("skillId"));
  if (!detail) return c.json({ error: "Not found" }, 404);
  return c.json(detail);
});

// GET /roi/benchmark/by-stage — BD 단계별 집계
roiBenchmarkRoute.get("/roi/benchmark/by-stage", async (c) => {
  const parsed = byStageQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const svc = new RoiBenchmarkService(c.env.DB);
  const stages = await svc.getByStage(c.get("orgId"), parsed.data);
  return c.json({ stages });
});

// GET /roi/summary — BD_ROI 종합
roiBenchmarkRoute.get("/roi/summary", async (c) => {
  const parsed = roiSummaryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: "Invalid query", details: parsed.error.flatten() }, 400);

  const benchSvc = new RoiBenchmarkService(c.env.DB);
  const signalSvc = new SignalValuationService(c.env.DB);
  const calcSvc = new BdRoiCalculatorService(c.env.DB, benchSvc, signalSvc);
  const summary = await calcSvc.calculate(c.get("orgId"), parsed.data);
  return c.json(summary);
});

// GET /roi/signal-valuations — 신호등 설정 조회
roiBenchmarkRoute.get("/roi/signal-valuations", async (c) => {
  const svc = new SignalValuationService(c.env.DB);
  const valuations = await svc.getValuations(c.get("orgId"));
  return c.json({ valuations });
});

// PUT /roi/signal-valuations — 신호등 설정 갱신
roiBenchmarkRoute.put("/roi/signal-valuations", async (c) => {
  const parsed = updateSignalValuationsSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);

  const svc = new SignalValuationService(c.env.DB);
  const valuations = await svc.updateValuations(c.get("orgId"), parsed.data, c.get("userId"));
  return c.json({ valuations });
});
```

## §6 구현 순서

| 순서 | 파일 | 설명 |
|------|------|------|
| 1 | `packages/api/src/db/migrations/0084_roi_benchmark.sql` | D1 마이그레이션 — 2테이블 |
| 2 | `packages/shared/src/types/roi.ts` | Shared 타입 6종 |
| 3 | `packages/shared/src/index.ts` | export 추가 |
| 4 | `packages/api/src/schemas/roi-benchmark.ts` | Zod 스키마 6종 |
| 5 | `packages/api/src/services/roi-benchmark.ts` | RoiBenchmarkService |
| 6 | `packages/api/src/services/signal-valuation.ts` | SignalValuationService |
| 7 | `packages/api/src/services/bd-roi-calculator.ts` | BdRoiCalculatorService |
| 8 | `packages/api/src/routes/roi-benchmark.ts` | 라우트 8개 |
| 9 | `packages/api/src/index.ts` | 라우트 등록 |
| 10 | `packages/api/src/__tests__/roi-benchmark-service.test.ts` | RoiBenchmark 서비스 테스트 |
| 11 | `packages/api/src/__tests__/signal-valuation-service.test.ts` | SignalValuation 서비스 테스트 |
| 12 | `packages/api/src/__tests__/bd-roi-calculator-service.test.ts` | BdRoiCalculator 서비스 테스트 |
| 13 | `packages/api/src/__tests__/roi-benchmark-routes.test.ts` | 라우트 통합 테스트 |

## §7 테스트 설계

### 7.1 RoiBenchmarkService 테스트 (~12개)

```
describe("RoiBenchmarkService")
  describe("run")
    ✓ 정상 벤치마크 실행 — Cold 3 + Warm 5 실행 시 savings_pct 정확 계산
    ✓ cold_threshold 커스텀 (N=5)
    ✓ 실행 부족 (< minExecutions) 시 skip
    ✓ Warm이 더 비싼 경우 — 음수 savings_pct
    ✓ pipeline_stage 필터 적용
    ✓ 특정 skillId만 벤치마크
  describe("getLatest")
    ✓ 스킬별 최신 스냅샷 1건씩 반환
    ✓ pagination (limit/offset)
    ✓ minSavings 필터
  describe("getSkillDetail")
    ✓ Cold/Warm 개별 실행 내역 포함
    ✓ 존재하지 않는 skillId → null
  describe("getByStage")
    ✓ BD 단계별 평균 절감률 집계
```

### 7.2 SignalValuationService 테스트 (~8개)

```
describe("SignalValuationService")
  describe("getValuations")
    ✓ 설정 없으면 기본값 (go:50000, pivot:10000, drop:0) 반환
    ✓ 커스텀 설정 반환
  describe("updateValuations")
    ✓ 새 설정 삽입 (INSERT)
    ✓ 기존 설정 갱신 (UPSERT)
    ✓ 부분 업데이트 (go만 변경)
  describe("calculatePortfolioValue")
    ✓ bd-process-tracker 연동 — Go 2건 × $50K = $100K
    ✓ 모든 신호 0건 → total 0
    ✓ 커스텀 단가 적용
```

### 7.3 BdRoiCalculatorService 테스트 (~8개)

```
describe("BdRoiCalculatorService")
  describe("calculate")
    ✓ 정상 BD_ROI 계산 — savings + signal 포함
    ✓ Total_Investment = 0 → BD_ROI = 0 (division by zero 방어)
    ✓ 신호등 데이터 없음 → signalValue = 0
    ✓ 벤치마크 데이터 없음 → savings = 0
    ✓ days 필터 (30일, 90일)
    ✓ pipeline_stage 필터
    ✓ topSkillsBySavings 상위 5개 정렬
    ✓ 음수 savings 포함 시 BD_ROI 정확 계산
```

### 7.4 라우트 테스트 (~10개)

```
describe("roi-benchmark routes")
  describe("POST /roi/benchmark/run")
    ✓ 201 + 벤치마크 결과
    ✓ 400 invalid input
  describe("GET /roi/benchmark/latest")
    ✓ 200 + 최신 결과
  describe("GET /roi/benchmark/history")
    ✓ 200 + 스킬별 이력
    ✓ 400 skillId 누락
  describe("GET /roi/benchmark/skill/:skillId")
    ✓ 200 상세
    ✓ 404 not found
  describe("GET /roi/benchmark/by-stage")
    ✓ 200 단계별 집계
  describe("GET /roi/summary")
    ✓ 200 BD_ROI 종합
  describe("PUT /roi/signal-valuations")
    ✓ 200 설정 갱신
```

**예상 테스트 합계: ~38개**

## §8 연동 포인트

| 기존 모듈 | 연동 방식 | 설명 |
|-----------|-----------|------|
| `skill_executions` (F274) | READ | Cold/Warm 분류 데이터 소스 |
| `bd-process-tracker` (F262) | READ | trafficLight Go/Pivot/Drop 카운트 |
| `roi_signal_valuations` | READ/WRITE | 신호등 달러 환산 설정 |
| `pipeline_stages` (기존) | JOIN | 실행 이력의 BD 단계 매핑 |

기존 테이블/서비스는 **읽기만** — 수정 없이 집계/분석 전용.

## §9 에러 처리

| 상황 | 처리 |
|------|------|
| skill_executions 데이터 없음 | 빈 배열 반환 + `skipped` 카운트 |
| Cold/Warm 분류 불가 (실행 수 부족) | skip + 로그 |
| Division by zero (Total_Investment=0) | BD_ROI = 0 반환 |
| 신호등 설정 미존재 | DEFAULT_SIGNAL_VALUATIONS 사용 |
| Zod 검증 실패 | 400 + error details |
