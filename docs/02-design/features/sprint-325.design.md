---
id: FX-DESIGN-325
sprint: 325
feature: F578
req: FX-REQ-645
status: approved
date: 2026-05-03
---

# Sprint 325 Design — F578: api/services/agent 44 files 분류 + 부분 이전

## §1 목표

`packages/api/src/services/agent/` 44 files를 3분류(즉시 이전/contract 추출 후 후속/잔존 인정)하여 가능한 만큼 제거하고, 잔존 사유를 명문화한다.

## §2 배경 분석

### 구조 파악

F577(Sprint 324) autopilot이 cross-package binding 회피를 위해 `packages/api/src/services/agent/`에 44 files를 생성했다. 이 중:

- **36 files**: fx-agent/src/services/에 동일 파일 존재 (중복)
- **8 files**: api 전용 (agent-collection, agent, graph-engine, graphs/discovery-graph, model-metrics, proposal-generator, skill-pipeline-runner, task-state)

### 외부 사용처 측정 결과

| 항목 | 측정값 |
|------|--------|
| M1 api/services/agent total files | 44 |
| M2 외부 prod 사용처 파일 수 | 44 (grep 기준, 실제 per-file 측정 필요) |
| M3 __tests__ 사용처 | 16 |
| M4 cross-domain dep (core/*, modules/*) | 15 lines |
| M5 fx-agent → api/services/agent import | 0 (fx-agent는 자체 services/ 사용) |

### 핵심 인사이트

fx-agent는 api/services/agent를 import하지 않는다. 두 패키지는 각자 독립된 services/ 디렉토리를 갖는다. 즉 "이전"의 실제 의미는:
- api/services/agent에서 파일 삭제 (사용처가 없거나 fx-agent가 대신 처리하므로)
- 또는 스텁으로 교체 (api/core/*의 import 경로 유지하면서 구현 제거)

## §3 분류 기준

| 분류 | 기준 | 조치 |
|------|------|------|
| **(i) 즉시 제거** | prod 사용처 0건 + 또는 only test callers | 삭제, test 업데이트 |
| **(ii) contract 추출 후 후속** | cross-domain dep ≥ 1 AND 다수 외부 사용처 | F579 등록, shared-contracts 추출 |
| **(iii) main-api 잔존** | api/core/* 도메인 필수 사용 OR api 전용 기능 | ESLint 예외 등록, 사유 명시 |

## §A 44 Files 분류표

| # | 파일명 | cross_dep | ext_prod_callers | fx-agent | 분류 | 조치/사유 |
|---|--------|-----------|-----------------|---------|------|----------|
| 1 | agent-adapter-factory.ts | 1 | 5 (services/adapters) | ✅ | (iii) | adapters 패턴의 팩토리, api 도메인 고유 cross-dep |
| 2 | agent-collection.ts | 0 | 1 (core/collection) | ❌ | (iii) | api-only, core/collection 스케줄 수집 |
| 3 | agent-definition-loader.ts | 0 | 1 (core/harness) | ✅ | (i) | cross_dep=0, fx-agent 보유, 단일 caller stub 가능. **Future sprint** |
| 4 | agent-inbox.ts | 0 | 2 (core/harness+portal) | ✅ | (i) | cross_dep=0, fx-agent 보유. **Future sprint** |
| 5 | agent-orchestrator.ts | 2 | 1 (middleware) | ✅ | (ii) | cross_dep=2 (harness deps), middleware 의존성 → contract 추출 필요 |
| 6 | agent-runner.ts | 0 | 34+ (core/discovery, shaping, harness, offering) | ✅ | (iii) | 가장 많은 사용처, api/core/* 전반의 핵심 인터페이스 |
| 7 | agent.ts | 1 | 43+ (core/*, modules/*, services/*) | ❌ | (iii) | api 라우트 핸들러(Custom Role CRUD), cross_dep=1, api-only |
| 8 | architect-agent.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 9 | claude-api-runner.ts | 0 | 1 (services/adapters) | ✅ | (i) | cross_dep=0, fx-agent 보유, 1 caller. **Future sprint** |
| 10 | diagnostic-collector.ts | 0 | 3 (core/discovery) | ✅ | (iii) | C103 fix 경로, core/discovery 핵심 메트릭 수집 |
| 11 | execution-types.ts | 0 | 17+ (core/discovery, shaping, harness, modules) | ✅ | (iii) | 공유 타입, api/core/* 전반 사용 — @foundry-x/shared 이전 후보 |
| 12 | external-ai-reviewer.ts | 0 | 1 (core/offering) | ✅ | (i) | cross_dep=0, fx-agent 보유, 1 caller. **Future sprint** |
| 13 | **feedback-loop-context.ts** | 0 | 0 (orchestration-loop 내부만) | ✅ | **(i) DELETE** | orchestration-loop 삭제로 caller 0건, **이번 Sprint 삭제** |
| 14 | graph-engine.ts | 0 | 1 (core/discovery) | ❌ | (iii) | api-only GraphEngine, discovery-graph-service 전용 |
| 15 | graphs/discovery-graph.ts | 2 | 1 (core/discovery) | ❌ | (iii) | api-only, core/discovery StageRunner 의존. cross_dep=2 |
| 16 | help-agent-service.ts | 0 | 1 (routes/help-agent) | ✅ | (i) | cross_dep=0, fx-agent 보유, routes/help-agent 1 caller. **Future sprint** |
| 17 | infra-agent.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 18 | mcp-adapter.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 19 | mcp-registry.ts | 0 | 1 (core/harness) | ✅ | (iii) | core/harness MCP 서버 레지스트리 핵심 |
| 20 | mcp-resources.ts | 0 | 1 (core/harness) | ✅ | (iii) | core/harness MCP 리소스 |
| 21 | mcp-runner.ts | 0 | 1 (core/harness) | ✅ | (iii) | core/harness MCP 실행기 |
| 22 | mcp-sampling.ts | 0 | 1 (core/harness) | ✅ | (iii) | core/harness MCP 샘플링 |
| 23 | mcp-transport.ts | 0 | 1 (core/harness) | ✅ | (iii) | core/harness MCP 전송 레이어 |
| 24 | meta-agent.ts | 0 | 1 (core/discovery) | ✅ | (i) | cross_dep=0, fx-agent 보유, 1 caller. **Future sprint** |
| 25 | meta-approval.ts | 0 | 1 (core/discovery) | ✅ | (i) | cross_dep=0, fx-agent 보유, 1 caller. **Future sprint** |
| 26 | model-metrics.ts | 0 | 1 (modules/auth) | ❌ | (iii) | api-only 모델 과금 메트릭, auth token 경로 |
| 27 | model-router.ts | 0 | 3 (core/shaping, core/collection) | ✅ | (i) | cross_dep=0, fx-agent 보유, 3 callers stub 가능. **Future sprint** |
| 28 | openrouter-runner.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 29 | openrouter-service.ts | 0 | 1 (routes/help-agent) | ✅ | (i) | cross_dep=0, fx-agent 보유, 1 caller. **Future sprint** |
| 30 | **orchestration-loop.ts** | 0 | 0 prod (test 2건만) | ✅ | **(i) DELETE** | prod 사용처 0건, 테스트 삭제, **이번 Sprint 삭제** |
| 31 | planner-agent.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 32 | prompt-gateway.ts | 1 | 4 (core/shaping, core/collection) | ✅ | (ii) | cross_dep=1 (harness audit), 4 callers → contract 추출 필요 |
| 33 | prompt-utils.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 34 | **proposal-generator.ts** | 2 | 0 (완전 dead code) | ❌ | **(i) DELETE** | 아무도 import 안 함, fx-offering에 별도 구현 존재, **이번 Sprint 삭제** |
| 35 | proposal-rubric.ts | 0 | 1 (core/discovery) | ✅ | (iii) | core/discovery 루브릭 평가, 사용 중 |
| 36 | qa-agent.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 37 | reviewer-agent.ts | 0 | 4 (modules/portal, services) | ✅ | (i) | cross_dep=0, fx-agent 보유, 4 callers stub 가능. **Future sprint** |
| 38 | security-agent.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |
| 39 | skill-guide.ts | 0 | 1 (modules/portal) | ✅ | (i) | cross_dep=0, fx-agent 보유, 1 caller. **Future sprint** |
| 40 | skill-metrics.ts | 0 | 1 (core/shaping) | ✅ | (iii) | core/shaping 스킬 메트릭 핵심, 현재 사용 중 |
| 41 | skill-pipeline-runner.ts | 4 | 1 (core/discovery) | ❌ | (ii) | cross_dep=4 (핵심 교차 도메인), api-only. 차기 sprint |
| 42 | task-state-service.ts | 1 | 3 (core/harness) | ✅ | (ii) | cross_dep=1 (transition-guard), core/harness 핵심. contract 추출 필요 |
| 43 | task-state.ts | 1 | 3 (core/harness) | ❌ | (ii) | cross_dep=1 (transition-guard), api-only. 차기 sprint |
| 44 | test-agent.ts | 0 | 0 (services/agent 내부만) | ✅ | (i) | 내부 전용, fx-agent 보유. **Future sprint** |

### 분류 요약

| 분류 | 파일 수 | 이번 Sprint 조치 |
|------|--------|----------------|
| **(i) 즉시 이전 가능** | **20 files** | 3 files 즉시 삭제, 17 files 차기 sprint |
| **(ii) contract 추출 후 후속** | **5 files** | SPEC backlog 등록 |
| **(iii) main-api 잔존** | **19 files** | ESLint 예외, 사유 명시 |

## §4 이번 Sprint 구현 범위 (P-c: 3 files 삭제)

### 삭제 대상 3 files

| 파일 | 삭제 이유 | 연관 삭제 |
|------|---------|---------|
| `proposal-generator.ts` | prod + test 모두 0건 callers, 완전 dead code | 없음 |
| `orchestration-loop.ts` | prod callers 0건 (테스트만), fx-agent 독립 구현 존재 | `__tests__/orchestration-loop.test.ts` |
| `feedback-loop-context.ts` | orchestration-loop.ts만 사용, 삭제 후 callers 0 | `__tests__/services/meta-agent-auto-trigger.test.ts` OrchestrationLoop 케이스 |

### 삭제 후 예상 파일 수

- Before: 44 files
- After: **41 files** (44 - 3 = 41)

## §5 파일 매핑 (변경 대상)

| 변경 유형 | 파일 경로 | 변경 내용 |
|---------|---------|---------|
| **DELETE** | `packages/api/src/services/agent/proposal-generator.ts` | 완전 삭제 |
| **DELETE** | `packages/api/src/services/agent/orchestration-loop.ts` | 완전 삭제 |
| **DELETE** | `packages/api/src/services/agent/feedback-loop-context.ts` | 완전 삭제 |
| **DELETE** | `packages/api/src/__tests__/orchestration-loop.test.ts` | 완전 삭제 |
| **MODIFY** | `packages/api/src/__tests__/services/meta-agent-auto-trigger.test.ts` | OrchestrationLoop 동적 import 테스트 케이스 제거 |

## §6 (ii) 분류 후속 등록 (SPEC backlog)

| 파일 | 등록 제목 | 우선순위 |
|------|---------|--------|
| agent-orchestrator.ts | services/agent/agent-orchestrator cross-dep 해소 | P2 |
| prompt-gateway.ts | prompt-gateway audit-logger dep 분리 | P2 |
| skill-pipeline-runner.ts | skill-pipeline-runner 4 cross-dep 분리 | P3 |
| task-state-service.ts + task-state.ts | task-state 도메인 이전 | P2 |

→ F579 또는 C-track으로 다음 사이클 등록

## §7 (iii) 잔존 파일 ESLint 예외 등록

`packages/api/src/eslint-rules/` MSA 룰에서 `services/agent/**` 경로를 예외로 등록한다.
(이미 F577 autopilot이 services/agent를 "main-api 허용 경로"로 인식하므로 확인만)

## §8 TDD 적용 여부

- **면제**: F578은 파일 삭제 + 문서화 작업. TDD 신규 로직 없음.
- 회귀 검증: `turbo typecheck` + `turbo test` all PASS 확인

## §9 C104 효과 검증

Sprint 325 WT 생성 시 `.dev.vars` 자동 복사 확인 (P-h 선행 조건):
- `ls WT/.dev.vars` → ✅ 이미 확인됨 (May 3 19:38, 742 bytes)
- `ls WT/packages/api/.dev.vars` → ✅ 이미 확인됨 (May 3 19:38, 574 bytes)
- C104 기계적 작동 확인 완료
