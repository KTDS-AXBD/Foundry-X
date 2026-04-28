---
id: FX-DESIGN-320
title: Sprint 320 Design — F571 Agent Walking Skeleton (8 routes)
sprint: 320
f_items: [F571]
author: Claude
created: 2026-04-28
status: active
---

# Sprint 320 Design — F571 Agent Walking Skeleton

## §1 목적

F571 Walking Skeleton — `fx-agent` Worker 신규 생성 + 8 routes (cross-domain dep 최소 서브셋) 1차 이관. 잔여 7 routes + 65 services 모듈화는 Phase 46 (Sprint 321~322) 이관.

**Walking Skeleton 정의**: 도메인 분리 패턴이 end-to-end로 동작함을 최소 surface로 증명. 본 Sprint에서는 "Browser → fx-gateway → fx-agent → D1" chain이 8 routes에서 200 응답을 반환하면 성공. 잔여 routes는 catch-all로 MAIN_API에 도달.

## §2 D1 체크리스트 (Stage 3 Exit — F534/F536 교훈 반영)

| # | 항목 | 결과 |
|---|------|------|
| **D1** | **주입 사이트 전수 검증** | api/src/app.ts agent route mounts 15개 → **유지** (gateway 분기로 도달 차단). fx-agent/src/app.ts 8 routes 마운트 신규 생성. fx-gateway/src/app.ts 10줄 라우팅 추가 (8 prefixes × 1~2 패턴). 호출 sites: gateway → AGENT(fx-agent) → D1 binding |
| **D2** | **식별자 계약 검증** | 영향 D1 테이블: `agent_definitions` (sub PK), `agent_sessions` (sub PK + JWT subject), `task_states` (id + UUID), `command_registry` (id), `execution_events` (id). 모두 동일 D1 DB(`foundry-x-db`) 공유 → ID sequence/format 무관. JWT `jwtPayload.sub` 추출 패턴 동일 (`@hono/zod-openapi` + auth middleware) |
| **D3** | **Breaking change 영향도** | DB schema 변경 **없음** (D1 migration 추가 없음). URL paths **동일 유지** (`/api/agent-adapters/*` 등) — gateway가 분기 처리. 호출자(Web/CLI/외부) 영향 zero. CORS 정책 동일 (gateway 미들웨어 재사용) |
| **D4** | **TDD Red 파일 존재** | `packages/fx-agent/src/__tests__/auth-guard.test.ts` (Red 커밋 → vitest FAIL 확인 → Green 커밋) |

## §3 아키텍처

### §3.1 라우팅 변경 (Before → After)

```
Before (현재):
Browser → fx-gateway → MAIN_API (api) → 15 agent routes
                       └ catch-all /api/*

After (Walking Skeleton):
Browser → fx-gateway
  ├── /api/agent-adapters/*       → AGENT (fx-agent)
  ├── /api/agent-definitions/*    → AGENT
  ├── /api/command-registry/*     → AGENT
  ├── /api/context-passthroughs/* → AGENT
  ├── /api/execution-events       → AGENT
  ├── /api/execution-events/*     → AGENT
  ├── /api/meta/*                 → AGENT
  ├── /api/task-states/*          → AGENT
  ├── /api/orgs/:orgId/workflows  → AGENT
  ├── /api/orgs/:orgId/workflows/* → AGENT
  └── /api/* (catch-all)          → MAIN_API ← 잔여 7 routes
```

> **선등록 우선순위**: 8 prefixes는 catch-all `/api/*`보다 위에 등록. fx-gateway/src/app.ts 기존 패턴 준수 (S299 collision feedback memory 반영).

### §3.2 fx-agent 패키지 구조 (fx-offering 패턴 준용)

```
packages/fx-agent/
├── package.json          # @foundry-x/fx-agent (fx-offering 모방)
├── wrangler.toml         # name=fx-agent, D1 + AGENT 자체 routing
├── tsconfig.json
├── eslint.config.js      # ax-bd plugin no-cross-domain-import 적용
├── vitest.config.ts
└── src/
    ├── index.ts          # export default app
    ├── app.ts            # 8 routes + auth/tenant middleware
    ├── env.ts            # AgentEnv 타입 (D1 + JWT_SECRET + MAIN_API binding)
    ├── middleware/
    │   ├── auth.ts       # JWT verify (fx-offering copy)
    │   └── tenant.ts     # orgId guard (fx-offering copy)
    ├── routes/           # 8 routes copy from api/src/core/agent/routes/
    │   ├── agent-adapters.ts
    │   ├── agent-definition.ts
    │   ├── command-registry.ts
    │   ├── context-passthrough.ts
    │   ├── execution-events.ts
    │   ├── meta.ts
    │   ├── task-state.ts
    │   └── workflow.ts
    ├── services/         # 8 routes 의존 services + harness 2개 copy
    │   ├── (8 routes가 직접/간접 사용하는 services)
    │   ├── custom-role-manager.ts  # harness/services copy + 주석 "Phase 46: harness-kit 이전"
    │   └── transition-guard.ts     # harness/services copy + 동일
    └── __tests__/
        ├── auth-guard.test.ts      # TDD Red → Green 8 routes × 401 체크
        └── helpers/
            └── mock-d1.ts          # better-sqlite3 in-memory (fx-offering 모방)
```

### §3.3 Cross-domain dep 처리 매트릭스

| route | dep 종류 | 처리 |
|-------|---------|------|
| `agent-adapters` | type-only (`type EvaluatorOptimizer`) | 변경 없음 (ESLint 규칙 허용) |
| `agent-definition` | runtime: `harness/services/custom-role-manager` | **fx-agent/services/custom-role-manager.ts로 copy** + 주석 "Phase 46: harness-kit 이전 예정" |
| `task-state` (via `task-state-service.ts`) | runtime: `harness/services/transition-guard` (`createDefaultGuard`) | **fx-agent/services/transition-guard.ts로 copy** + 동일 주석 |
| 나머지 5개 (command-registry, context-passthrough, execution-events, meta, workflow) | clean | 변경 없음 |

> **Service Binding 사용 안 하는 이유**: harness service 2개 모두 D1 직접 access + 클래스 instantiation 패턴. HTTP endpoint 형태가 아니므로 fetch() 콜백 부적합. Walking Skeleton 단계에서는 copy로 빠르게 격리, Phase 46에서 harness-kit으로 추출하여 drift 해소.
> **MAIN_API binding은 wrangler.toml에 등록**: Phase 46 잔여 cross-domain 콜백 대비 (본 Sprint 내 사용 0건이지만, 인프라 사전 셋업).

### §3.4 Service Binding 토폴로지

```
fx-gateway (wrangler.toml):
  [[services]] AGENT → fx-agent           # 신규 (Sprint 320)
  [[services]] DISCOVERY → fx-discovery
  [[services]] SHAPING → fx-shaping
  [[services]] OFFERING → fx-offering
  [[services]] MODULES → fx-modules
  [[services]] MAIN_API → foundry-x-api

fx-agent (wrangler.toml):
  [[d1_databases]] DB → foundry-x-db
  [[services]] MAIN_API → foundry-x-api  # Phase 46 호환 (현재 unused)
```

## §4 테스트 계약 (TDD Red Target)

### §4.1 packages/fx-agent/src/\_\_tests\_\_/auth-guard.test.ts

```typescript
import { describe, test, expect } from "vitest";
import app from "../app.js";
import { createMockEnv } from "./helpers/mock-d1.js";

describe("F571: Agent Walking Skeleton 8 routes auth guard", () => {
  const env = createMockEnv();

  test("GET /api/agent-adapters without auth → 401", async () => {
    const res = await app.request("/api/agent-adapters", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/agent-definitions/schema without auth → 401", async () => {
    const res = await app.request("/api/agent-definitions/schema", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/command-registry/namespaces without auth → 401", async () => {
    const res = await app.request("/api/command-registry/namespaces", {}, env);
    expect(res.status).toBe(401);
  });

  test("POST /api/context-passthroughs without auth → 401", async () => {
    const res = await app.request("/api/context-passthroughs", { method: "POST" }, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/execution-events without auth → 401", async () => {
    const res = await app.request("/api/execution-events", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/meta/proposals without auth → 401", async () => {
    const res = await app.request("/api/meta/proposals", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/task-states without auth → 401", async () => {
    const res = await app.request("/api/task-states", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/orgs/:orgId/workflows without auth → 401", async () => {
    const res = await app.request("/api/orgs/test-org/workflows", {}, env);
    expect(res.status).toBe(401);
  });
});
```

> Red Phase 검증: `pnpm --filter @foundry-x/fx-agent test` → 8 tests FAIL (라우트 또는 미들웨어 미구현)
> Green Phase 검증: `pnpm --filter @foundry-x/fx-agent test` → 8 tests PASS

## §5 파일 매핑 (D1 체크리스트 근거)

### §5.1 신규 생성 (fx-agent — 새 패키지)

| 파일 | 역할 | 출처/패턴 |
|------|------|----------|
| `packages/fx-agent/package.json` | 패키지 manifest | fx-offering 복사 + name 교체 |
| `packages/fx-agent/wrangler.toml` | Worker config | fx-offering 복사 + name=fx-agent + MAIN_API binding 추가 |
| `packages/fx-agent/tsconfig.json` | TS config | fx-offering 복사 |
| `packages/fx-agent/eslint.config.js` | ESLint (no-cross-domain-import) | fx-offering 복사 |
| `packages/fx-agent/vitest.config.ts` | vitest config | fx-offering 복사 |
| `packages/fx-agent/src/index.ts` | export default app | fx-offering 패턴 |
| `packages/fx-agent/src/app.ts` | 8 routes 마운트 + middleware | fx-offering app.ts 모방 |
| `packages/fx-agent/src/env.ts` | `AgentEnv` 타입 | D1 + JWT_SECRET + MAIN_API |
| `packages/fx-agent/src/middleware/auth.ts` | JWT verify | fx-offering 복사 |
| `packages/fx-agent/src/middleware/tenant.ts` | orgId guard | fx-offering 복사 |
| `packages/fx-agent/src/routes/agent-adapters.ts` | route 이전 | api/src/core/agent/routes/agent-adapters.ts 복사 + import 경로 수정 |
| `packages/fx-agent/src/routes/agent-definition.ts` | 동 | 동 + harness import → ./services/custom-role-manager |
| `packages/fx-agent/src/routes/command-registry.ts` | 동 | 단순 복사 |
| `packages/fx-agent/src/routes/context-passthrough.ts` | 동 | 단순 복사 |
| `packages/fx-agent/src/routes/execution-events.ts` | 동 | 단순 복사 |
| `packages/fx-agent/src/routes/meta.ts` | 동 | 단순 복사 |
| `packages/fx-agent/src/routes/task-state.ts` | 동 | 단순 복사 |
| `packages/fx-agent/src/routes/workflow.ts` | 동 | 단순 복사 |
| `packages/fx-agent/src/services/(N)` | 8 routes 의존 services | api/src/core/agent/services/* copy (직접 + 간접) |
| `packages/fx-agent/src/services/custom-role-manager.ts` | harness service copy | api/src/core/harness/services/custom-role-manager.ts 복사 + 주석 |
| `packages/fx-agent/src/services/transition-guard.ts` | harness service copy | api/src/core/harness/services/transition-guard.ts 복사 + 주석 |
| `packages/fx-agent/src/__tests__/auth-guard.test.ts` | TDD Red → Green | §4.1 |
| `packages/fx-agent/src/__tests__/helpers/mock-d1.ts` | mock D1 helper | fx-offering 복사 |

### §5.2 services 이전 범위 (8 routes 직접 + 간접 의존)

8 routes가 사용하는 agent services (실측 25개 + harness 2 copy):

```
agent-adapter-factory.ts
agent-adapter-registry.ts
agent-feedback-loop.ts        # ← agent.ts 미포함이라 사용 여부 재확인
agent-marketplace.ts          # ← 동일
agent-orchestrator.ts         # ← 동일
agent-runner.ts               # ← 동일
agent-self-reflection.ts      # ← 동일
architect-agent.ts            # ← 동일
claude-api-runner.ts
command-registry.ts           # service (route와 동명)
context-passthrough.ts        # service
diagnostic-collector.ts       # meta service
ensemble-voting.ts
execution-event-service.ts
execution-types.ts
fallback-chain.ts
infra-agent.ts
meta-agent.ts                 # meta service
meta-approval.ts              # meta service
model-comparisons.ts          # meta service
model-router.ts
planner-agent.ts              # ← agent.ts 미포함이라 제외 가능
prompt-gateway.ts             # ← agent.ts 미포함이라 제외 가능
proposal-apply.ts             # meta service
proposal-rubric.ts            # meta service
qa-agent.ts                   # ← agent.ts 미포함이라 제외 가능
reviewer-agent.ts
security-agent.ts
task-state-service.ts
test-agent.ts
workflow-engine.ts
+ harness copy:
custom-role-manager.ts
transition-guard.ts
```

> **구현 단계 정리 작업**: agent.ts 미포함이므로 planner-agent / prompt-gateway / agent-feedback-loop / agent-marketplace / agent-orchestrator / agent-runner / agent-self-reflection / architect-agent / qa-agent 등이 실제 8 routes에서 import되는지 transitively 재확인 필요 (Green Phase에서 typecheck 의존). 미사용 services는 fx-agent에 복사하지 않음.

### §5.3 수정 (fx-gateway)

| 파일 | 변경 내용 |
|------|----------|
| `packages/fx-gateway/wrangler.toml` | `[[services]] AGENT = fx-agent` 추가 (production + env.dev). 다른 binding과 동일 패턴 |
| `packages/fx-gateway/src/app.ts` | F571 라우팅 10줄 추가 — 위치는 catch-all `/api/*` (line 145) **위쪽** |

```typescript
// F571: /api/agent-* + /api/command-registry/* + /api/context-passthroughs/* + /api/execution-events* + /api/meta/* + /api/task-states/* + /api/orgs/:orgId/workflows* → fx-agent
app.all("/api/agent-adapters/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/agent-definitions/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/command-registry/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/context-passthroughs/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/execution-events", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/execution-events/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/meta/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/task-states/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/orgs/:orgId/workflows", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
app.all("/api/orgs/:orgId/workflows/*", async (c) => {
  return c.env.AGENT.fetch(c.req.raw);
});
```

> `GatewayEnv` 타입에 `AGENT: Fetcher` 필드 추가 (`packages/fx-gateway/src/env.ts`). 기존 5 bindings(MAIN_API/DISCOVERY/SHAPING/OFFERING/MODULES) 모두 `Fetcher` 타입 사용 — 일관성 유지.

### §5.4 수정 (api) — 최소

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/app.ts` | **변경 없음** — 8 routes mount 유지 (gateway에서 분기되므로 도달 안 됨, 잔여 7 routes 위해 보존) |
| `packages/api/src/core/agent/` | **변경 없음** — Phase 46에서 일괄 정리 |

### §5.5 삭제 — 없음

`core/agent/*` 잔존. Phase 46 이관 후 일괄 삭제.

### §5.6 SPEC.md 갱신

| 변경 위치 | Before | After |
|-----------|--------|-------|
| §5 F571 row 상태 | `📋(groomed)` | `🔧(impl)` (Sprint 320 진행 중) → `✅` (merge 후) |
| §5 F571 비고 | "PRD §3-1 F571. 최고 리스크 도메인, 최후 배치." | "Sprint 320 8 routes Walking Skeleton ✅ + 7 routes Phase 46 (FX-PLAN-320 deviation 명시)" |
| §2 마지막 실측 | (Sprint 319 기준) | Sprint 320 추가 시 갱신 (`/ax:session-end` 자동) |

## §6 Phase Exit P1~P4 (Smoke Reality)

| # | 항목 | 검증 방법 |
|---|------|----------|
| **P1** | prod /api/agent-adapters 실호출 | `curl -H "Authorization: Bearer $TOKEN" https://foundry-x-gateway.ktds-axbd.workers.dev/api/agent-adapters` → 200. `wrangler tail fx-agent` 30초 — runtime error 0건 |
| **P2** | 8 paths 200 응답 (auth된 상태) | curl × 8 (각 route prefix 1건씩) — 모두 200 또는 정상 200/404 (id 미존재 시) |
| **P3** | KPI 실측 — Service Binding latency | `curl + time` 측정. fx-agent route ≤ MAIN_API 동일 route + 50ms 이내 (Service Binding overhead 검증). Cloudflare Workers logs로 P50/P95 추출 |
| **P4** | 회고 작성 | `docs/dogfood/sprint-320-agent-walking-skeleton.md` — Dogfood 시나리오 1건 (예: command-registry 등록 → context-passthrough 저장 → execution-events 조회 chain) 실 호출 결과 + 발견된 갭 |

## §7 FAIL 조건

1. fx-gateway에서 8 paths 중 1개라도 MAIN_API로 라우팅 (AGENT binding 미동작 또는 catch-all 우선순위 역전)
2. fx-agent 401 → 200 호출 chain 깨짐 (auth middleware 결함)
3. typecheck FAIL (api / fx-agent / fx-gateway 어느 패키지든)
4. lint FAIL (no-cross-domain-import 위반 발견 — agent → harness/discovery/shaping/offering RUNTIME import 잔존)
5. Walking Skeleton 패턴 깨짐: catch-all `/api/*` 도달 실패 (잔여 7 routes 호출 시 200 미응답)
6. Phase Exit P1~P4 미충족 (특히 P3 latency overhead > 50ms 시 재검토)
7. Gap Match Rate < 90% (Design ↔ Implementation)

## §8 리스크 + 대응

| ID | 리스크 | 대응 |
|----|--------|------|
| R-Sprint320-1 | 8 routes services dependency closure 정확도 — 미사용 service까지 복사 시 fx-agent 비대화 | Green Phase에서 `pnpm typecheck` + `pnpm test` PASS 후 미사용 service 정리. 의존 그래프는 transitive (depth ≥ 3) |
| R-Sprint320-2 | harness 2 services copy → drift | 주석 명시 + Phase 46에서 harness-kit으로 일괄 추출 시 즉시 보정 |
| R-Sprint320-3 | fx-gateway 라우팅 선등록 우선순위 위반 (S299 collision) | catch-all `/api/*` 위쪽에 명시 위치 + line 145 (현재 catch-all) **이전** 라인에 추가 (Edit 도구 정확도 보장) |
| R-Sprint320-4 | fx-agent ↔ fx-gateway env.dev binding 누락 | wrangler.toml `[[env.dev.services]]` 섹션도 동시 추가 (B1 feedback memory 반영) |
| R-Sprint320-5 | JWT_SECRET 등 secret 미등록 — fx-agent prod 401 fail | `wrangler secret put JWT_SECRET --name fx-agent` 배포 전 사전 등록 (B1 feedback memory) |

## §9 후속 작업 (Phase 46 — Sprint 321~322 예정)

1. **잔여 7 routes 이관**: agent / streaming / orchestration / captured-engine / derived-engine / skill-registry / skill-metrics
2. **65 services 모듈화**: harness-kit 추출 + cross-domain dep 정리 (harness 14 + discovery 3 + offering 2 + shaping 1)
3. **core/agent api에서 일괄 삭제** + app.ts mount 제거
4. **fx-agent ↔ fx-* (discovery/shaping/offering) Service Binding 상호 연결** (필요 시)
5. **D1 schema 분리 검토** (Option A: 도메인별 D1 분리, Phase 47 후보)
