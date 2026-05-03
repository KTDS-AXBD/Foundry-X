---
id: FX-DESIGN-327
sprint: 327
feature: F580
req: FX-REQ-647
status: approved
date: 2026-05-03
---

# Sprint 327 Design — F580: services/agent 8 files 이전 + contract 추출

## §1 분석 요약

F579(Sprint 326) 결과 `packages/api/src/services/agent/` = 24 files. 이 중 8개를 제거한다.

### M6 실측 DIFF 분석 (baseline)

| 파일 | api=YES | fx-agent=YES | DIFF 요약 |
|------|---------|-------------|----------|
| model-router | ✅ | ✅ | NONE (완전 동일) |
| agent-inbox | ✅ | ✅ | 1줄: sse-manager import path |
| reviewer-agent | ✅ | ✅ | 1줄: llm import path |
| agent-orchestrator | ✅ | ✅ | 3줄: import paths only (agent-runner, mcp-*, openrouter-runner) |
| prompt-gateway | ✅ | ✅ | 2줄: AgentTaskType import 누락 + AuditLogService path |
| task-state-service | ✅ | ✅ | 1줄: TransitionGuard class→type |
| skill-pipeline-runner | ✅ | ❌ | api ONLY — cross-domain deps (DiscoveryPipelineService 등 4개) |
| task-state | ✅ | ❌ | api ONLY — 사용: app.ts F576에서 제거됨 (dead code) |

### 아키텍처 결정 (ADR-F580)

**문제**: skill-pipeline-runner는 packages/api core/discovery 도메인의 구현체를 직접 instantiate. fx-agent에 복사 시 cross-package circular dep 발생.

**결정**: 
1. 8개 파일을 `packages/api/src/services/agent/` → `packages/api/src/services/`로 이동 (api 내부, packages 경계 미침범)
2. fx-agent/src/services/에 신규 생성 필요한 2개: skill-pipeline-runner(DI 패턴), task-state(re-export stub)
3. contract 파일은 shared에 생성 (P-d 충족)

**trade-off**: 8개가 api/services/에도 잔존하나, services/agent/ 디렉토리는 제거 파일 -8 달성. 장기적으로 fx-agent의 DI 버전 skill-pipeline-runner가 canonical.

## §2 파일 매핑 (5종류)

### 2-A: api/services/agent/ → api/services/ (git mv, 7 files)

| 파일 | 이전 경로 | 신규 경로 | 내부 import 변경 |
|------|-----------|-----------|----------------|
| model-router.ts | services/agent/ | services/ | `./execution-types` → `./agent/execution-types` |
| agent-inbox.ts | services/agent/ | services/ | `../../services/sse-manager` → `./sse-manager` |
| reviewer-agent.ts | services/agent/ | services/ | `../../services/llm` → `./llm` |
| agent-orchestrator.ts | services/agent/ | services/ | `./agent-runner`, `./mcp-*` → `./agent/...` ; `../../services/X` → `./X` |
| prompt-gateway.ts | services/agent/ | services/ | `./execution-types` → `./agent/execution-types` ; `../../core/harness/services/audit-logger` → unchanged |
| skill-pipeline-runner.ts | services/agent/ | services/ | `../../core/X` → `../core/X` ; `../../modules/X` → `../modules/X` |
| task-state-service.ts | services/agent/ | services/ | `../../core/harness/services/transition-guard` → `../core/harness/services/transition-guard` |

### 2-B: api/services/agent/task-state.ts → git rm (dead code)

task-state.ts: app.ts에서 F576에서 route 제거됨. 테스트 1건만 import. 파일 삭제 후 테스트 수정.
- `packages/api/src/services/task-state.ts` 신규 생성 (api용 task-state route, api Env 타입 유지)

### 2-C: fx-agent/src/services/ 신규 생성 (2 files, P-b 달성)

**skill-pipeline-runner.ts (DI 패턴)**:
```typescript
// packages/fx-agent/src/services/skill-pipeline-runner.ts
import type { IDiscoveryPipelineService, IPipelineCheckpointService, IDiscoveryStageService, IBdSkillExecutor } from "@foundry-x/shared";
// constructor는 interface 주입, 구현체 의존 없음
```

**task-state.ts (re-export stub)**:
```typescript
// packages/fx-agent/src/services/task-state.ts
export { taskStateRoute } from "../routes/task-state.js";
```

### 2-D: fx-agent/src/services/ 기존 파일 수정 (1 file)

**prompt-gateway.ts**: `import type { AgentTaskType } from "./execution-types.js"` 추가

### 2-E: packages/shared/src/types/agent-contracts.ts 신규 (P-d)

7개 contract interface 정의:
1. `IDiscoveryPipelineService`
2. `IPipelineCheckpointService`
3. `IDiscoveryStageService`
4. `IBdSkillExecutor`
5. `IAutoFixService`
6. `IAuditLogService`
7. `ITransitionGuard`

## §3 외부 caller 갱신 매핑 (20건)

| 파일 | 현재 import | 갱신 후 import |
|------|-------------|---------------|
| core/shaping/services/bmc-agent.ts | `services/agent/model-router` | `services/model-router` |
| core/shaping/services/bmc-agent.ts | `services/agent/prompt-gateway` | `services/prompt-gateway` |
| core/shaping/services/bmc-insight-service.ts | `services/agent/model-router` | `services/model-router` |
| core/shaping/services/bmc-insight-service.ts | `services/agent/prompt-gateway` | `services/prompt-gateway` |
| core/shaping/services/bd-skill-executor.ts | `services/agent/prompt-gateway` | `services/prompt-gateway` |
| core/collection/services/insight-agent-service.ts | `services/agent/model-router` | `services/model-router` |
| core/collection/services/insight-agent-service.ts | `services/agent/prompt-gateway` | `services/prompt-gateway` |
| core/harness/services/auto-rebase.ts | `services/agent/agent-inbox` | `services/agent-inbox` |
| core/discovery/routes/discovery-pipeline.ts | `services/agent/skill-pipeline-runner` | `services/skill-pipeline-runner` |
| modules/portal/routes/inbox.ts | `services/agent/agent-inbox` | `services/agent-inbox` |
| modules/portal/routes/github.ts | `services/agent/reviewer-agent` | `services/reviewer-agent` |
| modules/portal/routes/webhook.ts | `services/agent/reviewer-agent` | `services/reviewer-agent` |
| modules/portal/services/github-review.ts | `services/agent/reviewer-agent` | `services/reviewer-agent` |
| middleware/constraint-guard.ts | `services/agent/agent-orchestrator` | `services/agent-orchestrator` |
| services/pr-pipeline.ts | `./agent/reviewer-agent` | `./reviewer-agent` |
| core/harness/services/transition-trigger.ts | `services/agent/task-state-service` | `services/task-state-service` |
| __tests__/webhook-comment.test.ts | `services/agent/reviewer-agent` | `services/reviewer-agent` |
| __tests__/skill-pipeline-runner.test.ts | `services/agent/skill-pipeline-runner` | `services/skill-pipeline-runner` |
| __tests__/transition-trigger.test.ts | `services/agent/task-state-service` | `services/task-state-service` |
| __tests__/task-state-service.test.ts | `services/agent/task-state-service` + `services/agent/task-state` | `services/task-state-service` + `services/task-state` |

## §4 테스트 계약 (TDD Red Target)

### 회귀 보호 테스트 (기존 통과 유지)
- `packages/api`: 기존 task-state-service.test.ts, skill-pipeline-runner.test.ts, transition-trigger.test.ts, webhook-comment.test.ts 통과 유지
- `packages/fx-agent`: test/ 하위 기존 테스트 통과 유지

### P-a~P-h 사전 검증
```bash
# P-a: services/agent 잔존 ≤ 16
find packages/api/src/services/agent -type f -name "*.ts" | wc -l

# P-b: 8 files in fx-agent/services/
for f in model-router agent-inbox reviewer-agent agent-orchestrator prompt-gateway skill-pipeline-runner task-state-service task-state; do
  test -f "packages/fx-agent/src/services/${f}.ts" && echo "OK $f" || echo "MISS $f"
done | grep -c '^OK'

# P-c: 8 git D/R from services/agent
git log --diff-filter=DR --name-status sprint/327...master | grep "packages/api/src/services/agent/" | wc -l

# P-d: contract file
find packages/shared/src/types -name "agent-contracts.ts" | head -1

# P-e: 0 remaining imports
for f in model-router agent-inbox reviewer-agent agent-orchestrator prompt-gateway skill-pipeline-runner task-state-service task-state; do
  grep -rn "services/agent/${f}" packages/ --include="*.ts" \
    | grep -v "packages/api/src/services/agent/" \
    | grep -v "packages/fx-agent/src/services/"
done | wc -l

# P-f: typecheck + test
turbo typecheck && turbo test
```

## §5 D1~D4 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| D1 | 신규 인터페이스 주입 사이트 전수 검증 | 20 callers 매핑 표 §3 완성 |
| D2 | 식별자 계약 검증 | 해당 없음 (ID 변경 없음) |
| D3 | Breaking change 영향도 | services/agent/ 이동은 동일 파일이므로 exports 변경 없음 |
| D4 | TDD Red 파일 존재 | 기존 테스트 회귀 보호로 대체 (신규 public API 없음) |
