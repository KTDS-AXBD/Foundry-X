---
id: FX-RPRT-318_sprint-322
title: Sprint 322 Report — F575 fx-agent 완전 분리 (Phase 46)
sprint: 322
feature: F575
req: FX-REQ-639
match_rate: 97
test_result: pass
status: done
created: 2026-05-02
---

# Sprint 322 Report — F575 fx-agent 완전 분리

## 요약

Phase 46 · F575: MAIN_API Worker에 남아있던 Agent 잔여 7 routes를 fx-agent Worker로 이관하여
**Agent 도메인 완전 분리**를 달성했다. F571 Walking Skeleton(Sprint 320, 8 routes)의 후속으로,
이 Sprint을 통해 fx-agent는 총 15 routes를 보유하는 완전한 독립 Worker가 되었다.

## 성과 지표

| 항목 | 결과 |
|------|------|
| Match Rate | 97% |
| turbo typecheck | 19/19 PASS |
| turbo test | 17/17 tasks, 3091 tests PASS |
| TDD auth guard | 7/7 PASS |
| 소요 시간 | ~45분 (import path fixup 포함) |

## 완료 항목

### 이관된 7 routes (MAIN_API → fx-agent)

| Route 파일 | 경로 | 규모 |
|-----------|------|------|
| `agent.ts` | `/api/agents/*` | 2101줄 |
| `streaming.ts` | `/api/agents/run/stream` | 197줄 |
| `orchestration.ts` | `/api/orchestration/*`, `/api/telemetry/*` | 202줄 |
| `captured-engine.ts` | `/api/skills/captured/*` | 118줄 |
| `derived-engine.ts` | `/api/skills/derived/*` | 118줄 |
| `skill-registry.ts` | `/api/skills/registry` | 183줄 |
| `skill-metrics.ts` | `/api/skills/metrics/*` | 96줄 |

### 신규 파일 (fx-agent)

- `db/` (2): index.ts, schema.ts (Drizzle ORM)
- `streaming/` (3): agent-stream-handler, agent-metrics-service, index
- `runtime/` (6): agent-runtime, tool-registry, token-tracker, define-tool, agent-spec-loader, index
- `schemas/` (7 신규): agent, orchestration, captured-engine, derived-engine, skill-registry, skill-metrics, plan
- `services/` (55 신규): agent-orchestrator, sse-manager, llm, pr-pipeline, merge-queue, worktree-manager,
  telemetry-collector, event-bus, safety-checker, pattern-extractor, evaluator-optimizer, auto-fix,
  github, feedback-loop-context, evaluation-criteria + 40개 agent 전용 서비스

### fx-gateway 라우팅 추가 (9 경로)

```
/api/agents → AGENT
/api/agents/* → AGENT
/api/telemetry/* → AGENT
/api/skills/* → AGENT
/api/plan → AGENT
/api/plan/* → AGENT
/api/worktrees → AGENT
/api/routing-rules → AGENT
/api/routing-rules/* → AGENT
```

### api 정리

- 7개 route 등록 제거 (app.ts)
- 7개 route export 제거 (core/agent/index.ts, core/index.ts)
- 10개 stale route test 파일 삭제

## 갭 분석 (97%)

| 항목 | 설계 | 구현 | 상태 |
|------|------|------|------|
| db/ 2파일 | ✅ | ✅ | PASS |
| streaming/ 3파일 | ✅ | ✅ | PASS |
| runtime/ 6파일 | ✅ | ✅ | PASS |
| schemas/ 7파일 | ✅ | ✅ | PASS |
| services/ 50파일 | ✅ | ✅ (50/50) | PASS |
| routes/ 7파일 | ✅ | ✅ | PASS |
| fx-gateway 9 routes | ✅ | ✅ | PASS |
| fx-agent app.ts 7 routes | ✅ | ✅ | PASS |
| api 정리 7 routes | ✅ | ✅ | PASS |
| production smoke | ⬜ | ⬜ | 미배포 (CI 자동 배포 대기) |

**미적용 항목**: production smoke test는 PR merge 후 CI/CD 자동 배포 시 수행.

## 추가 구현 (design 명시 외)

- `AgentEnv`에 GITHUB_TOKEN / AI / OPENROUTER_DEFAULT_MODEL 추가
  (agent.ts가 GitHub/AI 바인딩 사용)
- 5개 추가 서비스 복사 (transitive deps): auto-rebase, file-context-collector,
  audit-logger, slack, agent-inbox
- mock-d1.ts에 GITHUB_TOKEN / AI mock 필드 추가
- stale api route tests 10개 삭제 (routes 이관으로 404 반환)

## 기술 교훈

**Transitive dependency chain**: 서비스 파일 복사 시 즉시 드러나지 않는 import 체인이 존재.
`auto-rebase.ts`가 `agent-inbox.ts`를 요구하고, `sse-manager.ts`가 `slack.ts`를 요구하는 등
3단계 이상 transitive dep이 있었음. 다음 이관 시 topological sort 선 확인 권장.

**AgentEnv 사전 설계**: agent.ts처럼 대형 파일은 사용 env var 전수 조사 후 env.ts를 먼저 업데이트해야
typecheck 1회 통과 가능. 이번에는 2회 통과로 처리.

## 완료 기준 달성

1. ✅ turbo typecheck PASS (api + fx-agent + fx-gateway)
2. ✅ turbo test PASS (17 tasks)
3. ✅ TDD Red FAIL → Green PASS (7/7 auth guard)
4. ✅ `grep -rn "core/agent" packages/api/src/app.ts` → 0건
5. ⬜ fx-gateway 경유 smoke → CI/CD 배포 후 자동 수행

## Phase 46 상태

F575 완료로 **Phase 46 Agent 도메인 완전 분리** 달성.
fx-agent Worker: 15 routes 보유, prod LIVE (F571 8 routes 기준) + 7 routes 추가 예정 배포.
