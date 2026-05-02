---
id: FX-PLAN-322
title: Sprint 322 Plan — F575 Phase 46 Agent 잔여 7 routes 이관 (fx-agent 완전 분리)
sprint: 322
feature: F575
req: FX-REQ-639
priority: P1
status: active
created: 2026-05-02
---

# Sprint 322 Plan — F575 fx-agent 완전 분리

## 목적

F571 Walking Skeleton(8 routes) 후속으로 잔여 **7 routes 전부**를 fx-agent Worker로 이관하여 Agent 도메인 완전 분리를 달성한다.

이관 대상:
1. `agent.ts` (2101줄) — `/api/agents/*` 핵심 라우트
2. `streaming.ts` (197줄) — SSE/WebSocket 스트리밍
3. `orchestration.ts` (202줄) — 루프/텔레메트리
4. `captured-engine.ts` (118줄) — 캡처 엔진 스킬
5. `derived-engine.ts` (118줄) — 파생 엔진 스킬
6. `skill-registry.ts` (183줄) — 스킬 레지스트리
7. `skill-metrics.ts` (96줄) — 스킬 메트릭스

## 배경

| 항목 | 내용 |
|------|------|
| 전제 | F571 ✅ Sprint 320, F553 CONDITIONAL GO ✅ Sprint 321 |
| 기존 | `packages/api/src/core/agent/routes/` 7파일 → MAIN_API Worker 서빙 |
| 목표 | fx-agent Worker 완전 분리, `grep -rn "core/agent" packages/api` route 0건 |
| 패턴 | F560(Discovery) / F570(Offering) / F571 완전 이관 패턴 재사용 |

## 범위 (F575 SPEC 준수)

### (a) 7개 route 파일 이동
- `packages/api/src/core/agent/routes/{agent,streaming,orchestration,captured-engine,derived-engine,skill-registry,skill-metrics}.ts`
- → `packages/fx-agent/src/routes/`
- import path 변환: `Env` → `AgentEnv`, 경로 depth 조정

### (b) 의존성 서비스 복사 (약 43개 신규 파일)
- `packages/api/src/core/agent/services/` 미복사 서비스
- `packages/api/src/services/` 공유 서비스 (sse-manager, pr-pipeline, merge-queue, llm, worktree-manager, telemetry-collector, event-bus)
- `packages/api/src/core/harness/services/` 크로스도메인 (safety-checker, pattern-extractor, evaluator-optimizer, auto-fix)
- `packages/api/src/modules/portal/services/` (github, feedback-loop-context)
- `packages/api/src/modules/gate/services/` (evaluation-criteria)

### (c) 신규 디렉토리/파일
- `fx-agent/src/streaming/` (api/core/agent/streaming/ 복사)
- `fx-agent/src/runtime/` (api/core/agent/runtime/ 복사)
- `fx-agent/src/db/` (index.ts + schema.ts 복사)
- `fx-agent/src/schemas/` 6개 신규 (agent, orchestration, captured-engine, derived-engine, skill-registry, skill-metrics)
- `fx-agent/src/schemas/plan.ts` (offering/schemas/plan 복사)

### (d) fx-gateway 라우팅 갱신
신규 route path prefix → `c.env.AGENT.fetch(c.req.raw)`:
- `/api/agents` + `/api/agents/*`
- `/api/telemetry/*`
- `/api/skills/*`
- `/api/plan` + `/api/plan/*`
- `/api/worktrees`
- `/api/routing-rules` + `/api/routing-rules/*`

### (e) api 정리
- `packages/api/src/core/agent/index.ts` — 7개 route export 제거
- `packages/api/src/app.ts` — 7개 route import/registration 제거

### (f) Phase Exit Smoke Reality
- fx-gateway 경유 `/api/agents` GET 200 확인
- fx-gateway 경유 `/api/skills/registry` GET 401 확인
- fx-gateway 경유 `/api/orchestration` → task-states (이미 작동 확인)
- KOAMI Dogfood Graph 실행 (proposals ≥ 1건 목표)

## TDD 계획 (Red Phase)

**테스트 계약 (auth guard):**
```
packages/fx-agent/src/__tests__/auth-guard-f575.test.ts
```
- 7개 신규 route에 인증 없이 접근 → 401
- 대표 엔드포인트: `/api/agents`, `/api/agents/run/stream`, `/api/skills/registry`, `/api/skills/metrics`, `/api/skills/captured/patterns`, `/api/skills/derived/patterns`, `/api/telemetry/counts`

## 예상 소요

- 파일 복사 + import 변환: 자동화 스크립트 활용
- 구현 총 시간: 30~45분 (F571 30분과 유사)

## 완료 기준

1. `turbo typecheck` PASS (api + fx-agent + fx-gateway)
2. `turbo test` PASS
3. TDD Red FAIL → Green PASS
4. fx-gateway 경유 agent/skill routes 401 → 인증 시 200
5. `grep -rn "core/agent" packages/api/src/app.ts` — 7개 route 미참조
