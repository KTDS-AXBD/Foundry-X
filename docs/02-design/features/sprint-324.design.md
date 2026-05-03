---
id: FX-DESIGN-324
sprint: 324
feature: F577
req: FX-REQ-642
status: approved
date: 2026-05-03
---

# Sprint 324 Design — F577: packages/api/src/agent → fx-agent 실 이전

## §1 목표

`find packages/api/src/agent -type f | wc -l = 0` 달성.
Plan §3 P-a~P-i 9 항목 정량 PASS.

## §2 핵심 제약

- ESLint `no-cross-domain-import`: `core/` 경로 파일만 적용 → `services/agent/`는 적용 제외 (안전)
- packages/api는 @foundry-x/fx-agent를 workspace dep으로 갖지 않음 → 직접 import 불가
- packages/api 내부 45 non-test 파일이 agent/ 서비스를 runtime import 중 → packages/api 내에서 경로만 변경

## §3 이전 전략 4가지

| 전략 | 대상 | 결과 |
|------|------|------|
| **DELETE** | fx-agent에 동일본 + api 외부 사용처 없음 | packages/api/src/agent에서 삭제 |
| **MOVE-SVC** | packages/api 외부 사용처 있음 | packages/api/src/services/agent/ 로 이동 |
| **MOVE-FXA** | orchestration 7 + specs 8 | packages/fx-agent/src/ 로 이동 |
| **MOVE-SCHEMA** | schemas/mcp.ts + skill-guide.ts | packages/api/src/schemas/ 로 이동 |

## §A 서비스 분류표 (services 65)

> 기준: (1) fx-agent에 동일본 존재 여부, (2) packages/api 외부 사용처(45 files) 포함 여부

### Category DELETE (fx-agent 동일본 있음 + api 외부 사용처 없음) — 31 files
삭제 후 packages/api/src/agent/services/ 에서 제거

| # | 파일 |
|---|------|
| 1 | agent-adapter-registry.ts |
| 2 | agent-feedback-loop.ts |
| 3 | agent-marketplace.ts |
| 4 | agent-self-reflection.ts |
| 5 | architect-agent.ts |
| 6 | architect-prompts.ts |
| 7 | captured-review.ts |
| 8 | captured-skill-generator.ts |
| 9 | derived-review.ts |
| 10 | derived-skill-generator.ts |
| 11 | ensemble-voting.ts |
| 12 | execution-event-service.ts |
| 13 | fallback-chain.ts |
| 14 | infra-agent-prompts.ts |
| 15 | infra-agent.ts |
| 16 | model-comparisons.ts |
| 17 | orchestration-loop.ts |
| 18 | planner-agent.ts |
| 19 | planner-prompts.ts |
| 20 | prompt-utils.ts |
| 21 | proposal-apply.ts |
| 22 | qa-agent-prompts.ts |
| 23 | qa-agent.ts |
| 24 | security-agent-prompts.ts |
| 25 | security-agent.ts |
| 26 | skill-md-generator.ts |
| 27 | skill-search.ts |
| 28 | test-agent-prompts.ts |
| 29 | test-agent.ts |
| 30 | workflow-engine.ts |
| 31 | workflow-pattern-extractor.ts |

### Category MOVE-SVC (packages/api 외부 사용처 있음) — 26 files
→ `packages/api/src/services/agent/` 로 이동 (내부 relative import 유지)

| # | 파일 | api 외부 사용처 (요약) |
|---|------|---------------------|
| 1 | agent-runner.ts | 28개 files (createAgentRunner, AgentRunner) |
| 2 | execution-types.ts | 28개 files (AgentExecutionResult, AgentRunner 등) |
| 3 | agent-adapter-factory.ts | adapters/ 4개 |
| 4 | agent-collection.ts | collection/routes |
| 5 | agent-definition-loader.ts | harness/custom-role-manager |
| 6 | agent-inbox.ts | portal/routes/inbox, harness/auto-rebase |
| 7 | agent-orchestrator.ts | middleware/constraint-guard |
| 8 | claude-api-runner.ts | agent-runner 내부 dep |
| 9 | diagnostic-collector.ts | discovery/stage-runner-service, discovery-stage-runner route |
| 10 | external-ai-reviewer.ts | offering/prd-review-pipeline |
| 11 | help-agent-service.ts | routes/help-agent |
| 12 | meta-agent.ts | discovery/discovery-stage-runner route |
| 13 | meta-approval.ts | discovery/discovery-stage-runner route |
| 14 | mcp-adapter.ts | mcp-registry 내부 dep |
| 15 | mcp-registry.ts | harness/routes/mcp |
| 16 | mcp-resources.ts | harness/routes/mcp |
| 17 | mcp-runner.ts | harness/routes/mcp |
| 18 | mcp-sampling.ts | harness/routes/mcp |
| 19 | mcp-transport.ts | harness/routes/mcp |
| 20 | model-metrics.ts | modules/auth/routes/token |
| 21 | model-router.ts | shaping/bmc-agent, bmc-insight, collection/insight-agent |
| 22 | openrouter-runner.ts | agent-runner 내부 dep |
| 23 | openrouter-service.ts | routes/help-agent |
| 24 | prompt-gateway.ts | shaping/bd-skill-executor, bmc-agent, bmc-insight, collection/insight-agent |
| 25 | proposal-generator.ts | (cross-domain dep offering) |
| 26 | proposal-rubric.ts | discovery/discovery-stage-runner route |
| 27 | reviewer-agent.ts | portal/routes/webhook, github, github-review |
| 28 | skill-guide.ts | portal/routes/onboarding |
| 29 | skill-metrics.ts | shaping/bd-skill-executor |
| 30 | skill-pipeline-runner.ts | discovery/routes/discovery-pipeline |
| 31 | task-state-service.ts | harness/transition-trigger |

> **참고**: MOVE-SVC 카테고리 파일들은 services/agent/ 내부에서의 상호 relative import를 그대로 유지. 외부 사용처만 import path 갱신.

### Category ADD-TO-FXA (fx-agent에 없는 services ONLY_IN_API 8개 중 fx-agent 필요)
> agent-collection, external-ai-reviewer, help-agent-service, model-metrics, openrouter-service,
> proposal-generator, skill-guide, skill-pipeline-runner
> → fx-agent에도 추가 (향후 fx-agent에서 직접 사용 가능성)
> 단, packages/api 코드는 services/agent/에서 계속 사용

## §4 구현 순서 (8 Phase)

```
Phase 1: TDD Red — P-a~P-i 검증 테스트 작성
Phase 2: routes 15 삭제 (P-a)
Phase 3: schemas 13 삭제 + mcp/skill-guide → packages/api/src/schemas/ 이동
Phase 4: runtime 6 + streaming 3 삭제
Phase 5: services 31 삭제 (Category DELETE)
Phase 6: services 31→26(MOVE-SVC) 이동 → packages/api/src/services/agent/
Phase 7: orchestration 7 → fx-agent/src/orchestration/ + specs 8 → fx-agent/src/specs/
Phase 8: 90 tests → fx-agent/test/ (import path 갱신)
Phase 9: 45 external users import path 갱신 (agent/X → services/agent/X)
Phase 10: packages/api/src/agent git rm -rf (P-g)
Phase 11: 회귀 검증 (P-h)
Phase 12: Phase Exit Smoke Reality (P-i)
```

## §5 파일 매핑

### §5-1 삭제 대상
- `packages/api/src/agent/routes/*.ts` (15) → DELETE
- `packages/api/src/agent/runtime/*.ts` (6) → DELETE
- `packages/api/src/agent/streaming/*.ts` (3) → DELETE
- `packages/api/src/agent/schemas/` 13개 (mcp.ts, skill-guide.ts 제외) → DELETE
- `packages/api/src/agent/services/` Category DELETE 31개 → DELETE

### §5-2 이동 대상 (packages/api → packages/api/src/services/agent/)
- `packages/api/src/agent/services/*.ts` (MOVE-SVC 31개) → `packages/api/src/services/agent/*.ts`
- `packages/api/src/agent/schemas/mcp.ts` → `packages/api/src/schemas/mcp.ts`
- `packages/api/src/agent/schemas/skill-guide.ts` → `packages/api/src/schemas/skill-guide.ts`

### §5-3 이동 대상 (packages/api → packages/fx-agent/)
- `packages/api/src/agent/orchestration/*.ts` (7) → `packages/fx-agent/src/orchestration/*.ts`
- `packages/api/src/agent/specs/*.yaml` (8) → `packages/fx-agent/src/specs/*.yaml`

### §5-4 신규 생성
- `packages/api/src/services/agent/` directory (31 services)
- `packages/api/src/schemas/` directory 확장 (mcp.ts, skill-guide.ts)
- `packages/fx-agent/src/orchestration/` directory (7 files)
- `packages/fx-agent/src/specs/` directory (8 YAML)
- `packages/fx-agent/test/` directory (90 tests)

### §5-5 import path 갱신 대상
- 45 non-test external users: `agent/services/X` → `services/agent/X` or `schemas/X`
- 90 tests: → packages/fx-agent/test/, import from `../src/services/X` etc.
- orchestration 내부 relative imports: `../../services/X` → `../services/X`
- packages/fx-agent vitest config: include `test/**/*.test.ts`

## §6 테스트 계약 (TDD Red Target)

### Red 테스트: P-a~P-g verification (bash-based)
```typescript
// packages/fx-agent/test/f577-migration.test.ts
describe("F577 Migration — P-a through P-g", () => {
  it("P-a: agent/routes 0 files", () => { /* find count */ })
  it("P-b: 90 tests in fx-agent/test", () => { /* find count */ })
  it("P-c: agent/services 0 files", () => { /* find count */ })
  it("P-d: no external api/src users importing from agent/", () => { /* grep count */ })
  it("P-e: cross-domain deps 0", () => { /* grep count */ })
  it("P-f: orchestration/streaming/runtime/schemas/specs 0", () => { /* find count */ })
  it("P-g: agent dir 0 files total", () => { /* find count */ })
})
```

## §7 위험 완화

| 위험 | 완화 |
|------|------|
| MOVE-SVC internal deps (relative imports) | services/agent/ 폴더 내 상호 import는 그대로 유지 — 폴더 단위 이동이므로 internal relative path 불변 |
| orchestration → fx-agent cross-domain dep (discovery-graph.ts) | StageRunnerService interface는 이미 @foundry-x/shared에 contract type 있으면 사용, 없으면 인라인 타입으로 대체 |
| 90 tests fx-agent 이동 후 vitest config | packages/fx-agent/vitest.config.ts include에 `test/**/*.test.ts` 추가 |
| 45 external users import path 갱신 누락 | 갱신 후 `pnpm --filter @foundry-x/api typecheck` PASS 필수 |
