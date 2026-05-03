---
id: FX-DESIGN-323
sprint: 323
feature: F576
status: approved
date: 2026-05-03
---

# Sprint 323 Design — F576: core/agent cleanup

## §1 목적

Phase 46 Strangler Fig 완결. fx-agent Worker가 모든 agent 기능을 독립 운영 중.
packages/api/src/core/agent/ (120 files)를 packages/api/src/agent/로 이전하여
core/ 도메인에서 agent를 분리하고, 불필요해진 app.ts 라우트 등록을 제거한다.

## §2 아키텍처 변경

### Before
```
packages/api/src/
  core/
    agent/          ← 120 files (routes, services, schemas, ...)
    discovery/
    harness/
    offering/
    shaping/
  app.ts           ← 8 agent routes still registered
```

### After
```
packages/api/src/
  agent/            ← 120 files (moved from core/agent)
  core/
    discovery/
    harness/
    offering/
    shaping/
  app.ts           ← agent routes 제거
```

fx-gateway는 이미 모든 agent 경로를 fx-agent Worker로 라우팅 중:
- `/api/agent-adapters/*`, `/api/agent-definitions/*`, `/api/command-registry/*`
- `/api/context-passthroughs/*`, `/api/execution-events`, `/api/meta/*`
- `/api/task-states/*`, `/api/orgs/:orgId/workflows`

## §3 TDD Red Target (면제 사유)

F576은 기능 추가가 아닌 코드 이전(reorganization)이므로 TDD Red Phase 면제.
기존 vitest 테스트가 이전 후 모두 PASS하는 것이 검증 기준.

## §4 단계별 실행 계획

### Step A: 디렉토리 이동
```bash
mkdir -p packages/api/src/agent
# Move all subdirectories
git mv packages/api/src/core/agent/services packages/api/src/agent/services
git mv packages/api/src/core/agent/schemas packages/api/src/agent/schemas
git mv packages/api/src/core/agent/routes packages/api/src/agent/routes
git mv packages/api/src/core/agent/orchestration packages/api/src/agent/orchestration
git mv packages/api/src/core/agent/runtime packages/api/src/agent/runtime
git mv packages/api/src/core/agent/streaming packages/api/src/agent/streaming
git mv packages/api/src/core/agent/specs packages/api/src/agent/specs
git mv packages/api/src/core/agent/index.ts packages/api/src/agent/index.ts
```

### Step B: packages/api/src/core/index.ts 갱신
```typescript
// Before: import from './agent/...'
// After: import from '../agent/...'
```

### Step C: Cross-domain imports in core/* 갱신
파일 목록 (~28개): discovery/services/*, harness/services/*, collection/services/*, offering/services/*, shaping/services/*
패턴: `from "../../agent/` → `from "../../../agent/`

### Step D: packages/api/src 하위 non-test 파일 갱신 (~18개)
| 파일 위치 | 변경 패턴 |
|----------|---------|
| src/middleware/*.ts | `../core/agent/` → `../agent/` |
| src/modules/*/routes/*.ts | `../../../core/agent/` → `../../../agent/` |
| src/modules/*/services/*.ts | `../../../core/agent/` → `../../../agent/` |
| src/routes/*.ts | `../core/agent/` → `../agent/` |
| src/services/*.ts | `../core/agent/` → `../agent/` |
| src/services/adapters/*.ts | `../../core/agent/` → `../../agent/` |

### Step E: app.ts 8 routes 제거
제거 대상: agentAdaptersRoute, agentDefinitionRoute, executionEventsRoute, taskStateRoute,
commandRegistryRoute, contextPassthroughRoute, workflowRoute, metaRoute
근거: fx-gateway가 이미 모든 경로를 fx-agent로 프록시 중. packages/api에서 이중 등록 불필요.

### Step F: Test file import 갱신 (~108개, packages/api/__tests__)
패턴: `from "../core/agent/` → `from "../agent/`

### Step G: 12 Route Integration Tests → fx-agent 이전
대상 파일:
- agent.test.ts
- agent-adapters-route.test.ts
- agent-definition-route.test.ts
- agent-routes-queue.test.ts
- command-registry-route.test.ts
- context-passthrough-route.test.ts
- execution-events-route.test.ts
- streaming.test.ts
- task-state-service.test.ts (route-facing test)
- orchestration-e2e.test.ts
- integration/meta-agent-full-loop.test.ts
- services/meta-approval.test.ts

Import path 갱신: `../core/agent/routes/X` → `../routes/X`
Helper path: `../helpers/test-app` → fx-agent 전용 mock env 사용

## §5 파일 매핑 (수정 파일 목록)

### packages/api/src — 이동
- `core/agent/**` (120 files) → `agent/**` (120 files)

### packages/api/src — import 갱신 (비테스트)
- `app.ts`
- `core/index.ts`
- `middleware/constraint-guard.ts`
- `modules/auth/routes/token.ts`
- `modules/gate/services/evaluation-criteria.ts`
- `modules/portal/routes/github.ts`
- `modules/portal/routes/inbox.ts`
- `modules/portal/routes/onboarding.ts`
- `modules/portal/routes/webhook.ts`
- `modules/portal/services/github-review.ts`
- `routes/help-agent.ts`
- `services/adapters/build-validator-adapter.ts`
- `services/adapters/claude-api-adapter.ts`
- `services/adapters/deploy-verifier-adapter.ts`
- `services/adapters/evaluator-optimizer-adapter.ts`
- `services/adapters/spec-checker-adapter.ts`
- `services/pr-pipeline.ts`
- `services/prd-generator.ts`
- `services/prototype-generator.ts`
- `core/collection/routes/collection.ts`
- `core/collection/services/insight-agent-service.ts`
- `core/discovery/routes/biz-items.ts`
- `core/discovery/routes/discovery-pipeline.ts`
- `core/discovery/routes/discovery-stage-runner.ts`
- `core/discovery/services/agent-collector.ts`
- `core/discovery/services/competitor-scanner.ts`
- `core/discovery/services/discovery-graph-service.ts`
- `core/discovery/services/item-classifier.ts`
- `core/discovery/services/stage-runner-service.ts`
- `core/discovery/services/starting-point-classifier.ts`
- `core/discovery/services/trend-data-service.ts`
- `core/harness/routes/mcp.ts`
- `core/harness/services/auto-fix.ts`
- `core/harness/services/auto-rebase.ts`
- `core/harness/services/custom-role-manager.ts`
- `core/harness/services/evaluator-optimizer.ts`
- `core/harness/services/pattern-extractor.ts`
- `core/harness/services/transition-trigger.ts`
- `core/offering/services/bp-prd-generator.ts`
- `core/offering/services/business-plan-generator.ts`
- `core/offering/services/prd-interview-service.ts`
- `core/offering/services/prd-review-pipeline.ts`
- `core/shaping/services/bd-skill-executor.ts`
- `core/shaping/services/biz-persona-evaluator.ts`
- `core/shaping/services/bmc-agent.ts`
- `core/shaping/services/bmc-insight-service.ts`
- `core/shaping/services/sixhats-debate.ts`

### packages/api/src/__tests__ — import 갱신
- ~108 test files: `from "../core/agent/` → `from "../agent/`

### packages/api/src/__tests__ — 삭제 (fx-agent로 이전)
- 12 route integration tests (위 §4 Step G 목록)

### packages/fx-agent/src/__tests__ — 신규 추가
- 12 route integration tests (import path 갱신 포함)
- helpers/test-app.ts (fx-agent 전용, 기존 mock-d1.ts 활용)

## §6 검증 계획

### 로컬 검증
```bash
turbo typecheck    # 19/19 PASS
turbo test         # all PASS
find packages/api/src/core/agent -type f | wc -l  # = 0
```

### Phase Exit P1~P4 (Smoke Reality)
- P1: KOAMI Dogfood Graph proposals ≥ 1건 (Discovery 실 호출)
- P2: dual_ai_reviews D1 INSERT ≥ 1건 (F553 GAP-1 효과)
- P3: fx-agent prod 15 routes 응답 확인
- P4: 회고 보고서 작성

## §7 위험 요소

| 위험 | 완화 |
|-----|------|
| Import 누락으로 typecheck 실패 | 단계적 실행 + sed 자동화 |
| 12 test 이전 후 helper 의존성 미해소 | fx-agent mock-d1.ts 확장 |
| app.ts routes 제거 후 직접 요청 실패 | 프로덕션은 gateway 경유, 테스트는 fx-agent로 이전 |
