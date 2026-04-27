---
id: FX-PLAN-320
title: Sprint 320 — F571 Agent Walking Skeleton (8 routes)
sprint: 320
f_items: [F571]
req_codes: [FX-REQ-614]
priority: P1
phase: 45
batch: 6
author: Claude
created: 2026-04-28
status: active
---

# Sprint 320 Plan — F571 Agent Walking Skeleton (8 routes)

## F571 개요

Phase 45 Batch 6 (최후 배치) — Agent 도메인 Walking Skeleton.
PRD §10.2 우선순위 5번, 난이도 ★★★★★, R2 리스크 최대. 65 services × 15 routes 도메인 중 cross-domain dep 가장 적은 8 routes만 1차 이관. 나머지 7 routes + 65 services 모듈화는 Phase 46 (Sprint 321~322 예정).

**PRD scope deviation 명시**: PRD §3-1은 "15 routes 초기 이관"이라 표기했으나, 실측 cross-domain 의존성(harness 14건, discovery 3건, offering 2건, shaping 1건 — 총 20건)을 분석한 결과 8 routes 1차 + 7 routes 2차로 분할이 안전. /ax:todo plan(S313, 2026-04-28)에서 결정.

## 현황 (착수 시점)

| 항목 | 현황 |
|------|------|
| fx-agent Worker | **미존재** (신규 생성 대상) |
| core/agent/routes (api) | 15개 mount (api/src/app.ts:172~282) |
| core/agent/services (api) | 65개 + runtime/orchestration/streaming = 총 ~112 ts 파일 |
| Cross-domain runtime imports (agent → 타 도메인) | 20건: harness 14, discovery 3, offering 2, shaping 1 |
| fx-gateway agent 라우팅 | 없음 (catch-all `/api/*` → MAIN_API) |
| 기존 fx-* Workers | fx-discovery / fx-shaping / fx-offering / fx-modules / fx-gateway (5개) |

## SCOPE LOCKED

### (a) 1차 이관 8 routes (Walking Skeleton)
| # | route | URL prefix | Cross-domain dep | 처리 |
|---|-------|-----------|------------------|------|
| 1 | `agent-adapters.ts` | `/api/agent-adapters/*` | type-only (EvaluatorOptimizer) | 변경 없음 |
| 2 | `agent-definition.ts` | `/api/agent-definitions/*` | runtime: harness/custom-role-manager | **copy to fx-agent/services** |
| 3 | `command-registry.ts` | `/api/command-registry/*` | clean | 변경 없음 |
| 4 | `context-passthrough.ts` | `/api/context-passthroughs/*` | clean | 변경 없음 |
| 5 | `execution-events.ts` | `/api/execution-events` | clean | 변경 없음 |
| 6 | `meta.ts` | `/api/meta/*` | clean (6 services 전부 clean) | 변경 없음 |
| 7 | `task-state.ts` | `/api/task-states/*` | runtime: harness/transition-guard (via task-state-service) | **copy to fx-agent/services** |
| 8 | `workflow.ts` | `/api/orgs/:orgId/workflows*` | clean (workflow-engine) | 변경 없음 |

### (b) Phase 46 deferred 7 routes
- `agent.ts` (multi-domain: portal/github + sse-manager + pr-pipeline + harness 다수)
- `streaming.ts`, `orchestration.ts` (heavy harness deps)
- `captured-engine.ts`, `derived-engine.ts` (harness/safety-checker)
- `skill-registry.ts`, `skill-metrics.ts` (harness/safety-checker)

### (c) 신규 fx-agent Worker 골격 생성
- `packages/fx-agent/` (fx-offering 패턴 모방)
- `package.json` + `wrangler.toml` + `tsconfig.json` + `eslint.config.js` + `vitest.config.ts`
- `src/index.ts`, `src/app.ts`, `src/env.ts`
- `src/middleware/` — auth.ts, tenant.ts (fx-offering 복사)
- `src/routes/` — 8 routes 이전
- `src/services/` — 8 routes가 사용하는 services + harness 2개 copy
- `src/__tests__/` — 8 routes 401 auth guard tests + helpers/mock-d1.ts

### (d) Service Binding 셋업 (PRD R2 롤백 호환)
- `fx-gateway/wrangler.toml`: `[[services]] AGENT` 추가 (production + env.dev)
- `fx-agent/wrangler.toml`: `[[services]] MAIN_API` binding 추가 (Phase 46 잔여 호출 대비, 본 Sprint 내 unused)
- D1 binding: `foundry-x-db` 공유 (다른 fx-* Worker와 동일 패턴)

### (e) fx-gateway 라우팅 (선등록 우선순위 — D1 체크리스트 + S299 collision 교훈)
catch-all `/api/*` → MAIN_API보다 **위쪽**에 등록:
```
app.all("/api/agent-adapters/*", AGENT)
app.all("/api/agent-definitions/*", AGENT)
app.all("/api/command-registry/*", AGENT)
app.all("/api/context-passthroughs/*", AGENT)
app.all("/api/execution-events", AGENT)
app.all("/api/execution-events/*", AGENT)
app.all("/api/meta/*", AGENT)
app.all("/api/task-states/*", AGENT)
app.all("/api/orgs/:orgId/workflows", AGENT)
app.all("/api/orgs/:orgId/workflows/*", AGENT)
```

## OUT-OF-SCOPE (Phase 46+ deferred)

- 7 deferred routes (agent / streaming / orchestration / captured-engine / derived-engine / skill-registry / skill-metrics)
- 65 services 중 8 routes 미사용 services 이관
- harness/discovery/shaping/offering 도메인 cross-domain dep 정리 (harness-kit 추출)
- D1 schema 변경 (불필요)
- `core/agent/` 디렉토리 삭제 (Phase 46에서 일괄)
- core/agent → harness/discovery/shaping/offering import 제거 (Phase 46)

## TDD 계획

### Red Phase (F571 red)
- `packages/fx-agent/src/__tests__/auth-guard.test.ts`: 8 routes 인증 보호 401 체크
- 커밋: `test(fx-agent): F571 red — 8 routes auth guard`
- 검증: `pnpm --filter @foundry-x/fx-agent test` → FAIL (라우트 미구현)

### Green Phase (F571 green)
- 8 routes + 의존 services 이전 + app.ts 마운트
- harness 2개 service copy (custom-role-manager, transition-guard)
- 커밋: `feat(fx-agent): F571 green — 8 routes + Walking Skeleton`
- 검증: `pnpm --filter @foundry-x/fx-agent test` → PASS

### 추가 검증
- `pnpm typecheck` (fx-agent + fx-gateway + api 3 패키지) → PASS
- `pnpm lint` → PASS (cross-domain ESLint rule 위반 0건 확인)
- core/agent/* import는 api에서 변경 없음 (잔여 7 routes 위해 유지)

## 성공 기준

1. **fx-agent Worker 신규 생성** + 정상 빌드 (turbo build PASS)
2. **8 routes fx-agent에서 동작** — 401 auth guard + 200 정상 응답 (Bearer 토큰)
3. **fx-gateway 8 paths → AGENT 라우팅** (catch-all 우선순위 보장)
4. **Service Binding 활성** — gateway → fx-agent 호출 chain 정상
5. **typecheck + lint + test PASS** (api + fx-agent + fx-gateway 3 패키지)
6. **Phase Exit P1~P4** Smoke Reality 통과 (production 실측)
7. **Gap Match Rate ≥ 90%** (Design ↔ Implementation)

## 변경 파일 목록 (요약)

### CREATE (fx-agent 신규 패키지 — 약 25 files)
- `packages/fx-agent/{package.json,wrangler.toml,tsconfig.json,eslint.config.js,vitest.config.ts}`
- `packages/fx-agent/src/{index.ts,app.ts,env.ts}`
- `packages/fx-agent/src/middleware/{auth.ts,tenant.ts}`
- `packages/fx-agent/src/routes/` × 8 (이전)
- `packages/fx-agent/src/services/` × N (8 routes 의존 services + harness 2 copies)
- `packages/fx-agent/src/__tests__/{auth-guard.test.ts,helpers/mock-d1.ts}`
- `docs/01-plan/features/sprint-320.plan.md` (이 파일)
- `docs/02-design/features/sprint-320.design.md`

### MODIFY (3 files)
- `packages/fx-gateway/wrangler.toml`: AGENT binding 추가 (production + dev)
- `packages/fx-gateway/src/app.ts`: 10줄 라우팅 추가 (선등록 위치 준수)
- `packages/api/src/app.ts`: **변경 없음** (mount 유지, gateway에서 분기되므로 도달 안 됨)

### DELETE — 없음 (Phase 46에서 일괄)

## Phase 46 deferral 명시

F571 완결 후 Phase 46 (Sprint 321~322 예정):
1. 잔여 7 routes 이관 (agent, streaming, orchestration, captured/derived-engine, skill-registry/metrics)
2. 65 services 모듈화 — harness-kit으로 utility-grade 서비스 이전 (safety-checker, audit-logger, pattern-extractor 등)
3. cross-domain dep 정리 (harness 14, discovery 3, offering 2, shaping 1)
4. `core/agent/` api에서 일괄 삭제

본 Sprint는 Walking Skeleton의 정의 그대로 **"fx-agent Worker가 동작 가능함"** 증명에 한정.
