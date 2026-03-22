---
code: FX-DSGN-035
title: "Sprint 35 — 모델 비용/품질 대시보드 + Sprint 워크플로우 템플릿 (F143+F142)"
version: 1.0
status: Active
category: DSGN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-35
sprint: 35
phase: "Phase 5a"
plan-ref: "[[FX-PLAN-035]]"
---

## 1. Overview

### 1.1 Design Goals

- F143: 에이전트 실행 메트릭을 모델별·에이전트별로 수집하고, 비용·품질·지연을 한눈에 비교하는 대시보드 제공
- F142: Sprint 전용 워크플로우 DAG 템플릿 3종을 워크플로우 엔진에 추가하고, 품질 게이트 조건을 확장
- 공통: F135(OpenRouter)와 파일 충돌 없이 병렬 구현 가능하도록 모듈 분리

### 1.2 Design Principles

- **기존 인프라 확장**: 새 테이블·서비스를 추가하되, 기존 `token_usage`, `workflow-engine.ts` 코드 수정은 최소화
- **Forward-compatible**: F135 완료 후 `OpenRouterRunner`에서 `ModelMetricsService.recordExecution()` 호출만 추가하면 연동 완료
- **테스트 우선**: 각 서비스의 단위 테스트를 mock DB 기반으로 작성, 기존 583 API 테스트 회귀 0건

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Worker 1 (F143): 모델 비용/품질 대시보드                    │
│                                                          │
│ ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│ │ token.ts     │──▶│ ModelMetrics  │──▶│ D1           │  │
│ │ routes       │   │ Service      │   │ model_exec_  │  │
│ │ (+2 endpoints)│  │ (신규)       │   │ metrics 테이블│  │
│ └──────────────┘   └──────────────┘   └──────────────┘  │
│         │                                                │
│ ┌──────────────┐                                        │
│ │ TokensPage   │  ← Model Quality 탭 + 히트맵 추가      │
│ │ (Web 확장)   │                                        │
│ └──────────────┘                                        │
├─────────────────────────────────────────────────────────┤
│ Worker 2 (F142): Sprint 워크플로우 템플릿                  │
│                                                          │
│ ┌──────────────┐   ┌──────────────┐                     │
│ │ workflow.ts  │──▶│ WorkflowEngine│                    │
│ │ routes       │   │ (확장)       │                     │
│ │ (+1 endpoint)│   │ +3 templates │                     │
│ └──────────────┘   │ +3 conditions│                     │
│                     │ +SprintCtx  │                     │
│ ┌──────────────┐   └──────────────┘                     │
│ │ workflow.ts  │                                        │
│ │ schemas      │  ← SprintContext + SprintTemplate 추가  │
│ └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

**F143 — 메트릭 수집 흐름:**
```
AgentRunner.execute()
  → AgentExecutionResult { status, tokensUsed, model, duration }
  → ModelMetricsService.recordExecution(projectId, agentName, taskType, result)
  → INSERT INTO model_execution_metrics
  → GET /tokens/model-quality → 모델별 집계 반환
  → GET /tokens/agent-model-matrix → 교차 분석 반환
  → TokensPage Model Quality 탭 렌더링
```

**F142 — 워크플로우 생성 흐름:**
```
사용자 Sprint 시작
  → GET /orgs/:orgId/workflows (templates 포함)
  → Sprint Standard/Fast/Review-Heavy 템플릿 선택
  → POST /orgs/:orgId/workflows (template_id + sprint_context)
  → WorkflowEngine.create() — definition 자동 생성
  → POST /orgs/:orgId/workflows/:id/execute (sprint_context)
  → DAG 순회 + 조건 평가 (match_rate_met, test_coverage_met, peer_review_approved)
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| ModelMetricsService | D1 (model_execution_metrics) | 메트릭 저장/집계 |
| token routes (+2) | ModelMetricsService | HTTP API 노출 |
| TokensPage (확장) | /tokens/model-quality, /tokens/agent-model-matrix | UI 렌더링 |
| WorkflowEngine (확장) | 기존 WorkflowEngine | Sprint 템플릿 + 조건 |
| workflow routes (+1) | WorkflowEngine | Sprint 템플릿 목록 API |

---

## 3. Data Model

### 3.1 F143 — model_execution_metrics 테이블

```typescript
interface ModelExecutionMetric {
  id: string;                  // mem_* prefix
  project_id: string;          // FK → projects.id
  agent_name: string;          // e.g., "reviewer-agent"
  task_type: string;           // AgentTaskType (code-review, spec-analysis, ...)
  model: string;               // e.g., "anthropic/claude-sonnet-4", "openai/gpt-4o"
  status: "success" | "partial" | "failed";
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  duration_ms: number;
  recorded_at: string;         // ISO 8601
}
```

### 3.2 F143 — 집계 응답 타입

```typescript
interface ModelQualityMetric {
  model: string;
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;           // 0~100 (정수, e.g., 90 = 90%)
  avgDurationMs: number;
  totalCostUsd: number;
  avgCostPerExecution: number;
  tokenEfficiency: number;       // (input_tokens + output_tokens) / cost_usd (높을수록 효율적)
}

interface AgentModelCell {
  agentName: string;
  model: string;
  executions: number;
  totalCostUsd: number;
  avgDurationMs: number;
  successRate: number;
}
```

### 3.3 F142 — SprintContext 타입

```typescript
interface SprintContext {
  sprint_id: string;             // e.g., "sprint-35"
  phase: string;                 // e.g., "Phase 5a"
  feature_ids: string[];         // e.g., ["F143", "F142"]
  due_date?: string;             // ISO 8601 날짜
  assignee?: string;             // 담당자
  quality_threshold?: number;    // 기본 90 (match rate 기준)
  test_coverage_threshold?: number;  // 기본 80
}
```

### 3.4 Database Schema

**Migration 0021_model_metrics.sql:**
```sql
-- F143: 모델 실행 메트릭 테이블
CREATE TABLE model_execution_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success'
    CHECK(status IN ('success', 'partial', 'failed')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_mem_model ON model_execution_metrics(model);
CREATE INDEX idx_mem_project ON model_execution_metrics(project_id);
CREATE INDEX idx_mem_recorded ON model_execution_metrics(recorded_at);
CREATE INDEX idx_mem_agent_model ON model_execution_metrics(agent_name, model);
```

---

## 4. API Specification

### 4.1 F143 — 신규 엔드포인트 (2개)

#### `GET /tokens/model-quality`

모델별 품질 메트릭 집계를 반환해요.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| projectId | string | No | 전체 | 프로젝트 필터 |
| days | number | No | 30 | 조회 기간 (일) |

**Response (200):**
```json
{
  "metrics": [
    {
      "model": "anthropic/claude-sonnet-4",
      "totalExecutions": 42,
      "successCount": 38,
      "failedCount": 4,
      "successRate": 90,
      "avgDurationMs": 3200,
      "totalCostUsd": 1.25,
      "avgCostPerExecution": 0.0298,
      "tokenEfficiency": 30000.0
    }
  ],
  "period": { "from": "2026-02-20", "to": "2026-03-22" }
}
```

**Zod Schema:**
```typescript
export const ModelQualityMetricSchema = z.object({
  model: z.string(),
  totalExecutions: z.number(),
  successCount: z.number(),
  failedCount: z.number(),
  successRate: z.number(),
  avgDurationMs: z.number(),
  totalCostUsd: z.number(),
  avgCostPerExecution: z.number(),
  tokenEfficiency: z.number(),
}).openapi("ModelQualityMetric");

export const ModelQualityResponseSchema = z.object({
  metrics: z.array(ModelQualityMetricSchema),
  period: z.object({ from: z.string(), to: z.string() }),
}).openapi("ModelQualityResponse");
```

#### `GET /tokens/agent-model-matrix`

에이전트×모델 교차 분석 데이터를 반환해요.

**Query Parameters:** (model-quality와 동일)

**Response (200):**
```json
{
  "matrix": [
    {
      "agentName": "reviewer-agent",
      "model": "anthropic/claude-sonnet-4",
      "executions": 15,
      "totalCostUsd": 0.45,
      "avgDurationMs": 2800,
      "successRate": 93
    }
  ],
  "period": { "from": "2026-02-20", "to": "2026-03-22" }
}
```

**Zod Schema:**
```typescript
export const AgentModelCellSchema = z.object({
  agentName: z.string(),
  model: z.string(),
  executions: z.number(),
  totalCostUsd: z.number(),
  avgDurationMs: z.number(),
  successRate: z.number(),
}).openapi("AgentModelCell");

export const AgentModelMatrixResponseSchema = z.object({
  matrix: z.array(AgentModelCellSchema),
  period: z.object({ from: z.string(), to: z.string() }),
}).openapi("AgentModelMatrixResponse");
```

### 4.2 F142 — 신규 엔드포인트 (1개)

#### `GET /orgs/:orgId/workflows/sprint-templates`

Sprint 전용 워크플로우 템플릿 목록을 반환해요.

**Response (200):**
```json
{
  "templates": [
    {
      "id": "tpl_sprint_standard",
      "name": "Sprint Standard",
      "description": "7단계 전체 Sprint — Think→Plan→Build→Review→Test→Ship→Reflect",
      "category": "sprint",
      "definition": { "nodes": [...], "edges": [...] },
      "sprintContext": {
        "quality_threshold": 90,
        "test_coverage_threshold": 80
      }
    }
  ]
}
```

**Zod Schema:**
```typescript
export const sprintContextSchema = z.object({
  sprint_id: z.string(),
  phase: z.string(),
  feature_ids: z.array(z.string()),
  due_date: z.string().optional(),
  assignee: z.string().optional(),
  quality_threshold: z.number().default(90),
  test_coverage_threshold: z.number().default(80),
}).openapi("SprintContext");

export const sprintTemplateResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.literal("sprint"),
  definition: workflowDefinitionSchema,
  sprintContext: sprintContextSchema.partial(),
}).openapi("SprintTemplateResponse");
```

### 4.3 기존 엔드포인트 영향 분석

| 기존 엔드포인트 | 영향 | 비고 |
|----------------|:----:|------|
| GET /tokens/summary | 없음 | 기존 로직 유지 |
| GET /tokens/usage | 없음 | 기존 로직 유지 |
| GET /orgs/:orgId/workflows | 수정 | templates 응답에 sprint 카테고리 추가 |
| POST /orgs/:orgId/workflows | 없음 | template_id로 sprint 템플릿 참조 가능 |
| POST /orgs/:orgId/workflows/:id/execute | 수정 (최소) | context에 sprintContext 전달 지원 |

---

## 5. Service Implementation

### 5.1 F143 — ModelMetricsService

**파일**: `packages/api/src/services/model-metrics.ts`

```typescript
export class ModelMetricsService {
  constructor(private db: D1Database) {}

  /**
   * 에이전트 실행 결과를 메트릭으로 기록
   * - AgentRunner.execute() 완료 후 호출
   * - F135 완료 후 OpenRouterRunner에서도 동일하게 호출
   */
  async recordExecution(params: {
    projectId: string;
    agentName: string;
    taskType: string;
    model: string;
    status: "success" | "partial" | "failed";
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
  }): Promise<{ id: string; recorded: boolean }>;

  /**
   * 모델별 품질 메트릭 집계
   * SQL: GROUP BY model, COUNT/AVG/SUM 집계
   */
  async getModelQuality(params: {
    projectId?: string;
    days?: number;
  }): Promise<ModelQualityMetric[]>;

  /**
   * 에이전트×모델 교차 분석
   * SQL: GROUP BY agent_name, model
   */
  async getAgentModelMatrix(params: {
    projectId?: string;
    days?: number;
  }): Promise<AgentModelCell[]>;
}
```

**SQL 쿼리 설계:**

```sql
-- getModelQuality
SELECT
  model,
  COUNT(*) as total_executions,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  ROUND(CAST(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 2) as success_rate,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms,
  ROUND(SUM(cost_usd), 4) as total_cost_usd,
  ROUND(SUM(cost_usd) / COUNT(*), 4) as avg_cost_per_execution,
  CASE WHEN SUM(cost_usd) > 0
    THEN ROUND(CAST(SUM(output_tokens) AS REAL) / SUM(cost_usd), 0)
    ELSE 0
  END as token_efficiency
FROM model_execution_metrics
WHERE recorded_at >= datetime('now', '-' || ? || ' days')
GROUP BY model
ORDER BY total_executions DESC;

-- getAgentModelMatrix
SELECT
  agent_name,
  model,
  COUNT(*) as executions,
  ROUND(SUM(cost_usd), 4) as total_cost_usd,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms,
  ROUND(CAST(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS REAL) / COUNT(*), 2) as success_rate
FROM model_execution_metrics
WHERE recorded_at >= datetime('now', '-' || ? || ' days')
GROUP BY agent_name, model
ORDER BY executions DESC;
```

### 5.2 F142 — WorkflowEngine 확장

**파일**: `packages/api/src/services/workflow-engine.ts` (기존 파일 수정)

#### 5.2.1 Sprint 템플릿 3종

```typescript
// 기존 WORKFLOW_TEMPLATES 배열에 추가
const SPRINT_WORKFLOW_TEMPLATES = [
  {
    id: "tpl_sprint_standard",
    name: "Sprint Standard",
    description: "7단계 전체 Sprint — Think→Plan→Build→Review→Test→Ship→Reflect",
    category: "sprint" as const,
    definition: {
      nodes: [
        { id: "trigger", type: "trigger", label: "Sprint 시작", position: { x: 0, y: 0 }, data: {} },
        { id: "think",   type: "action",  label: "Think — 요구사항 분석", position: { x: 200, y: 0 }, data: { actionType: "run_analysis", config: { phase: "think" } } },
        { id: "plan",    type: "action",  label: "Plan — 설계 문서 작성", position: { x: 400, y: 0 }, data: { actionType: "run_agent", config: { phase: "plan" } } },
        { id: "build",   type: "action",  label: "Build — 구현", position: { x: 600, y: 0 }, data: { actionType: "run_agent", config: { phase: "build" } } },
        { id: "review",  type: "condition", label: "Review — 코드 리뷰", position: { x: 800, y: 0 }, data: {} },
        { id: "test",    type: "condition", label: "Test — 품질 게이트", position: { x: 1000, y: 0 }, data: {} },
        { id: "ship",    type: "action",  label: "Ship — 배포", position: { x: 1200, y: 0 }, data: { actionType: "create_pr", config: {} } },
        { id: "reflect", type: "action",  label: "Reflect — 회고", position: { x: 1400, y: 0 }, data: { actionType: "send_notification", config: { type: "retrospective" } } },
        { id: "end",     type: "end",     label: "완료", position: { x: 1600, y: 0 }, data: {} },
        { id: "rework",  type: "action",  label: "Rework — 수정", position: { x: 800, y: 200 }, data: { actionType: "run_agent", config: { phase: "fix" } } },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "think" },
        { id: "e2", source: "think",   target: "plan" },
        { id: "e3", source: "plan",    target: "build" },
        { id: "e4", source: "build",   target: "review" },
        { id: "e5", source: "review",  target: "test",   label: "Approved", condition: "peer_review_approved" },
        { id: "e6", source: "review",  target: "rework", label: "Changes Requested" },
        { id: "e7", source: "rework",  target: "review" },
        { id: "e8", source: "test",    target: "ship",   label: "Quality Gate Pass", condition: "match_rate_met" },
        { id: "e9", source: "test",    target: "rework", label: "Quality Gate Fail" },
        { id: "e10", source: "ship",   target: "reflect" },
        { id: "e11", source: "reflect", target: "end" },
      ],
    },
  },
  {
    id: "tpl_sprint_fast",
    name: "Sprint Fast",
    description: "4단계 경량 Sprint — Plan→Build→Test→Ship (긴급/핫픽스용)",
    category: "sprint" as const,
    definition: {
      nodes: [
        { id: "trigger", type: "trigger", label: "Sprint 시작", position: { x: 0, y: 0 }, data: {} },
        { id: "plan",    type: "action",  label: "Plan", position: { x: 200, y: 0 }, data: { actionType: "run_agent", config: { phase: "plan" } } },
        { id: "build",   type: "action",  label: "Build", position: { x: 400, y: 0 }, data: { actionType: "run_agent", config: { phase: "build" } } },
        { id: "test",    type: "condition", label: "Test", position: { x: 600, y: 0 }, data: {} },
        { id: "ship",    type: "action",  label: "Ship", position: { x: 800, y: 0 }, data: { actionType: "create_pr", config: {} } },
        { id: "end",     type: "end",     label: "완료", position: { x: 1000, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "trigger", target: "plan" },
        { id: "e2", source: "plan",    target: "build" },
        { id: "e3", source: "build",   target: "test" },
        { id: "e4", source: "test",    target: "ship", label: "Pass", condition: "test_coverage_met" },
        { id: "e5", source: "test",    target: "build", label: "Fail" },
        { id: "e6", source: "ship",    target: "end" },
      ],
    },
  },
  {
    id: "tpl_sprint_review_heavy",
    name: "Sprint Review-Heavy",
    description: "6단계 이중 리뷰 Sprint — Plan→Build→Review→Peer Review→Test→Ship",
    category: "sprint" as const,
    definition: {
      nodes: [
        { id: "trigger",     type: "trigger",   label: "Sprint 시작", position: { x: 0, y: 0 }, data: {} },
        { id: "plan",        type: "action",    label: "Plan", position: { x: 200, y: 0 }, data: { actionType: "run_agent", config: { phase: "plan" } } },
        { id: "build",       type: "action",    label: "Build", position: { x: 400, y: 0 }, data: { actionType: "run_agent", config: { phase: "build" } } },
        { id: "auto_review", type: "condition",  label: "Auto Review — AI 분석", position: { x: 600, y: 0 }, data: {} },
        { id: "peer_review", type: "condition",  label: "Peer Review — 사람 검토", position: { x: 800, y: 0 }, data: {} },
        { id: "test",        type: "condition",  label: "Test", position: { x: 1000, y: 0 }, data: {} },
        { id: "ship",        type: "action",    label: "Ship", position: { x: 1200, y: 0 }, data: { actionType: "create_pr", config: {} } },
        { id: "end",         type: "end",       label: "완료", position: { x: 1400, y: 0 }, data: {} },
        { id: "rework",      type: "action",    label: "Rework", position: { x: 600, y: 200 }, data: { actionType: "run_agent", config: { phase: "fix" } } },
      ],
      edges: [
        { id: "e1", source: "trigger",     target: "plan" },
        { id: "e2", source: "plan",        target: "build" },
        { id: "e3", source: "build",       target: "auto_review" },
        { id: "e4", source: "auto_review", target: "peer_review", label: "AI Pass", condition: "analysis_passed" },
        { id: "e5", source: "auto_review", target: "rework",      label: "AI Fail" },
        { id: "e6", source: "peer_review", target: "test",        label: "Approved", condition: "peer_review_approved" },
        { id: "e7", source: "peer_review", target: "rework",      label: "Changes Requested" },
        { id: "e8", source: "rework",      target: "auto_review" },
        { id: "e9", source: "test",        target: "ship",        label: "Pass", condition: "match_rate_met" },
        { id: "e10", source: "test",       target: "rework",      label: "Fail" },
        { id: "e11", source: "ship",       target: "end" },
      ],
    },
  },
];
```

#### 5.2.2 조건 평가기 추가 (3종)

```typescript
// 기존 CONDITION_EVALUATORS에 추가
const EXTENDED_CONDITION_EVALUATORS: Record<string, (ctx: ExecutionContext) => boolean> = {
  // 기존 4종 유지
  approval_granted: (ctx) => ctx.lastResult?.approved === true,
  analysis_passed: (ctx) => ((ctx.lastResult?.matchRate as number) ?? 0) >= 90,
  pr_merged: (ctx) => ctx.lastResult?.prState === "merged",
  always: () => true,

  // 신규 3종
  match_rate_met: (ctx) => {
    const threshold = (ctx.variables?.sprintContext as SprintContext)?.quality_threshold ?? 90;
    return ((ctx.lastResult?.matchRate as number) ?? 0) >= threshold;
  },
  test_coverage_met: (ctx) => {
    const threshold = (ctx.variables?.sprintContext as SprintContext)?.test_coverage_threshold ?? 80;
    return ((ctx.lastResult?.coverage as number) ?? 0) >= threshold;
  },
  peer_review_approved: (ctx) => {
    return ((ctx.lastResult?.reviewCount as number) ?? 0) >= 1;
  },
};
```

#### 5.2.3 SprintContext 통합

`executeWorkflow()`의 `initialContext`에 `sprintContext`를 포함할 수 있도록 확장:

```typescript
// 기존 execute() 시그니처 유지, context에 sprintContext 전달
async execute(
  orgId: string,
  workflowId: string,
  initialContext?: Record<string, unknown>  // { sprintContext: SprintContext, ... }
): Promise<WorkflowExecution>
```

기존 `ExecutionContext.variables`에 `sprintContext`가 자동 포함되므로 추가 코드 변경 없이 조건 평가기에서 접근 가능해요.

---

## 6. UI/UX Design

### 6.1 F143 — TokensPage 확장

```
┌──────────────────────────────────────────────────────────┐
│ Token & Cost Management                                   │
├──────────────────────────────────────────────────────────┤
│ [Overview]  [Model Quality]  [Agent-Model Matrix]         │ ← 탭 추가
├──────────────────────────────────────────────────────────┤
│                                                           │
│  [Overview 탭 — 기존 유지]                                │
│  Total Cost: $X.XX | Period: 2026-03 | Models: N          │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │ By Model Chart │  │ By Agent Chart │                  │
│  └────────────────┘  └────────────────┘                  │
│                                                           │
│  [Model Quality 탭 — 신규]                                │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 모델별 성공률 바 차트 (수평)                        │    │
│  │ ████████████ claude-sonnet-4  90% (42 실행)       │    │
│  │ ██████████   gpt-4o          85% (28 실행)       │    │
│  │ ████████     gemini-pro      80% (15 실행)       │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌────────────────┐  ┌────────────────┐                  │
│  │ 평균 지연 비교 │  │ 비용 효율 비교 │                  │
│  └────────────────┘  └────────────────┘                  │
│                                                           │
│  [Agent-Model Matrix 탭 — 신규]                           │
│  ┌──────────────────────────────────────────────────┐    │
│  │        │ claude-s │ gpt-4o  │ gemini  │ ...      │    │
│  │ review │ $0.45    │ $0.32   │ —       │          │    │
│  │        │ 15 runs  │ 8 runs  │         │          │    │
│  │ codegen│ $0.80    │ $1.20   │ $0.55   │          │    │
│  │        │ 20 runs  │ 12 runs │ 8 runs  │          │    │
│  │ test   │ $0.25    │ —       │ $0.30   │          │    │
│  │        │ 7 runs   │         │ 5 runs  │          │    │
│  └──────────────────────────────────────────────────┘    │
│  비용 밀도 히트맵: 진한색 = 높은 비용, 연한색 = 낮은 비용  │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Component List

| Component | Location | Responsibility |
|-----------|----------|----------------|
| TokensPage (확장) | `packages/web/src/app/(app)/tokens/page.tsx` | 3-탭 레이아웃 + 데이터 fetching |
| ModelQualityChart | 인라인 (page.tsx 내) | 모델별 성공률 수평 바 차트 |
| AgentModelMatrix | 인라인 (page.tsx 내) | 에이전트×모델 히트맵 테이블 |

> 별도 컴포넌트 파일 생성 대신 page.tsx 내 섹션으로 구현 (기존 패턴 유지)

---

## 7. Error Handling

| 시나리오 | 코드 | 처리 |
|----------|------|------|
| model_execution_metrics 테이블 미존재 | 500 | migration 미적용 상태 → 빈 배열 반환 + 로그 |
| projectId 유효하지 않음 | 200 | 빈 metrics 반환 (FK 무시, 필터만 적용) |
| days 파라미터 범위 초과 (>365) | 400 | Zod 검증으로 제한 |
| 워크플로우 실행 중 조건 평가 오류 | — | catch → WorkflowExecution.error에 기록, status = "failed" |
| Sprint 템플릿 ID 미존재 | 400 | "Template not found" 에러 |

---

## 8. Test Plan

### 8.1 F143 — model-metrics.test.ts (12개+)

| # | 테스트 케이스 | 유형 |
|---|-------------|------|
| 1 | recordExecution — 성공 기록 | 단위 |
| 2 | recordExecution — 실패 기록 (status=failed) | 단위 |
| 3 | recordExecution — partial 기록 | 단위 |
| 4 | getModelQuality — 모델 2개 집계 | 단위 |
| 5 | getModelQuality — 빈 데이터 → 빈 배열 | 경계 |
| 6 | getModelQuality — days 필터 적용 | 단위 |
| 7 | getModelQuality — projectId 필터 적용 | 단위 |
| 8 | getModelQuality — successRate 계산 정확성 | 단위 |
| 9 | getModelQuality — tokenEfficiency 계산 (cost=0 방어) | 경계 |
| 10 | getAgentModelMatrix — 교차 집계 3×2 | 단위 |
| 11 | getAgentModelMatrix — 빈 데이터 | 경계 |
| 12 | GET /tokens/model-quality — route 통합 | 통합 |
| 13 | GET /tokens/agent-model-matrix — route 통합 | 통합 |

### 8.2 F142 — workflow-sprint.test.ts (10개+)

| # | 테스트 케이스 | 유형 |
|---|-------------|------|
| 1 | Sprint Standard 템플릿 구조 검증 (10노드, 11엣지) | 단위 |
| 2 | Sprint Fast 템플릿 구조 검증 (6노드, 6엣지) | 단위 |
| 3 | Sprint Review-Heavy 템플릿 구조 검증 (9노드, 11엣지) | 단위 |
| 4 | match_rate_met — threshold 90 통과 | 단위 |
| 5 | match_rate_met — threshold 미달 → false | 단위 |
| 6 | match_rate_met — sprintContext 커스텀 threshold | 단위 |
| 7 | test_coverage_met — 80% 이상 → true | 단위 |
| 8 | test_coverage_met — 80% 미만 → false | 단위 |
| 9 | peer_review_approved — reviewCount >= 1 → true | 단위 |
| 10 | peer_review_approved — reviewCount 0 → false | 단위 |
| 11 | GET /orgs/:orgId/workflows/sprint-templates — 3종 반환 | 통합 |
| 12 | POST execute — sprintContext 전달 확인 | 통합 |

---

## 9. Implementation Order

### Worker 1 (F143): 모델 비용/품질 대시보드

```
Step 1: 0021_model_metrics.sql 작성 + 로컬 적용
  [수정 파일] packages/api/src/db/migrations/0021_model_metrics.sql (신규)

Step 2: ModelMetricsService 구현
  [수정 파일] packages/api/src/services/model-metrics.ts (신규)

Step 3: Token Zod 스키마 확장
  [수정 파일] packages/api/src/schemas/token.ts

Step 4: Token routes 확장 (+2 endpoints)
  [수정 파일] packages/api/src/routes/token.ts

Step 5: 테스트 작성
  [수정 파일] packages/api/src/__tests__/model-metrics.test.ts (신규)

Step 6: TokensPage UI 확장
  [수정 파일] packages/web/src/app/(app)/tokens/page.tsx
```

### Worker 2 (F142): Sprint 워크플로우 템플릿

```
Step 1: Workflow Zod 스키마 확장
  [수정 파일] packages/api/src/schemas/workflow.ts

Step 2: WorkflowEngine 확장 — Sprint 템플릿 3종 + 조건 3종
  [수정 파일] packages/api/src/services/workflow-engine.ts

Step 3: Workflow routes 확장 (+1 endpoint)
  [수정 파일] packages/api/src/routes/workflow.ts

Step 4: 테스트 작성
  [수정 파일] packages/api/src/__tests__/workflow-sprint.test.ts (신규)
```

### 리더 (통합)

```
Step 7: typecheck + lint 전체 통과 확인
Step 8: 기존 583 API 테스트 회귀 확인
Step 9: D1 migration 0021 로컬 적용 검증
```

### 수정 파일 전체 목록

| # | 파일 | Worker | 변경 유형 |
|---|------|:------:|-----------|
| 1 | `packages/api/src/db/migrations/0021_model_metrics.sql` | W1 | 신규 |
| 2 | `packages/api/src/services/model-metrics.ts` | W1 | 신규 |
| 3 | `packages/api/src/schemas/token.ts` | W1 | 수정 |
| 4 | `packages/api/src/routes/token.ts` | W1 | 수정 |
| 5 | `packages/api/src/__tests__/model-metrics.test.ts` | W1 | 신규 |
| 6 | `packages/web/src/app/(app)/tokens/page.tsx` | W1 | 수정 |
| 7 | `packages/api/src/schemas/workflow.ts` | W2 | 수정 |
| 8 | `packages/api/src/services/workflow-engine.ts` | W2 | 수정 |
| 9 | `packages/api/src/routes/workflow.ts` | W2 | 수정 |
| 10 | `packages/api/src/__tests__/workflow-sprint.test.ts` | W2 | 신규 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-22 | Initial draft — F143+F142 상세 설계 | Sinclair Seo |
