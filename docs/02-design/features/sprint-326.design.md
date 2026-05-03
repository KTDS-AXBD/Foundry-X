---
id: FX-DESIGN-326
sprint: 326
feature: F579
req: FX-REQ-646
status: approved
date: 2026-05-03
---

# Sprint 326 Design — F579: services/agent (i) 17 files deduplicate + 외부 import 갱신

## §1 목표

`packages/api/src/services/agent/` 41개 파일 중 (i) 분류 17개를 제거하여 **≤ 24 files** 달성.

## §2 실측 결과 (Sprint 326 착수 시점)

### §2-A DIFF=NONE 10 files 검증 결과

| 파일 | diff 결과 | 판정 |
|------|----------|------|
| claude-api-runner.ts | IDENTICAL | ✅ 즉시 처리 가능 |
| external-ai-reviewer.ts | IDENTICAL | ✅ |
| help-agent-service.ts | IDENTICAL | ✅ |
| mcp-adapter.ts | IDENTICAL | ✅ |
| meta-approval.ts | IDENTICAL | ✅ |
| model-router.ts | IDENTICAL | ✅ |
| openrouter-runner.ts | IDENTICAL | ✅ |
| openrouter-service.ts | IDENTICAL | ✅ |
| prompt-utils.ts | IDENTICAL | ✅ |
| skill-guide.ts | IDENTICAL | ✅ |

### §2-B DIFF=YES 10 files 분석 결과

| 파일 | diff lines | 차이 내용 | prod callers | 판정 |
|------|-----------|----------|-------------|------|
| agent-definition-loader.ts | 10 | import path (`../../schemas` vs `../schemas`) + lint comment | 1 (core/harness) | import 보정 후 이동 가능 |
| agent-inbox.ts | 4 | import path (`../../services/sse-manager` vs `./sse-manager`) | 2 (core/harness, modules/portal) | import 보정 후 이동 가능 |
| architect-agent.ts | 297 | API=stub, fx-agent=full impl w/ docs | 0 | 즉시 삭제 (칼러 없음) |
| infra-agent.ts | 310 | API=stub, fx-agent=full impl w/ docs | 0 | 즉시 삭제 |
| meta-agent.ts | 4 | string escape 차이 (yaml backslash) | 1 (core/discovery) | api 버전 유지(서비스 내 사용) + 이동 |
| planner-agent.ts | 312 | API=stub(`D1Database, deps: unknown`), fx=full | 0 | 즉시 삭제 |
| qa-agent.ts | 275 | API=stub, fx-agent=full impl | 0 | 즉시 삭제 |
| reviewer-agent.ts | 4 | import path (`../../services/llm` vs `./llm`) | 4 prod (portal, pr-pipeline) | import 보정 후 이동 가능 — **이번 Sprint 3개만 처리** |
| security-agent.ts | 284 | API=stub, fx-agent=full impl | 0 | 즉시 삭제 |
| test-agent.ts | 266 | API=stub, fx-agent=full impl | 0 | 즉시 삭제 |

> **fx-agent 쪽이 최신본** (DIFF=YES 대형 파일들): fx-agent에 완전한 구현 + 문서 주석. api/services/agent는 stub. backporting 불필요.

## §3 구현 전략

### 전략: core/agent/services/ 이동 (MSA 준수)

**핵심 결정**: callers가 있는 파일은 `packages/api/src/core/agent/services/`로 이동.
- MSA 룰 `core/{domain}/` 패턴 준수
- callers import path 갱신 (동일 상대 depth, agent → core/agent로 변경)
- cross-package binding 불필요 (packages/api 내부 이동)

### 파일별 처리 계획

| 처리 | 파일 | callers | 이유 |
|------|------|---------|------|
| **DELETE** (9 files) | mcp-adapter, openrouter-runner, prompt-utils | 0 | DIFF=NONE, 불사용 |
| **DELETE** (9 files) | architect-agent, infra-agent, planner-agent, qa-agent, security-agent, test-agent | 0 | DIFF=YES stub, 불사용 |
| **MOVE → core/agent/services/** | claude-api-runner | 1 (services/adapters) | DIFF=NONE |
| **MOVE → core/agent/services/** | external-ai-reviewer | 1 (core/offering) | DIFF=NONE |
| **MOVE → core/agent/services/** | help-agent-service | 1 (routes/) | DIFF=NONE |
| **MOVE → core/agent/services/** | openrouter-service | 1 (routes/) | DIFF=NONE |
| **MOVE → core/agent/services/** | skill-guide | 1 (modules/portal) | DIFF=NONE |
| **MOVE → core/agent/services/** | meta-approval | 1 (core/discovery) | DIFF=NONE |
| **MOVE → core/agent/services/** | meta-agent | 1 (core/discovery) | DIFF=YES(4), import path fix |
| **MOVE → core/agent/services/** | agent-definition-loader | 1 prod (core/harness) | DIFF=YES(10), import path fix |
| **KEEP (이번 Sprint 제외)** | model-router | 3 callers | cross-domain 의존도 높음 |
| **KEEP (이번 Sprint 제외)** | agent-inbox | 2 callers | cross-domain (harness+portal) |
| **KEEP (이번 Sprint 제외)** | reviewer-agent | 5 callers (4 prod) | portal 5곳 의존 |

> **KEEP 3 files 사유**: 이번 Sprint에서도 DELETE 9 + MOVE 8 = 17 deletions from services/agent → **41-17=24 ≤ 24 (P-c PASS)**. KEEP 3 files는 이후 Sprint(F580 후보)에서 처리.

## §4 파일 매핑 (§5 대응)

### §4-A DELETE 9 files

| 파일 | 경로 |
|------|------|
| DELETE | `packages/api/src/services/agent/mcp-adapter.ts` |
| DELETE | `packages/api/src/services/agent/openrouter-runner.ts` |
| DELETE | `packages/api/src/services/agent/prompt-utils.ts` |
| DELETE | `packages/api/src/services/agent/architect-agent.ts` |
| DELETE | `packages/api/src/services/agent/infra-agent.ts` |
| DELETE | `packages/api/src/services/agent/planner-agent.ts` |
| DELETE | `packages/api/src/services/agent/qa-agent.ts` |
| DELETE | `packages/api/src/services/agent/security-agent.ts` |
| DELETE | `packages/api/src/services/agent/test-agent.ts` |

### §4-B MOVE + caller update 8 files

| 소스 (DELETE) | 대상 (CREATE) | callers import 경로 변경 |
|--------------|-------------|------------------------|
| `services/agent/claude-api-runner.ts` | `core/agent/services/claude-api-runner.ts` | `services/adapters/claude-api-adapter.ts`: `../../services/agent/` → `../../core/agent/services/` |
| `services/agent/external-ai-reviewer.ts` | `core/agent/services/external-ai-reviewer.ts` | `core/offering/services/prd-review-pipeline.ts`: `../../../services/agent/` → `../../../core/agent/services/` |
| `services/agent/help-agent-service.ts` | `core/agent/services/help-agent-service.ts` | `routes/help-agent.ts`: `../services/agent/` → `../core/agent/services/` |
| `services/agent/openrouter-service.ts` | `core/agent/services/openrouter-service.ts` | `routes/help-agent.ts`: `../services/agent/` → `../core/agent/services/` |
| `services/agent/skill-guide.ts` | `core/agent/services/skill-guide.ts` | `modules/portal/routes/onboarding.ts`: `../../../services/agent/` → `../../../core/agent/services/` |
| `services/agent/meta-approval.ts` | `core/agent/services/meta-approval.ts` | `core/discovery/routes/discovery-stage-runner.ts`: `../../../services/agent/` → `../../../core/agent/services/` |
| `services/agent/meta-agent.ts` | `core/agent/services/meta-agent.ts` | `core/discovery/routes/discovery-stage-runner.ts`: `../../../services/agent/` → `../../../core/agent/services/` |
| `services/agent/agent-definition-loader.ts` | `core/agent/services/agent-definition-loader.ts` | `core/harness/services/custom-role-manager.ts`: same pattern; `__tests__/agent-definition-loader.test.ts`: `../services/agent/` → `../core/agent/services/`. 파일 내부 import: `../../schemas/` → `../../../schemas/` |

### §4-C KEEP in services/agent/ (이번 Sprint 제외)

| 파일 | 사유 |
|------|------|
| model-router.ts | 3 cross-domain callers (shaping×2, collection×1) — F580 |
| agent-inbox.ts | 2 callers (harness+portal) — F580 |
| reviewer-agent.ts | 5 callers (portal×4+pr-pipeline) — F580 |

## §5 TDD 적용 여부

**면제** (tdd-workflow.md 기준): F579는 파일 이동 + import 갱신 작업. 신규 서비스 로직 없음.
- 회귀 검증: `turbo typecheck` + `turbo test` all PASS

## §6 예상 변경 파일 수

| 영역 | 파일 수 |
|------|--------|
| DELETE (services/agent/) | 9 |
| DELETE + CREATE (move to core/agent/services/) | 8 source → 8 dest = 16 file ops |
| caller import 갱신 | ~12 files |
| Design 문서 | 1 |
| **합계** | ~38 |

## §7 PASS 조건 매핑 (Plan §3)

| Plan P | 이 Design 대응 |
|--------|---------------|
| P-a | §4-A: git rm 9 files (DIFF=NONE 10 중 0-caller 3 포함), git rm 8 source in MOVE |
| P-b | §2-B: 10 files diff 분석 결과 표 (이 문서 §2-B) |
| P-c | 41 - 17 = **24** ≤ 24 ✅ |
| P-d | §4-B caller import 갱신 → `grep` 0건 |
| P-e | turbo typecheck 19/19 + turbo test PASS |
