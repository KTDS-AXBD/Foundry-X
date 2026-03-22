---
code: FX-DSGN-042
title: "Sprint 42 — 자동화 품질 리포터 + 에이전트 마켓플레이스 상세 설계 (F151+F152)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-42
sprint: 42
phase: "Phase 5a"
references:
  - "[[FX-PLAN-042]]"
  - "[[FX-DSGN-041]]"
---

## 1. 설계 개요

### 1.1 목적

기존 Agent Evolution 인프라(7종 역할 에이전트 + ModelRouter + EvaluatorOptimizer + FallbackChain + SelfReflection + CustomRole + EnsembleVoting) 위에 **운영/생태계 2종** 레이어를 추가:
- **AutomationQualityReporter** (F151) — 기존 5개 데이터 소스(agent_executions, model_execution_metrics, agent_feedback, kpi_events, fallback_events)를 집계하여 품질 리포트 + 실패 패턴 + 개선 제안 자동 생성
- **AgentMarketplace** (F152) — CustomRole(F146) 기반 에이전트 역할 게시/검색/설치/평점 내부 마켓플레이스

### 1.2 설계 원칙

| 원칙 | 적용 |
|------|------|
| **읽기 전용 집계** | F151은 기존 테이블을 SELECT만 — 새 데이터 수집 로직 추가 없음 |
| **Lazy 스냅샷 캐시** | 일일 스냅샷을 API 호출 시 lazy 생성 — Cron 추가 불필요 |
| **규칙 기반 제안** | LLM 호출 없이 6종 조건 규칙으로 개선 제안 생성 |
| **CustomRole 복제 설치** | 마켓플레이스 설치 = CustomRole 복제 — 원본-설치 독립 |
| **라우트 파일 분리** | F151은 별도 라우트(`routes/automation-quality.ts`), F152는 `routes/agent.ts` append |

---

## 2. 아키텍처

### 2.1 전체 레이어 구조

```
┌─────────────────────────────────────────────────────┐
│ API Layer                                            │
│  routes/automation-quality.ts  (F151, 3 endpoints)  │
│  routes/agent.ts              (F152, 6 endpoints)   │
├─────────────────────────────────────────────────────┤
│ Service Layer                                        │
│  AutomationQualityReporter    (F151)                │
│  AgentMarketplace             (F152)                │
├─────────────────────────────────────────────────────┤
│ 기존 서비스 의존                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│  │ModelMetrics   │ │FeedbackLoop  │ │KpiLogger     ││
│  │(F143)         │ │(F150)        │ │(F100)        ││
│  └──────────────┘ └──────────────┘ └──────────────┘│
│  ┌──────────────┐ ┌──────────────┐                  │
│  │FallbackChain │ │CustomRole    │                  │
│  │(F144)         │ │Manager(F146) │                  │
│  └──────────────┘ └──────────────┘                  │
├─────────────────────────────────────────────────────┤
│ D1 (Data Layer)                                      │
│  기존: agent_executions, model_execution_metrics,    │
│        agent_feedback, kpi_events, fallback_events,  │
│        custom_agent_roles                            │
│  신규: automation_quality_snapshots (0025),           │
│        agent_marketplace_items/ratings/installs(0026)│
└─────────────────────────────────────────────────────┘
```

---

## 3. F151 상세 설계: AutomationQualityReporter

### 3.1 타입 정의

```typescript
// ── 품질 메트릭 ──────────────────────────────────

export interface QualityMetrics {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  partialCount: number;
  successRate: number;           // 0~100
  avgDurationMs: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  fallbackCount: number;
  fallbackRate: number;          // 0~100
  feedbackPending: number;
  feedbackApplied: number;
  feedbackProcessingRate: number; // applied / (pending+reviewed+applied) * 100
}

export interface TaskTypeBreakdown {
  taskType: string;
  executions: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
}

export interface ModelBreakdown {
  model: string;
  executions: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  tokenEfficiency: number;
}

// ── 품질 리포트 ──────────────────────────────────

export interface QualityReport {
  period: { from: string; to: string; days: number };
  overall: QualityMetrics;
  byTaskType: TaskTypeBreakdown[];
  byModel: ModelBreakdown[];
  dailyTrends: DailyTrend[];
}

export interface DailyTrend {
  date: string;
  executions: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
}

// ── 실패 패턴 ────────────────────────────────────

export interface FailurePattern {
  taskType: string;
  model: string;
  failureCount: number;
  topReasons: string[];          // 빈발 순 상위 3개
  pendingFeedback: number;       // 미처리 피드백 수
}

// ── 개선 제안 ────────────────────────────────────

export type SuggestionSeverity = "info" | "warning" | "critical";
export type SuggestionType =
  | "model-unstable"
  | "fallback-frequent"
  | "cost-anomaly"
  | "feedback-backlog"
  | "retry-excessive"
  | "task-low-quality";

export interface Suggestion {
  type: SuggestionType;
  severity: SuggestionSeverity;
  message: string;
  data: Record<string, unknown>;  // 조건 충족 데이터 (threshold, actual 등)
}

// ── 스냅샷 캐시 ──────────────────────────────────

export interface QualitySnapshotRow {
  id: string;
  snapshot_date: string;
  task_type: string | null;
  total_executions: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  avg_duration_ms: number;
  total_cost_usd: number;
  avg_cost_per_execution: number;
  feedback_pending: number;
  feedback_applied: number;
  fallback_count: number;
  top_failure_reason: string | null;
  created_at: string;
}
```

### 3.2 서비스 메서드

```typescript
export class AutomationQualityReporter {
  constructor(private db: D1Database) {}

  /**
   * 종합 품질 리포트 생성
   * - 캐시 확인 → miss 시 5개 테이블 집계 → 스냅샷 저장
   * @param days 조회 기간 (기본 7일)
   * @param taskType 필터 (선택)
   */
  async generateReport(days?: number, taskType?: string): Promise<QualityReport>

  /**
   * 실패 패턴 분류
   * - agent_executions + agent_feedback JOIN → taskType×model별 그룹화
   * @param days 조회 기간 (기본 30일)
   */
  async getFailurePatterns(days?: number): Promise<FailurePattern[]>

  /**
   * 데이터 기반 개선 제안
   * - 6종 규칙 평가 → 조건 충족 시 제안 생성
   * @param days 조회 기간 (기본 30일)
   */
  async getImprovementSuggestions(days?: number): Promise<Suggestion[]>

  // ── 내부 메서드 ──

  /** 일일 스냅샷 캐시 조회/생성 (lazy) */
  private async getOrCreateSnapshot(date: string, taskType: string | null): Promise<QualitySnapshotRow>

  /** agent_executions 집계 */
  private async aggregateExecutions(from: string, to: string, taskType?: string): Promise<{
    total: number; success: number; failed: number; partial: number;
    avgDuration: number; totalCost: number;
  }>

  /** agent_feedback 집계 */
  private async aggregateFeedback(from: string, to: string, taskType?: string): Promise<{
    pending: number; reviewed: number; applied: number;
  }>

  /** fallback_events 집계 */
  private async aggregateFallbacks(from: string, to: string): Promise<{
    count: number;
  }>

  /** model_execution_metrics 모델별 집계 */
  private async aggregateByModel(from: string, to: string): Promise<ModelBreakdown[]>

  /** agent_executions taskType별 집계 */
  private async aggregateByTaskType(from: string, to: string): Promise<TaskTypeBreakdown[]>
}
```

### 3.3 개선 제안 규칙 상세

```typescript
// 규칙 엔진 — generateReport 결과 기반으로 평가

const SUGGESTION_RULES: Array<{
  type: SuggestionType;
  severity: SuggestionSeverity;
  evaluate: (report: QualityReport) => Suggestion | null;
}> = [
  {
    type: "model-unstable",
    severity: "warning",
    evaluate: (report) => {
      // 규칙 1: 특정 모델 successRate < 80%
      const unstable = report.byModel.filter(m => m.successRate < 80 && m.executions >= 5);
      if (unstable.length === 0) return null;
      return {
        type: "model-unstable",
        severity: "warning",
        message: `모델 ${unstable.map(m => m.model).join(", ")}의 성공률이 80% 미만이에요. 모델 교체 또는 Fallback 체인 추가를 권장해요.`,
        data: { models: unstable.map(m => ({ model: m.model, successRate: m.successRate, executions: m.executions })) },
      };
    },
  },
  {
    type: "fallback-frequent",
    severity: "warning",
    evaluate: (report) => {
      // 규칙 2: fallback 비율 > 20%
      if (report.overall.fallbackRate <= 20) return null;
      return {
        type: "fallback-frequent",
        severity: "warning",
        message: `Fallback 발생률이 ${report.overall.fallbackRate.toFixed(1)}%로 높아요. 주 모델 안정성을 점검해주세요.`,
        data: { fallbackRate: report.overall.fallbackRate, fallbackCount: report.overall.fallbackCount },
      };
    },
  },
  {
    type: "cost-anomaly",
    severity: "info",
    evaluate: (report) => {
      // 규칙 3: 특정 taskType 비용 > 전체 평균 × 2
      const avgCost = report.overall.avgCostPerExecution;
      const expensive = report.byTaskType.filter(t => t.avgCostPerExecution > avgCost * 2 && t.executions >= 3);
      if (expensive.length === 0) return null;
      return {
        type: "cost-anomaly",
        severity: "info",
        message: `${expensive.map(t => t.taskType).join(", ")} 태스크의 평균 비용이 전체 평균의 2배 이상이에요.`,
        data: { tasks: expensive, overallAvg: avgCost },
      };
    },
  },
  {
    type: "feedback-backlog",
    severity: "warning",
    evaluate: (report) => {
      // 규칙 4: pending 피드백 > 10건
      if (report.overall.feedbackPending <= 10) return null;
      return {
        type: "feedback-backlog",
        severity: "warning",
        message: `미처리 피드백이 ${report.overall.feedbackPending}건 쌓여 있어요. 학습 루프가 지연되고 있어요.`,
        data: { pending: report.overall.feedbackPending, processingRate: report.overall.feedbackProcessingRate },
      };
    },
  },
  {
    type: "retry-excessive",
    severity: "info",
    evaluate: (report) => {
      // 규칙 5: 평균 재시도 > 2회 (agent_executions에서 동일 task_id 카운트)
      // 실제 구현 시 별도 쿼리로 집계
      return null; // generateReport에서 별도 집계 후 주입
    },
  },
  {
    type: "task-low-quality",
    severity: "critical",
    evaluate: (report) => {
      // 규칙 6: 특정 taskType successRate < 60%
      const lowQuality = report.byTaskType.filter(t => t.successRate < 60 && t.executions >= 5);
      if (lowQuality.length === 0) return null;
      return {
        type: "task-low-quality",
        severity: "critical",
        message: `${lowQuality.map(t => t.taskType).join(", ")} 태스크의 성공률이 60% 미만이에요. 자동화 적합성을 재검토하세요.`,
        data: { tasks: lowQuality },
      };
    },
  },
];
```

### 3.4 스냅샷 캐시 전략

```
GET /automation-quality/report?days=7
  │
  ├─ 날짜 범위 계산: today - 7일 ~ today
  │
  ├─ 각 날짜에 대해:
  │     ├─ SELECT FROM automation_quality_snapshots
  │     │   WHERE snapshot_date = ? AND task_type IS NULL
  │     │
  │     ├─ 캐시 히트 → 스냅샷 데이터 사용
  │     └─ 캐시 미스 → 5개 테이블 집계 → INSERT 스냅샷 → 데이터 반환
  │
  ├─ 일별 데이터 합산 → overall 메트릭 + dailyTrends
  │
  ├─ byTaskType/byModel → 기간 전체 직접 집계 (스냅샷 없음, 실시간 쿼리)
  │
  └─ 반환: QualityReport
```

**캐시 정책:**
- 당일(today) 스냅샷은 항상 재생성 (데이터가 아직 불완전)
- 과거 날짜 스냅샷은 1회 생성 후 영구 캐시
- taskType 필터 시 task_type 컬럼별 별도 스냅샷 생성

### 3.5 API 엔드포인트 상세

#### GET /automation-quality/report

```typescript
// Query parameters
interface ReportQuery {
  days?: number;     // 기본 7, 최대 90
  taskType?: string; // AgentTaskType 필터 (선택)
}

// Response 200
interface ReportResponse {
  report: QualityReport;
  cached: boolean;   // 전체 캐시 히트 여부
}
```

#### GET /automation-quality/failure-patterns

```typescript
// Query parameters
interface FailurePatternsQuery {
  days?: number;     // 기본 30, 최대 90
}

// Response 200
interface FailurePatternsResponse {
  patterns: FailurePattern[];
  total: number;
}
```

#### GET /automation-quality/suggestions

```typescript
// Query parameters
interface SuggestionsQuery {
  days?: number;     // 기본 30, 최대 90
}

// Response 200
interface SuggestionsResponse {
  suggestions: Suggestion[];
  evaluatedRules: number;  // 평가된 규칙 수 (6)
}
```

---

## 4. F152 상세 설계: AgentMarketplace

### 4.1 타입 정의

```typescript
// ── 마켓플레이스 항목 ────────────────────────────

export interface MarketplaceItem {
  id: string;
  roleId: string;                // 원본 custom_agent_roles.id
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  preferredModel: string | null;
  preferredRunnerType: string;
  taskType: string;
  category: string;              // AgentTaskType 기반 카테고리
  tags: string[];
  publisherOrgId: string;
  status: "published" | "archived";
  avgRating: number;             // 0~5
  ratingCount: number;
  installCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceItemRow {
  id: string;
  role_id: string;
  name: string;
  description: string;
  system_prompt: string;
  allowed_tools: string;         // JSON array string
  preferred_model: string | null;
  preferred_runner_type: string;
  task_type: string;
  category: string;
  tags: string;                  // JSON array string
  publisher_org_id: string;
  status: string;
  avg_rating: number;
  rating_count: number;
  install_count: number;
  created_at: string;
  updated_at: string;
}

// ── 게시 입력 ────────────────────────────────────

export interface PublishItemInput {
  roleId: string;                // 게시할 커스텀 역할 ID
  tags?: string[];               // 검색 태그
  category?: string;             // 카테고리 오버라이드 (기본: role.taskType)
}

// ── 검색 필터 ────────────────────────────────────

export interface MarketplaceSearchParams {
  query?: string;                // 이름/설명 LIKE 검색
  category?: string;             // 카테고리 필터
  tags?: string[];               // 태그 필터 (OR 조건)
  sortBy?: "rating" | "installs" | "recent"; // 정렬 기준
  limit?: number;                // 기본 20, 최대 50
  offset?: number;               // 페이지네이션
}

export interface MarketplaceSearchResult {
  items: MarketplaceItem[];
  total: number;
  limit: number;
  offset: number;
}

// ── 평점 ─────────────────────────────────────────

export interface MarketplaceRating {
  id: string;
  itemId: string;
  userId: string;
  orgId: string | null;
  score: number;                 // 1~5
  reviewText: string;
  createdAt: string;
}

// ── 설치 ─────────────────────────────────────────

export interface MarketplaceInstall {
  id: string;
  itemId: string;
  orgId: string;
  installedRoleId: string;       // 복제 생성된 CustomRole ID
  installedAt: string;
}

// ── 항목 통계 ────────────────────────────────────

export interface MarketplaceItemStats {
  itemId: string;
  installCount: number;
  avgRating: number;
  ratingCount: number;
  recentRatings: MarketplaceRating[];  // 최근 5개
}
```

### 4.2 서비스 메서드

```typescript
export class AgentMarketplace {
  constructor(
    private db: D1Database,
    private roleManager: CustomRoleManager,
  ) {}

  /**
   * 커스텀 역할을 마켓플레이스에 게시
   * - CustomRoleManager에서 역할 조회 → 빌트인 체크 → 중복 게시 체크 → INSERT
   */
  async publishItem(input: PublishItemInput, publisherOrgId: string): Promise<MarketplaceItem>

  /**
   * 마켓플레이스 검색
   * - name/description LIKE + category/tags 필터 + 정렬 + 페이지네이션
   */
  async searchItems(params: MarketplaceSearchParams): Promise<MarketplaceSearchResult>

  /**
   * 항목 단일 조회
   */
  async getItem(itemId: string): Promise<MarketplaceItem | null>

  /**
   * 마켓플레이스 항목 설치
   * - 중복 설치 체크 → CustomRoleManager.createRole()로 역할 복제 → install_count 증가
   */
  async installItem(itemId: string, targetOrgId: string): Promise<MarketplaceInstall>

  /**
   * 설치된 항목 제거
   * - agent_marketplace_installs DELETE + install_count 감소
   * - 복제된 CustomRole은 유지 (사용자가 직접 삭제)
   */
  async uninstallItem(itemId: string, orgId: string): Promise<{ uninstalled: boolean }>

  /**
   * 평점/리뷰 등록 (user당 1건 UPSERT)
   * - INSERT OR REPLACE → avg_rating + rating_count 재계산
   */
  async rateItem(itemId: string, userId: string, orgId: string | null, score: number, reviewText?: string): Promise<MarketplaceRating>

  /**
   * 항목 삭제 (게시자만 가능)
   * - status='archived' 소프트 삭제 — 설치된 역할은 독립 유지
   */
  async deleteItem(itemId: string, requestOrgId: string): Promise<{ deleted: boolean }>

  /**
   * 항목 통계 조회
   */
  async getItemStats(itemId: string): Promise<MarketplaceItemStats>

  // ── 내부 메서드 ──

  /** D1 row → MarketplaceItem 변환 */
  private toMarketplaceItem(row: MarketplaceItemRow): MarketplaceItem

  /** avg_rating + rating_count 재계산 → items UPDATE */
  private async recalculateRating(itemId: string): Promise<void>
}
```

### 4.3 설치 흐름 상세

```
POST /agents/marketplace/:id/install
  │
  ├─ 1. getItem(itemId) → MarketplaceItem 조회
  │     └─ 404: 항목 없음 | status='archived': 설치 불가
  │
  ├─ 2. 중복 설치 체크
  │     └─ SELECT FROM agent_marketplace_installs
  │        WHERE item_id=? AND org_id=?
  │     └─ 존재 시 409: "이미 설치된 항목이에요"
  │
  ├─ 3. CustomRoleManager.createRole({
  │        name: `${item.name} (marketplace)`,
  │        systemPrompt: item.systemPrompt,
  │        allowedTools: item.allowedTools,
  │        preferredModel: item.preferredModel,
  │        preferredRunnerType: item.preferredRunnerType,
  │        taskType: item.taskType,
  │        orgId: targetOrgId,
  │     })
  │     └─ 반환: CustomRole { id: "role-xyz" }
  │
  ├─ 4. INSERT INTO agent_marketplace_installs
  │     (id, item_id, org_id, installed_role_id)
  │
  ├─ 5. UPDATE agent_marketplace_items
  │     SET install_count = install_count + 1
  │
  └─ 반환: { id, itemId, orgId, installedRoleId, installedAt }
```

### 4.4 평점 재계산

```
POST /agents/marketplace/:id/rate { score: 4, reviewText: "좋아요" }
  │
  ├─ INSERT OR REPLACE INTO agent_marketplace_ratings
  │   (id, item_id, user_id, org_id, score, review_text)
  │
  ├─ recalculateRating(itemId):
  │     SELECT AVG(score), COUNT(*) FROM agent_marketplace_ratings
  │     WHERE item_id = ?
  │     │
  │     UPDATE agent_marketplace_items
  │     SET avg_rating = ?, rating_count = ?, updated_at = datetime('now')
  │     WHERE id = ?
  │
  └─ 반환: MarketplaceRating
```

### 4.5 API 엔드포인트 상세

#### POST /agents/marketplace

```typescript
// Request body
const PublishItemSchema = z.object({
  roleId: z.string().min(1),
  tags: z.array(z.string()).max(10).optional(),
  category: z.string().optional(),
});

// Response 201: MarketplaceItem
// Error 404: 역할 없음
// Error 400: 빌트인 역할 게시 불가
// Error 409: 이미 게시된 역할
```

#### GET /agents/marketplace

```typescript
// Query parameters
const SearchQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),         // 쉼표 구분
  sortBy: z.enum(["rating", "installs", "recent"]).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  offset: z.coerce.number().min(0).optional(),
});

// Response 200: MarketplaceSearchResult
```

#### POST /agents/marketplace/:id/install

```typescript
// Request body: (없음 — orgId는 JWT에서 추출)
// Response 201: MarketplaceInstall
// Error 404: 항목 없음
// Error 409: 이미 설치됨
```

#### POST /agents/marketplace/:id/rate

```typescript
// Request body
const RateItemSchema = z.object({
  score: z.number().int().min(1).max(5),
  reviewText: z.string().max(500).optional(),
});

// Response 200: MarketplaceRating
// Error 404: 항목 없음
```

#### DELETE /agents/marketplace/:id

```typescript
// Response 200: { deleted: true }
// Error 404: 항목 없음
// Error 403: 게시자가 아님
```

#### GET /agents/marketplace/:id/stats

```typescript
// Response 200: MarketplaceItemStats
// Error 404: 항목 없음
```

---

## 5. Zod 스키마

### 5.1 F151 스키마 (schemas/automation-quality.ts — 신규)

```typescript
import { z } from "@hono/zod-openapi";

export const QualityReportQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
  taskType: z.string().optional(),
});

export const FailurePatternsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});

export const SuggestionsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().default(30),
});
```

### 5.2 F152 스키마 (schemas/agent.ts — 하단 추가)

```typescript
// ── F152: AgentMarketplace 스키마 ──

export const PublishMarketplaceItemSchema = z.object({
  roleId: z.string().min(1),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  category: z.string().optional(),
});

export const SearchMarketplaceSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.enum(["rating", "installs", "recent"]).optional().default("rating"),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const RateMarketplaceItemSchema = z.object({
  score: z.number().int().min(1).max(5),
  reviewText: z.string().max(500).optional().default(""),
});
```

---

## 6. D1 마이그레이션

### 6.1 0025_automation_quality_snapshots.sql

```sql
-- F151: 자동화 품질 일일 스냅샷 캐시
CREATE TABLE IF NOT EXISTS automation_quality_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL,
  task_type TEXT,
  total_executions INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0,
  avg_duration_ms REAL NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  avg_cost_per_execution REAL NOT NULL DEFAULT 0,
  feedback_pending INTEGER NOT NULL DEFAULT 0,
  feedback_applied INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  top_failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_snapshot_date_type
  ON automation_quality_snapshots(snapshot_date, task_type);
```

### 6.2 0026_agent_marketplace.sql

```sql
-- F152: 에이전트 마켓플레이스

CREATE TABLE IF NOT EXISTS agent_marketplace_items (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL,
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  preferred_runner_type TEXT DEFAULT 'openrouter',
  task_type TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  publisher_org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  avg_rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_category
  ON agent_marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status
  ON agent_marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_publisher
  ON agent_marketplace_items(publisher_org_id);

CREATE TABLE IF NOT EXISTS agent_marketplace_ratings (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  review_text TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_rating_user
  ON agent_marketplace_ratings(item_id, user_id);

CREATE TABLE IF NOT EXISTS agent_marketplace_installs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  installed_role_id TEXT,
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_install_org
  ON agent_marketplace_installs(item_id, org_id);
```

---

## 7. 라우트 등록

### 7.1 routes/automation-quality.ts (신규 파일)

```typescript
import { Hono } from "hono";
import type { Env } from "../env.js";
import { AutomationQualityReporter } from "../services/automation-quality-reporter.js";
import { QualityReportQuerySchema, FailurePatternsQuerySchema, SuggestionsQuerySchema } from "../schemas/automation-quality.js";

export const automationQualityRoute = new Hono<{ Bindings: Env }>();

// GET /automation-quality/report
automationQualityRoute.get("/automation-quality/report", async (c) => { ... });

// GET /automation-quality/failure-patterns
automationQualityRoute.get("/automation-quality/failure-patterns", async (c) => { ... });

// GET /automation-quality/suggestions
automationQualityRoute.get("/automation-quality/suggestions", async (c) => { ... });
```

### 7.2 app.ts 등록

```typescript
import { automationQualityRoute } from "./routes/automation-quality.js";
// ... 기존 라우트들 아래에 추가
app.route("/api", automationQualityRoute);
```

### 7.3 routes/agent.ts (F152 하단 append)

```typescript
// ── F152: Agent Marketplace ─────────────────────
// POST /agents/marketplace
agentRoute.post("/agents/marketplace", async (c) => { ... });
// GET /agents/marketplace
agentRoute.get("/agents/marketplace", async (c) => { ... });
// POST /agents/marketplace/:id/install
agentRoute.post("/agents/marketplace/:id/install", async (c) => { ... });
// POST /agents/marketplace/:id/rate
agentRoute.post("/agents/marketplace/:id/rate", async (c) => { ... });
// DELETE /agents/marketplace/:id
agentRoute.delete("/agents/marketplace/:id", async (c) => { ... });
// GET /agents/marketplace/:id/stats
agentRoute.get("/agents/marketplace/:id/stats", async (c) => { ... });
```

---

## 8. 테스트 케이스

### 8.1 F151 테스트 (automation-quality-reporter.test.ts, 20개+)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | generateReport — 기본 7일, 데이터 없음 | 빈 메트릭 반환 (successRate=0) |
| 2 | generateReport — 성공+실패 혼합 데이터 | successRate 정확도 |
| 3 | generateReport — taskType 필터 적용 | 해당 taskType만 집계 |
| 4 | generateReport — 스냅샷 캐시 히트 | 두 번째 호출 시 캐시 사용 |
| 5 | generateReport — 당일 스냅샷 재생성 | today는 항상 재집계 |
| 6 | generateReport — days=90 최대 범위 | 정상 동작 |
| 7 | generateReport — byTaskType 분류 | taskType별 독립 집계 |
| 8 | generateReport — byModel 분류 | 모델별 독립 집계 |
| 9 | generateReport — dailyTrends 일별 추이 | 날짜 순 정렬 |
| 10 | generateReport — 비용 집계 정확도 | totalCost + avgCost 검증 |
| 11 | getFailurePatterns — 실패 데이터 없음 | 빈 배열 반환 |
| 12 | getFailurePatterns — taskType×model 그룹화 | 그룹별 정확 카운트 |
| 13 | getFailurePatterns — topReasons 상위 3개 | 빈발 순 정렬 |
| 14 | getFailurePatterns — pendingFeedback 카운트 | agent_feedback JOIN |
| 15 | getImprovementSuggestions — 모든 규칙 미충족 | 빈 배열 반환 |
| 16 | getImprovementSuggestions — model-unstable 규칙 | successRate < 80% 모델 감지 |
| 17 | getImprovementSuggestions — fallback-frequent 규칙 | fallbackRate > 20% 감지 |
| 18 | getImprovementSuggestions — cost-anomaly 규칙 | 평균 2배 초과 taskType 감지 |
| 19 | getImprovementSuggestions — feedback-backlog 규칙 | pending > 10건 감지 |
| 20 | getImprovementSuggestions — task-low-quality 규칙 | successRate < 60% 감지 |
| 21 | getImprovementSuggestions — 복합 규칙 동시 충족 | 여러 제안 동시 반환 |
| 22 | 엔드포인트 GET /automation-quality/report | 200 + QualityReport 구조 |
| 23 | 엔드포인트 GET /automation-quality/failure-patterns | 200 + 배열 |
| 24 | 엔드포인트 GET /automation-quality/suggestions | 200 + 배열 |

### 8.2 F152 테스트 (agent-marketplace.test.ts, 20개+)

| # | 테스트 | 검증 |
|---|--------|------|
| 1 | publishItem — 정상 게시 | MarketplaceItem 반환, status=published |
| 2 | publishItem — 빌트인 역할 게시 시도 | 에러: 빌트인 역할 게시 불가 |
| 3 | publishItem — 존재하지 않는 roleId | 에러 404 |
| 4 | publishItem — 중복 게시 방지 | 동일 roleId 재게시 시 에러 409 |
| 5 | publishItem — tags + category 설정 | 정확한 메타데이터 저장 |
| 6 | searchItems — 빈 마켓플레이스 | { items: [], total: 0 } |
| 7 | searchItems — 이름 검색 (q 파라미터) | LIKE 매칭 |
| 8 | searchItems — 카테고리 필터 | 해당 카테고리만 반환 |
| 9 | searchItems — 정렬 (rating, installs, recent) | 각 정렬 기준 검증 |
| 10 | searchItems — 페이지네이션 (limit, offset) | 정확한 슬라이싱 |
| 11 | searchItems — archived 항목 제외 | status=published만 반환 |
| 12 | installItem — 정상 설치 | CustomRole 복제 + install_count 증가 |
| 13 | installItem — 중복 설치 방지 | 동일 org+item 시 에러 409 |
| 14 | installItem — archived 항목 설치 시도 | 에러: 설치 불가 |
| 15 | installItem — 존재하지 않는 itemId | 에러 404 |
| 16 | uninstallItem — 정상 제거 | install 레코드 삭제 + count 감소 |
| 17 | rateItem — 정상 평점 등록 | MarketplaceRating 반환 |
| 18 | rateItem — 동일 사용자 재평가 (UPSERT) | 기존 평점 업데이트 |
| 19 | rateItem — avg_rating 재계산 정확도 | 여러 평점 후 평균 검증 |
| 20 | rateItem — score 범위 (1~5) 벗어남 | 유효성 검사 에러 |
| 21 | deleteItem — 게시자 삭제 | status=archived 전환 |
| 22 | deleteItem — 다른 org 삭제 시도 | 에러 403 |
| 23 | getItemStats — 통계 조회 | installCount + avgRating + recentRatings |
| 24 | getItem — 단일 항목 조회 | 정확한 데이터 반환 |

---

## 9. 2-Worker 병렬 작업 명세

### Worker 1: F151 AutomationQualityReporter

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `src/db/migrations/0025_automation_quality_snapshots.sql` | D1 마이그레이션 |
| 2 | `src/schemas/automation-quality.ts` | Zod 스키마 (신규 파일) |
| 3 | `src/services/automation-quality-reporter.ts` | 서비스 (generateReport, getFailurePatterns, getImprovementSuggestions) |
| 4 | `src/__tests__/automation-quality-reporter.test.ts` | 테스트 24개 |
| 5 | `src/routes/automation-quality.ts` | 라우트 (신규 파일, 3 엔드포인트) |

**수정 허용 파일 (positive constraint):**
- `src/db/migrations/0025_automation_quality_snapshots.sql` (생성)
- `src/schemas/automation-quality.ts` (생성)
- `src/services/automation-quality-reporter.ts` (생성)
- `src/__tests__/automation-quality-reporter.test.ts` (생성)
- `src/routes/automation-quality.ts` (생성)

### Worker 2: F152 AgentMarketplace

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `src/db/migrations/0026_agent_marketplace.sql` | D1 마이그레이션 (3 테이블) |
| 2 | `src/services/agent-marketplace.ts` | 서비스 (7 메서드) |
| 3 | `src/__tests__/agent-marketplace.test.ts` | 테스트 24개 |
| 4 | `src/routes/agent.ts` | 하단에 6개 엔드포인트 추가 |
| 5 | `src/schemas/agent.ts` | 하단에 Marketplace 스키마 추가 |

**수정 허용 파일 (positive constraint):**
- `src/db/migrations/0026_agent_marketplace.sql` (생성)
- `src/services/agent-marketplace.ts` (생성)
- `src/__tests__/agent-marketplace.test.ts` (생성)
- `src/routes/agent.ts` (하단 append)
- `src/schemas/agent.ts` (하단 append)

### 리더 통합

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `src/app.ts` | `automationQualityRoute` 등록 (1줄) |
| 2 | 전체 | `pnpm typecheck && pnpm test` |

### 충돌 위험도

| 파일 | Worker 1 | Worker 2 | 위험 |
|------|----------|----------|------|
| `src/app.ts` | 수정 없음 | 수정 없음 | ✅ 없음 (리더 담당) |
| `src/routes/agent.ts` | 수정 없음 | 하단 append | ✅ 없음 |
| `src/schemas/agent.ts` | 수정 없음 | 하단 append | ✅ 없음 |
| 기존 서비스 | import only | import only | ✅ 없음 |

**충돌 파일: 0건** — 완전 독립 병렬 실행 가능
