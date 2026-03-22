---
code: FX-PLAN-036
title: "Sprint 36 — 태스크별 모델 라우팅 + Evaluator-Optimizer 패턴 (F136+F137)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-36
sprint: 36
phase: "Phase 5a"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F136: 태스크별 모델 라우팅 + F137: Evaluator-Optimizer 패턴 |
| Sprint | 36 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — F135 OpenRouter Runner 후속) |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 모든 에이전트 태스크가 단일 모델(Sonnet)로 실행되어 비용 과다/품질 부족. 에이전트 출력이 첫 시도 품질에 의존하며 자동 개선 루프 없음 |
| **Solution** | F136: D1 routing_rules 테이블 + ModelRouter 서비스로 taskType별 최적 모델 자동 선택. F137: EvaluatorOptimizer 서비스로 생성→평가→개선 반복 루프 구현 |
| **Function UX Effect** | 복잡한 아키텍처 분석은 Opus, 단순 리뷰는 Haiku로 자동 배정. 코드 생성 후 자동 리뷰→개선으로 첫 PR 품질 향상 |
| **Core Value** | F143(메트릭 데이터) 기반 라우팅 최적화 + F142(Sprint 워크플로우) 품질 게이트 연동 토대 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F136 — 태스크별 모델 라우팅:**
- `model_routing_rules` D1 테이블 추가 (taskType별 모델 + 우선순위 + 비용 제한)
- `ModelRouter` 서비스 구현 (규칙 조회 → 모델 선택 → Runner 생성)
- `createRoutedRunner(env, taskType)` 팩토리 확장 — 기존 `createAgentRunner` 호환 유지
- `GET /agents/routing-rules` API — 현재 라우팅 규칙 조회
- `PUT /agents/routing-rules/:taskType` API — 태스크별 모델 설정 변경
- Agent Orchestrator 통합 — 기존 단일 Runner 대신 ModelRouter 사용

**F137 — Evaluator-Optimizer 패턴:**
- `EvaluatorOptimizer` 서비스 구현 (generate → evaluate → improve 루프)
- `EvaluationResult` 타입 — 품질 점수 + 개선 제안 + pass/fail 판정
- 최대 반복 횟수 (`maxIterations`, 기본 3) + 품질 임계값 (`qualityThreshold`, 기본 80)
- 평가 기준 플러그인 — code-review, test-coverage, spec-compliance 3종
- `POST /agents/evaluate-optimize` API — E-O 루프 실행 (비동기, SSE 진행 상황)
- WorkflowEngine 통합 — `evaluate_optimize` 액션 타입 추가

### 1.2 성공 기준

| 기준 | 목표 |
|------|------|
| F136 단위 테스트 | 15개+ 통과 |
| F137 단위 테스트 | 12개+ 통과 |
| 기존 테스트 회귀 | 0건 |
| typecheck + lint | 에러 0건 |
| D1 migration | 0022 작성 + 로컬 적용 |

### 1.3 비목표 (Non-Goals)

- 모델별 비용 한도 실시간 차단 (모니터링은 F143에서 수집, 차단은 후속)
- Fallback 체인 자동 전환 (F144 범위)
- 실제 LLM 호출 기반 E-O 루프 프로덕션 운용 (이번 Sprint은 인프라 + 단위 테스트)
- Web UI 변경 (라우팅 설정 UI는 후속 Sprint)
- 프로덕션 배포 (Sprint 35+36 합산 일괄 배포 예정)

---

## 2. 배경 (Context)

### 2.1 관련 문서

| 문서 | 참조 |
|------|------|
| Agent Evolution PRD | `docs/specs/agent-evolution/prd-final.md` §4.1 A2(F136), A3(F137) |
| 현재 Runner 팩토리 | `packages/api/src/services/agent-runner.ts` |
| OpenRouter Runner | `packages/api/src/services/openrouter-runner.ts` (F135) |
| Claude API Runner | `packages/api/src/services/claude-api-runner.ts` |
| Prompt Utils | `packages/api/src/services/prompt-utils.ts` (F135) |
| Execution Types | `packages/api/src/services/execution-types.ts` |
| Agent Orchestrator | `packages/api/src/services/agent-orchestrator.ts` |
| Workflow Engine | `packages/api/src/services/workflow-engine.ts` (F101+F142) |
| Model Metrics (S35) | `packages/api/src/services/model-metrics.ts` (F143) |

### 2.2 현재 상태 (As-Is)

**F136 — 모델 선택:**
```
createAgentRunner(env)
├── OPENROUTER_API_KEY 존재? → OpenRouterRunner(key, defaultModel)  // 단일 모델
├── ANTHROPIC_API_KEY 존재?  → ClaudeApiRunner(key)                 // claude-haiku
└── fallback                 → MockRunner()
```
- taskType 파라미터 없음 — 모든 태스크가 같은 모델로 실행
- OpenRouterRunner는 생성 시 model을 받지만, 호출 측에서 taskType→model 매핑 로직 없음
- `AgentRunner.supportsTaskType()` 인터페이스는 존재하나 실질적 분기에 사용 안 됨

**F137 — 출력 품질 관리:**
```
Agent Orchestrator
├── executeTask() → runner.execute(request) → 단일 실행, 결과 반환
├── parallel execution → 복수 에이전트 병렬 실행
└── 결과 품질 평가/개선 루프 없음

WorkflowEngine
├── CONDITION_EVALUATORS: analysis_passed, match_rate_met, ...
├── executeNode(): run_agent → placeholder (processed: true)
└── Evaluator-Optimizer 패턴 미구현
```

### 2.3 목표 상태 (To-Be)

**F136:**
```
model_routing_rules (D1 테이블)
├── task_type: "code-review" | "code-generation" | ...
├── model_id: "anthropic/claude-sonnet-4" | "anthropic/claude-haiku-4-5" | ...
├── priority: 1 (낮을수록 우선)
├── max_cost_per_call: 0.05 (USD, 선택)
└── enabled: boolean

ModelRouter (서비스)
├── getModelForTask(taskType) → model_id
├── createRunnerForTask(env, taskType) → AgentRunner (모델 주입)
├── listRules() → 전체 라우팅 규칙
└── updateRule(taskType, model_id, ...) → 규칙 갱신

createRoutedRunner(env, taskType)  // 신규 팩토리
├── ModelRouter.getModelForTask(taskType)
├── D1 규칙 없으면 → DEFAULT_MODEL_MAP 폴백
└── OpenRouterRunner(key, selectedModel) 반환
```

**F137:**
```
EvaluatorOptimizer (서비스)
├── run(request, config) → EvaluationLoopResult
│   ├── Step 1: generator.execute(request)     — 생성
│   ├── Step 2: evaluator.evaluate(result)     — 평가 (점수 + 피드백)
│   ├── Step 3: if score < threshold           — 개선 필요?
│   │   ├── optimizer.improve(result, feedback) — 개선 실행
│   │   └── goto Step 2 (반복, maxIterations)
│   └── Step 4: 최종 결과 반환 (iterations, finalScore, history)
│
├── EvaluationCriteria (플러그인)
│   ├── CodeReviewCriteria: 코드 품질 + 컨벤션 + 보안
│   ├── TestCoverageCriteria: 테스트 커버리지 + 엣지 케이스
│   └── SpecComplianceCriteria: 스펙 충족도 + 누락 항목
│
└── WorkflowEngine 통합
    └── actionType: "evaluate_optimize" → EvaluatorOptimizer.run()
```

---

## 3. 구현 계획 (Implementation Plan)

### 3.1 파일 변경 목록

#### F136 — 태스크별 모델 라우팅

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 1 | `packages/api/src/db/migrations/0022_model_routing.sql` | 신규 | model_routing_rules 테이블 + 기본 시드 데이터 |
| 2 | `packages/api/src/services/model-router.ts` | 신규 | ModelRouter 서비스 — 규칙 조회/갱신 + 모델 선택 |
| 3 | `packages/api/src/services/agent-runner.ts` | 수정 | `createRoutedRunner()` 팩토리 추가 (기존 `createAgentRunner` 유지) |
| 4 | `packages/api/src/routes/agent.ts` | 수정 | 2개 엔드포인트 추가 (GET/PUT routing-rules) |
| 5 | `packages/api/src/schemas/agent.ts` | 수정 | RoutingRule 요청/응답 스키마 |
| 6 | `packages/api/src/__tests__/model-router.test.ts` | 신규 | ModelRouter 단위 테스트 15개+ |

#### F137 — Evaluator-Optimizer 패턴

| # | 파일 | 변경 유형 | 설명 |
|---|------|-----------|------|
| 7 | `packages/api/src/services/evaluator-optimizer.ts` | 신규 | EvaluatorOptimizer 서비스 + EvaluationCriteria 인터페이스 |
| 8 | `packages/api/src/services/evaluation-criteria.ts` | 신규 | 3종 평가 기준 플러그인 |
| 9 | `packages/api/src/routes/agent.ts` | 수정 | POST /agents/evaluate-optimize 엔드포인트 |
| 10 | `packages/api/src/schemas/agent.ts` | 수정 | EvaluationConfig + EvaluationResult 스키마 |
| 11 | `packages/api/src/services/workflow-engine.ts` | 수정 | evaluate_optimize 액션 타입 추가 |
| 12 | `packages/api/src/__tests__/evaluator-optimizer.test.ts` | 신규 | E-O 루프 단위 테스트 12개+ |

### 3.2 구현 순서 (Agent Team 2-Worker 병렬)

```
Worker 1 (F136): 태스크별 모델 라우팅
  Step 1: D1 migration 0022 — model_routing_rules 테이블 + 시드
  Step 2: ModelRouter 서비스 (getModelForTask, listRules, updateRule)
  Step 3: agent-runner.ts — createRoutedRunner() 팩토리 추가
  Step 4: agent.ts schemas — RoutingRuleSchema 추가
  Step 5: agent.ts routes — GET/PUT /agents/routing-rules
  Step 6: model-router.test.ts — 15개+ 테스트

Worker 2 (F137): Evaluator-Optimizer 패턴
  Step 1: evaluation-criteria.ts — 3종 평가 기준 플러그인
  Step 2: evaluator-optimizer.ts — E-O 루프 서비스
  Step 3: agent.ts schemas — EvaluationConfig/Result 스키마
  Step 4: agent.ts routes — POST /agents/evaluate-optimize
  Step 5: workflow-engine.ts — evaluate_optimize 액션
  Step 6: evaluator-optimizer.test.ts — 12개+ 테스트

리더:
  Step 1: Worker 완료 후 통합 검증 (typecheck + lint + test)
  Step 2: Agent Orchestrator 통합 — createRoutedRunner 연결
  Step 3: PDCA 분석 (gap-detector)
```

### 3.3 병렬 가능 분석

| 요소 | W1 (F136) | W2 (F137) | 충돌 |
|------|:---------:|:---------:|:----:|
| agent-runner.ts | ✅ 수정 | — | 없음 |
| model-router.ts | ✅ 신규 | — | 없음 |
| evaluator-optimizer.ts | — | ✅ 신규 | 없음 |
| evaluation-criteria.ts | — | ✅ 신규 | 없음 |
| agent.ts routes | ✅ 추가 | ✅ 추가 | ⚠️ 같은 파일 — 서로 다른 위치에 엔드포인트 추가, 리더가 merge |
| agent.ts schemas | ✅ 추가 | ✅ 추가 | ⚠️ 같은 파일 — 서로 다른 스키마 추가, 리더가 merge |
| workflow-engine.ts | — | ✅ 수정 | 없음 (S35가 먼저 완료되어야 함) |

**충돌 전략**: `agent.ts` routes/schemas에서 W1과 W2가 각각 다른 엔드포인트/스키마를 추가하므로, 리더가 Step 2에서 수동 merge. 또는 W2의 agent.ts 수정을 리더 Step에서 처리.

---

## 4. 기술 설계 요약

### 4.1 F136 — model_routing_rules 테이블

```sql
CREATE TABLE IF NOT EXISTS model_routing_rules (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,           -- AgentTaskType
  model_id TEXT NOT NULL,            -- e.g., "anthropic/claude-sonnet-4"
  runner_type TEXT NOT NULL DEFAULT 'openrouter',  -- "openrouter" | "claude" | "mock"
  priority INTEGER NOT NULL DEFAULT 1,  -- 낮을수록 우선
  max_cost_per_call REAL,            -- USD 상한 (nullable = 무제한)
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_type, model_id)
);

-- 기본 시드: taskType별 최적 모델 배정
INSERT INTO model_routing_rules (id, task_type, model_id, runner_type, priority) VALUES
  ('mrr_01', 'code-review',       'anthropic/claude-sonnet-4',    'openrouter', 1),
  ('mrr_02', 'code-generation',   'anthropic/claude-sonnet-4',    'openrouter', 1),
  ('mrr_03', 'spec-analysis',     'anthropic/claude-opus-4',      'openrouter', 1),
  ('mrr_04', 'test-generation',   'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_05', 'policy-evaluation', 'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_06', 'skill-query',       'anthropic/claude-haiku-4-5',   'openrouter', 1),
  ('mrr_07', 'ontology-lookup',   'anthropic/claude-haiku-4-5',   'openrouter', 1);
```

### 4.2 F136 — ModelRouter 핵심 인터페이스

```typescript
interface RoutingRule {
  id: string;
  taskType: AgentTaskType;
  modelId: string;
  runnerType: AgentRunnerType;
  priority: number;
  maxCostPerCall: number | null;
  enabled: boolean;
}

interface ModelRouter {
  getModelForTask(taskType: AgentTaskType): Promise<RoutingRule>;
  listRules(): Promise<RoutingRule[]>;
  updateRule(taskType: AgentTaskType, patch: Partial<RoutingRule>): Promise<RoutingRule>;
}
```

### 4.3 F137 — EvaluatorOptimizer 핵심 인터페이스

```typescript
interface EvaluationCriteria {
  name: string;
  evaluate(result: AgentExecutionResult, request: AgentExecutionRequest): EvaluationScore;
}

interface EvaluationScore {
  score: number;        // 0-100
  passed: boolean;      // score >= threshold
  feedback: string[];   // 개선 제안
  details: Record<string, unknown>;
}

interface EvaluatorOptimizerConfig {
  maxIterations: number;      // 기본 3
  qualityThreshold: number;   // 기본 80
  criteria: EvaluationCriteria[];
  generatorRunner: AgentRunner;
  evaluatorRunner?: AgentRunner;  // 미지정 시 generatorRunner 재사용
}

interface EvaluationLoopResult {
  finalResult: AgentExecutionResult;
  finalScore: number;
  iterations: number;
  history: Array<{
    iteration: number;
    result: AgentExecutionResult;
    score: EvaluationScore;
  }>;
  converged: boolean;  // threshold 도달 여부
}
```

### 4.4 DEFAULT_MODEL_MAP (D1 규칙 없을 때 폴백)

```typescript
const DEFAULT_MODEL_MAP: Record<AgentTaskType, string> = {
  "code-review":       "anthropic/claude-sonnet-4",
  "code-generation":   "anthropic/claude-sonnet-4",
  "spec-analysis":     "anthropic/claude-opus-4",
  "test-generation":   "anthropic/claude-haiku-4-5",
  "policy-evaluation": "anthropic/claude-haiku-4-5",
  "skill-query":       "anthropic/claude-haiku-4-5",
  "ontology-lookup":   "anthropic/claude-haiku-4-5",
};
```

**라우팅 원칙:**
- 복잡한 분석/설계 → Opus (비용 높지만 품질 중요)
- 코드 생성/리뷰 → Sonnet (비용/품질 균형)
- 단순 조회/평가 → Haiku (속도 + 비용 최적)

---

## 5. 테스트 계획

### F136 테스트 (model-router.test.ts, 15개+)

| # | 테스트 | 카테고리 |
|---|--------|----------|
| 1 | getModelForTask — 규칙 존재 시 최우선 모델 반환 | Happy path |
| 2 | getModelForTask — 규칙 없으면 DEFAULT_MODEL_MAP 폴백 | Fallback |
| 3 | getModelForTask — 비활성(enabled=false) 규칙 건너뜀 | Filter |
| 4 | getModelForTask — priority 순서 정렬 | Sorting |
| 5 | listRules — 전체 규칙 조회 | CRUD |
| 6 | updateRule — 모델 변경 | CRUD |
| 7 | updateRule — 존재하지 않는 taskType → 에러 | Edge case |
| 8 | createRoutedRunner — OpenRouter 키 + 라우팅 규칙 → 올바른 모델의 Runner | Integration |
| 9 | createRoutedRunner — OpenRouter 키 없으면 Claude Runner 폴백 | Fallback |
| 10 | createRoutedRunner — 두 키 다 없으면 MockRunner | Fallback |
| 11 | GET /agents/routing-rules — 200 + 규칙 배열 | API |
| 12 | PUT /agents/routing-rules/:taskType — 모델 변경 200 | API |
| 13 | PUT /agents/routing-rules/:taskType — 잘못된 taskType 400 | API |
| 14 | PUT /agents/routing-rules/:taskType — 인증 없음 401 | API |
| 15 | 기존 createAgentRunner 호환성 — 기존 호출 방식 미파괴 | Regression |

### F137 테스트 (evaluator-optimizer.test.ts, 12개+)

| # | 테스트 | 카테고리 |
|---|--------|----------|
| 1 | 첫 시도에 threshold 통과 → 1회 반복 후 종료 | Happy path |
| 2 | 3회 반복 후 threshold 도달 → converged=true | Loop |
| 3 | maxIterations 도달 → converged=false, 최선 결과 반환 | Limit |
| 4 | CodeReviewCriteria — 리뷰 코멘트 기반 점수 계산 | Criteria |
| 5 | TestCoverageCriteria — 테스트 커버리지 점수 계산 | Criteria |
| 6 | SpecComplianceCriteria — 스펙 충족도 점수 계산 | Criteria |
| 7 | 복수 criteria 가중 평균 | Criteria |
| 8 | evaluator와 generator가 다른 Runner → 모델 분리 | Config |
| 9 | POST /agents/evaluate-optimize — 200 + 루프 결과 | API |
| 10 | POST /agents/evaluate-optimize — 잘못된 config 400 | API |
| 11 | WorkflowEngine evaluate_optimize 액션 실행 | Integration |
| 12 | history 배열에 각 반복 결과 + 점수 기록 | Output |

---

## 6. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Sprint 35(F142/F143) 미완료 시 workflow-engine 충돌 | W2의 Step 5 차단 | W2는 workflow-engine 수정을 마지막 Step으로 배치, S35 완료 대기 가능 |
| agent.ts routes/schemas 양쪽 Worker 동시 수정 | Merge 충돌 | 리더가 수동 merge, 또는 W2의 agent.ts 수정은 리더 Step에서 처리 |
| E-O 루프 무한 반복 | 리소스 낭비 | maxIterations 하드 리밋 (최대 5) + timeout 30초 |
| D1 migration 번호 충돌 (S35=0021, S36=0022) | 마이그레이션 순서 | S35 먼저 완료 확인 후 0022 적용 |
