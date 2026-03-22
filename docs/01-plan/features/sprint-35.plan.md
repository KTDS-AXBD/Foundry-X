---
code: FX-PLAN-035
title: "Sprint 35 — 모델 비용/품질 대시보드 + Sprint 워크플로우 템플릿 (F143+F142)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-35
sprint: 35
phase: "Phase 5a"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F143: 모델 비용/품질 대시보드 + F142: Sprint 워크플로우 템플릿 |
| Sprint | 35 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — F135와 병렬) |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트 실행 시 모델별 비용·품질·지연 데이터가 집계되지 않아 최적화 근거 부재. Sprint 워크플로우가 수동 관리여서 반복 가능한 자동화 파이프라인이 없음 |
| **Solution** | F143: 기존 token_usage 인프라를 확장해 모델별 품질 메트릭 수집 + 교차 분석 대시보드. F142: 워크플로우 엔진에 Sprint 전용 7단계 DAG 템플릿 3종 추가 |
| **Function UX Effect** | 대시보드에서 모델별 성공률·비용·지연 한눈에 비교 가능. Sprint 시작 시 템플릿 선택으로 자동 워크플로우 생성 |
| **Core Value** | F136(모델 라우팅) 데이터 기반 의사결정 토대 + F137(Evaluator-Optimizer) 품질 게이트 연동 기반 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F143 — 모델 비용/품질 대시보드:**
- `model_execution_metrics` D1 테이블 추가 (모델별 성공/실패/지연/토큰)
- `GET /tokens/model-quality` API — 모델별 품질 메트릭 조회
- `GET /tokens/agent-model-matrix` API — 에이전트×모델 교차 분석
- Web 대시보드 확장: Model Quality 탭 + Agent-Model 히트맵

**F142 — Sprint 워크플로우 템플릿:**
- Sprint 전용 워크플로우 템플릿 3종 (Standard, Fast, Review-Heavy)
- `sprint_context` 변수 체계 (sprint_id, phase, feature_id, due_date)
- `quality_gate` 조건 평가기 추가 (match_rate, test_coverage, peer_review)
- `GET /orgs/:orgId/workflows/sprint-templates` API

### 1.2 성공 기준

| 기준 | 목표 |
|------|------|
| F143 단위 테스트 | 12개+ 통과 |
| F142 단위 테스트 | 10개+ 통과 |
| 기존 테스트 회귀 | 0건 |
| typecheck + lint | 에러 0건 |
| D1 migration | 0021 작성 + 로컬 적용 |

### 1.3 비목표 (Non-Goals)

- 실시간 비용 알림/예산 제한 (후속 Sprint)
- Evaluator-Optimizer 실 연동 (F137 범위)
- 워크플로우 액션의 실제 에이전트 호출 연결 (F135 완료 후 Sprint 36+)
- 프로덕션 배포 (F135와 합쳐서 Sprint 36에서 일괄 배포)

---

## 2. 배경 (Context)

### 2.1 관련 문서

| 문서 | 참조 |
|------|------|
| Agent Evolution PRD | `docs/specs/agent-evolution/prd-final.md` §4.1 A9, A8 |
| 기존 Token Routes | `packages/api/src/routes/token.ts` |
| KPI Logger | `packages/api/src/services/kpi-logger.ts` |
| Workflow Engine | `packages/api/src/services/workflow-engine.ts` |
| Execution Types | `packages/api/src/services/execution-types.ts` |
| Phase 5 로드맵 | SPEC.md §5 Phase 5 Agent Evolution |

### 2.2 현재 상태 (As-Is)

**F143 — 토큰/비용 추적:**
```
token_usage 테이블
├── /tokens/summary   — byModel, byAgent 집계
├── /tokens/usage     — 최근 20건 레코드
└── TokensPage (Web)  — Total Cost + 모델별/에이전트별 차트

KpiLogger
├── logEvent(agent_task, ...) — 단순 이벤트 기록
├── getSummary() — 이벤트 유형별 카운트
└── getTrends() — 일별 트렌드 (pageViews, apiCalls, agentTasks)
```
- 모델별 성공률, 평균 지연, 토큰 효율 미추적
- 에이전트×모델 교차 분석 불가

**F142 — 워크플로우:**
```
workflow-engine.ts
├── WORKFLOW_TEMPLATES (3종)
│   ├── PR Review Pipeline: trigger→review→approval→end
│   ├── Codebase Analysis: trigger→analyze→notify→end
│   └── Auto PR Creation: trigger→agent→check→pr→end
├── executeWorkflow() — DAG 순회 + 조건 평가
│   └── 액션 실행: stub (processed: true 반환)
└── CONDITION_EVALUATORS (4종)
    ├── approval_granted / analysis_passed / pr_merged / always
```
- Sprint 전용 템플릿 없음
- 품질 게이트 조건 3종(match_rate, coverage, peer_review) 미지원
- Sprint 컨텍스트 변수 체계 없음

### 2.3 목표 상태 (To-Be)

**F143:**
```
model_execution_metrics 테이블 (신규)
├── /tokens/summary          — 기존 유지
├── /tokens/model-quality    — 모델별 성공률, 평균 지연, 비용 효율
├── /tokens/agent-model-matrix — 에이전트×모델 교차 집계
└── TokensPage (Web) 확장
    ├── 기존: Total Cost + 모델별 차트
    ├── 신규: Model Quality 탭 (성공률 바 차트 + 지연 비교)
    └── 신규: Agent-Model 히트맵 (비용 밀도)
```

**F142:**
```
workflow-engine.ts 확장
├── WORKFLOW_TEMPLATES (3종 기존 + 3종 Sprint 전용)
│   ├── Sprint Standard: think→plan→build→review→test→ship→reflect
│   ├── Sprint Fast: plan→build→test→ship
│   └── Sprint Review-Heavy: plan→build→review→review2→test→ship
├── CONDITION_EVALUATORS 확장 (4종 기존 + 3종 신규)
│   ├── match_rate_met: matchRate >= threshold
│   ├── test_coverage_met: coverage >= threshold
│   └── peer_review_approved: reviewCount >= requiredReviews
└── sprint_context: { sprint_id, phase, feature_id, due_date, assignee }
```

---

## 3. 구현 계획 (Implementation Plan)

### 3.1 파일 변경 목록

#### F143 — 모델 비용/품질 대시보드

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 1 | `packages/api/src/db/migrations/0021_model_metrics.sql` | 신규 | model_execution_metrics 테이블 |
| 2 | `packages/api/src/services/model-metrics.ts` | 신규 | ModelMetricsService — 메트릭 수집 + 집계 |
| 3 | `packages/api/src/routes/token.ts` | 수정 | 2개 엔드포인트 추가 (model-quality, agent-model-matrix) |
| 4 | `packages/api/src/schemas/token.ts` | 수정 | 응답 스키마 추가 |
| 5 | `packages/web/src/app/(app)/tokens/page.tsx` | 수정 | Model Quality 탭 + 히트맵 UI |
| 6 | `packages/api/src/__tests__/model-metrics.test.ts` | 신규 | 단위 테스트 12개+ |

#### F142 — Sprint 워크플로우 템플릿

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 7 | `packages/api/src/services/workflow-engine.ts` | 수정 | Sprint 템플릿 3종 + 조건 평가기 3종 + sprint_context |
| 8 | `packages/api/src/routes/workflow.ts` | 수정 | sprint-templates 엔드포인트 추가 |
| 9 | `packages/api/src/schemas/workflow.ts` | 수정 | SprintContext + SprintTemplate 스키마 |
| 10 | `packages/api/src/__tests__/workflow-sprint.test.ts` | 신규 | Sprint 워크플로우 테스트 10개+ |

### 3.2 구현 순서 (Agent Team 병렬)

```
Worker 1 (F143): 모델 비용/품질 대시보드
  Step 1: D1 migration 0021 — model_execution_metrics 테이블
  Step 2: ModelMetricsService 구현 (recordExecution, getModelQuality, getAgentModelMatrix)
  Step 3: token.ts routes 확장 (2 endpoints)
  Step 4: token.ts schema 확장
  Step 5: model-metrics.test.ts 작성 (12개+)
  Step 6: TokensPage UI 확장 (Model Quality 탭 + 히트맵)

Worker 2 (F142): Sprint 워크플로우 템플릿
  Step 1: workflow-engine.ts — Sprint 템플릿 3종 추가
  Step 2: workflow-engine.ts — 조건 평가기 3종 추가
  Step 3: workflow-engine.ts — sprint_context 변수 체계
  Step 4: workflow.ts routes — sprint-templates 엔드포인트
  Step 5: workflow.ts schema 확장
  Step 6: workflow-sprint.test.ts 작성 (10개+)

리더 (통합):
  Step 7: typecheck + lint + 기존 테스트 회귀 확인
  Step 8: D1 migration 로컬 적용 검증
```

### 3.3 F143 상세 설계

**D1 migration 0021:**
```sql
CREATE TABLE model_execution_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',  -- success | partial | failed
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_model_metrics_model ON model_execution_metrics(model);
CREATE INDEX idx_model_metrics_project ON model_execution_metrics(project_id);
CREATE INDEX idx_model_metrics_recorded ON model_execution_metrics(recorded_at);
```

**ModelMetricsService API:**
```typescript
interface ModelQualityMetric {
  model: string;
  totalExecutions: number;
  successRate: number;       // 0~1
  avgDurationMs: number;
  avgCostUsd: number;
  tokenEfficiency: number;   // output_tokens / cost_usd
}

interface AgentModelCell {
  agentName: string;
  model: string;
  executions: number;
  totalCost: number;
  avgDuration: number;
  successRate: number;
}
```

**API 엔드포인트:**
| Method | Path | 설명 |
|--------|------|------|
| GET | `/tokens/model-quality?projectId=&days=30` | 모델별 품질 메트릭 |
| GET | `/tokens/agent-model-matrix?projectId=&days=30` | 에이전트×모델 교차 분석 |

### 3.4 F142 상세 설계

**Sprint 워크플로우 템플릿 3종:**

| 템플릿 | 노드 | 용도 |
|--------|------|------|
| Sprint Standard | think→plan→build→review→test→ship→reflect (7노드) | 일반 스프린트, 모든 단계 포함 |
| Sprint Fast | plan→build→test→ship (4노드) | 긴급/핫픽스, 최소 단계 |
| Sprint Review-Heavy | plan→build→review→peer_review→test→ship (6노드) | 중요 기능, 이중 리뷰 |

**Sprint Context 변수:**
```typescript
interface SprintContext {
  sprint_id: string;      // e.g., "sprint-35"
  phase: string;          // e.g., "Phase 5a"
  feature_ids: string[];  // e.g., ["F143", "F142"]
  due_date?: string;      // ISO 8601
  assignee?: string;
  quality_threshold?: number;  // 기본 90
}
```

**조건 평가기 추가:**
```typescript
// 기존 4종 + 신규 3종
match_rate_met:    (ctx) => ctx.lastResult?.matchRate >= (ctx.sprintContext?.quality_threshold ?? 90)
test_coverage_met: (ctx) => ctx.lastResult?.coverage >= 80
peer_review_approved: (ctx) => (ctx.lastResult?.reviewCount ?? 0) >= 1
```

---

## 4. 리스크 및 의존성

### 4.1 리스크

| # | 리스크 | 영향도 | 대응 |
|---|--------|--------|------|
| R1 | F143 데이터가 F135(OpenRouter) 완료 전에는 테스트 데이터만 존재 | 낮음 | MockRunner 기반 테스트 데이터로 대시보드 검증, F135 완료 후 실데이터 전환 |
| R2 | 다른 pane의 F135가 execution-types.ts를 수정 중 → 충돌 가능 | 중간 | F143은 execution-types.ts를 읽기만 함 (import), 수정하지 않음. model-metrics.ts 별도 파일 |
| R3 | Sprint 워크플로우 액션이 stub 상태 → 실행 검증 불가 | 낮음 | 템플릿 구조 + 조건 평가 로직만 테스트, 실 액션 연동은 F135+F137 이후 |

### 4.2 의존성

| 의존 | 상태 | 비고 |
|------|------|------|
| token_usage 테이블 | ✅ 존재 | 기존 마이그레이션 |
| workflow-engine.ts | ✅ 존재 | DAG 실행 엔진 + 3 템플릿 |
| KpiLogger | ✅ 존재 | agent_task 이벤트 기록 |
| AgentExecutionResult | ✅ 존재 | tokensUsed, model, duration, status |
| F135 (OpenRouter) | 🔧 진행 중 (다른 pane) | 파일 충돌 없음 — 별도 모듈 |

### 4.3 F135 병렬 안전성

| F143/F142 수정 파일 | F135 수정 파일 | 충돌 |
|---------------------|----------------|:----:|
| routes/token.ts | — | ✅ 안전 |
| services/model-metrics.ts (신규) | services/openrouter-runner.ts (신규) | ✅ 안전 |
| services/workflow-engine.ts | services/agent-runner.ts | ✅ 안전 |
| schemas/token.ts | services/execution-types.ts | ✅ 안전 |
| db/migrations/0021_*.sql | — | ✅ 안전 |

---

## 5. 체크리스트

### F143 — 모델 비용/품질 대시보드
- [ ] `0021_model_metrics.sql` — model_execution_metrics 테이블 + 인덱스 3개
- [ ] `model-metrics.ts` — ModelMetricsService 구현
  - [ ] recordExecution() — 실행 결과 기록
  - [ ] getModelQuality() — 모델별 품질 집계
  - [ ] getAgentModelMatrix() — 에이전트×모델 교차 분석
- [ ] `routes/token.ts` — 2개 엔드포인트 추가
- [ ] `schemas/token.ts` — ModelQualityMetric + AgentModelCell 스키마
- [ ] `model-metrics.test.ts` — 단위 테스트 12개+
- [ ] `TokensPage` — Model Quality 탭 + 히트맵 UI (선택적)

### F142 — Sprint 워크플로우 템플릿
- [ ] `workflow-engine.ts` — Sprint 템플릿 3종 추가 (Standard, Fast, Review-Heavy)
- [ ] `workflow-engine.ts` — 조건 평가기 3종 추가 (match_rate_met, test_coverage_met, peer_review_approved)
- [ ] `workflow-engine.ts` — SprintContext 변수 체계
- [ ] `routes/workflow.ts` — sprint-templates 엔드포인트
- [ ] `schemas/workflow.ts` — SprintContext + SprintTemplate 스키마
- [ ] `workflow-sprint.test.ts` — 단위 테스트 10개+

### 통합
- [ ] typecheck 통과 (에러 0건)
- [ ] lint 통과
- [ ] 기존 API 테스트 583개 회귀 없음
- [ ] D1 migration 0021 로컬 적용 검증
