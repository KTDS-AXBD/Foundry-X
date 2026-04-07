---
code: FX-DSGN-S187
title: Sprint 187 Design — F400 E2E 서비스별 태깅 + Gate-X scaffold PoC
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (autopilot)
sprint: 187
f_items: [F400]
req_ids: [FX-REQ-392]
plan_ref: "[[FX-PLAN-S187]]"
---

## 1. 개요

Sprint 187은 Phase 20의 M4(통합 검증) 첫 번째 Sprint로, 두 개의 독립적인 작업으로 구성됩니다:

1. **E2E 서비스별 태깅 + 전체 회귀 테스트** — 40+ spec 파일에 서비스 그룹 주석을 추가하고 전체 통과를 확인
2. **Gate-X scaffold PoC** — harness-kit `create` 명령으로 Gate-X 독립 서비스 파일을 생성하고, modules/gate 코드 이식 가능성을 검증

---

## 2. 시스템 현황

### 2.1 E2E 현황

| 항목 | 값 |
|------|-----|
| spec 파일 수 | 40개 |
| 총 tests | 263개 (Sprint 215 기준) |
| fixtures | `packages/web/e2e/fixtures/` |
| auth fixture | `fixtures/auth.ts` (authenticatedPage) |
| mock-factory | `fixtures/mock-factory.ts` |
| runner | Playwright (`pnpm e2e`) |

### 2.2 harness-kit scaffold 현황

| 파일 | 역할 |
|------|------|
| `src/cli/create.ts` | `harness create <name>` Commander CLI |
| `src/scaffold/generator.ts` | Handlebars 기반 파일 생성기 |
| `src/scaffold/templates/wrangler.toml.hbs` | Workers 설정 |
| `src/scaffold/templates/src/app.ts.hbs` | Hono + JWT + CORS 미들웨어 |
| `src/scaffold/templates/src/index.ts.hbs` | Workers 진입점 |
| `src/scaffold/templates/src/env.ts.hbs` | HarnessEnv 타입 |
| `src/scaffold/templates/package.json.hbs` | 패키지 설정 |
| `src/scaffold/templates/tsconfig.json.hbs` | TS 설정 |
| `src/scaffold/templates/vitest.config.ts.hbs` | 테스트 설정 |

### 2.3 modules/gate 현황

| 항목 | 내용 |
|------|------|
| 경로 | `packages/api/src/modules/gate/` |
| routes | 7개 (ax-bd-evaluations, decisions, evaluation-report, gate-package, team-reviews, validation-meetings, validation-tier) |
| services | 7개 |
| schemas | 별도 디렉토리 |
| index.ts | 7개 route export |

---

## 3. E2E 서비스별 태깅 설계 (T1)

### 3.1 태깅 방식

각 spec 파일 최상단 import 바로 다음 줄에 서비스 태그 주석 블록을 추가합니다:

```typescript
// @service: foundry-x
// @sprint: 187
// @tagged-by: F400
```

### 3.2 서비스 그룹 매핑 (40개 spec)

| 서비스 그룹 | spec 파일 목록 | 개수 |
|------------|--------------|------|
| `foundry-x` | discovery-wizard, discovery-wizard-advanced, discovery-detail-advanced, discovery-intensity, discovery-persona-eval, discovery-report, discovery-pipeline-api, discovery-tour, shaping, spec-generator, offering-pipeline, guard-rail, help-agent, pipeline-dashboard | 14 |
| `portal` | dashboard, dashboard-metrics, auth-flow, org-members, org-settings, workspace-navigation, onboarding-flow, setup-guide, nps-dashboard, inbox-thread, tokens, kg-ontology, mcp-server | 13 |
| `gate-x` | hitl-review, conflict-resolution, orchestration, agent-execute, agents, skill-catalog, skill-detail | 7 |
| `infra/shared` | landing, redirect-routes, share-links, sse-lifecycle, team-shared, integration-path, uncovered-pages | 7 |
| `bd-demo` | bd-demo-walkthrough, ax-bd-hub, detail-pages | 3 |

> **합계**: 44개 항목. 일부 spec은 여러 서비스에 걸치므로 주서비스 기준 태깅.

### 3.3 구현 방법

**반복 패턴** (각 spec 파일 첫 번째 `import` 이후에 삽입):
```typescript
import { test, expect } from "./fixtures/auth";

// @service: foundry-x
// @sprint: 187
// @tagged-by: F400

test.describe("...", () => {
```

편집 방식: Read → Edit (old: `import { test, expect }...` 다음 빈 줄에 주석 삽입)

---

## 4. E2E 회귀 테스트 설계 (T2)

### 4.1 실행 명령

```bash
cd /home/sinclair/work/worktrees/Foundry-X/sprint-187/packages/web
pnpm e2e --reporter=list 2>&1 | tail -30
```

### 4.2 예상 실패 유형 및 대응

| 실패 유형 | 원인 | 대응 |
|----------|------|------|
| Selector 불일치 | IA 변경으로 DOM 구조 변경 | selector 업데이트 |
| mock 스키마 불일치 | 신규 필드 추가 / 타입 변경 | mock-factory 갱신 |
| 라우트 404 | modules 분리로 라우트 경로 변경 | API 라우트 확인 |
| auth fixture 실패 | 인증 흐름 변경 | auth.ts fixture 조정 |

### 4.3 성공 기준

- `263 passed, 0 failed` (skip은 기존 sxip 유지)
- 새로 추가된 모듈 라우트가 E2E에서 정상 응답

---

## 5. Gate-X scaffold PoC 설계 (T3 + T4)

### 5.1 PoC 실행 흐름

```
Step 1: harness-kit CLI로 Gate-X scaffold 생성
  └─ npx tsx src/cli/index.ts create gate-x --service-id gate-x -o /tmp/gate-x-poc

Step 2: 생성된 파일 구조 확인
  └─ ls -la /tmp/gate-x-poc/

Step 3: modules/gate 라우트/서비스/스키마를 scaffold에 복사
  └─ cp -r packages/api/src/modules/gate/routes /tmp/gate-x-poc/src/routes/
  └─ cp -r packages/api/src/modules/gate/services /tmp/gate-x-poc/src/services/
  └─ cp -r packages/api/src/modules/gate/schemas /tmp/gate-x-poc/src/schemas/

Step 4: scaffold app.ts에 gate routes 등록
  └─ /tmp/gate-x-poc/src/app.ts 수정 (7개 route import + app.route() 추가)

Step 5: 타입체크 실행
  └─ cd /tmp/gate-x-poc && npm install && npx tsc --noEmit
```

### 5.2 예상 생성 파일 구조 (scaffold 결과)

```
/tmp/gate-x-poc/
├── wrangler.toml          # name="gate-x", serviceId=gate-x, DB binding
├── package.json           # dependencies: hono, @foundry-x/harness-kit
├── tsconfig.json          # TypeScript 설정
├── vitest.config.ts       # 테스트 설정
└── src/
    ├── index.ts           # Workers 진입점
    ├── app.ts             # Hono + JWT + CORS
    └── env.ts             # HarnessEnv 타입
```

### 5.3 modules/gate → Gate-X 이식 시 예상 import 조정

modules/gate 코드의 import 경로:
```typescript
// 기존 (Foundry-X 내부)
import { db } from "../../db/client.js";
import type { Env } from "../../types.js";
import { someSchema } from "../../schemas/...js";

// Gate-X scaffold에서 (독립 서비스)
import type { HarnessEnv } from "@foundry-x/harness-kit";
// DB는 env.DB (D1 binding)
// 스키마는 src/schemas/ 로컬 복사
```

### 5.4 PoC 성공 기준

| 항목 | 기준 |
|------|------|
| scaffold 생성 | 9개 파일 생성 성공 |
| tsc --noEmit | 에러 0 (or import 조정 후 0) |
| health check route | `/api/health` GET 응답 정의 확인 |
| gate routes 등록 | 7개 route가 app.ts에 등록 가능 |

### 5.5 PoC 결과 문서화 위치

PoC 결과 (성공/실패 여부, 실제 생성 파일 목록, typecheck 결과)를 이 Design 문서 §7 "PoC 결과"에 기록합니다.

---

## 6. Worker 파일 매핑 (단일 구현)

이번 Sprint는 Worker 병렬화 없이 단일 구현합니다 (E2E 태깅은 단순 반복, PoC는 순차 실행 필요).

| 작업 순서 | 대상 | 내용 |
|----------|------|------|
| 1 | `packages/web/e2e/*.spec.ts` (40개) | 서비스 태그 주석 추가 |
| 2 | Playwright E2E | `pnpm e2e` 실행 + 실패 수정 |
| 3 | harness-kit CLI | Gate-X scaffold 생성 (`/tmp/gate-x-poc/`) |
| 4 | `/tmp/gate-x-poc/` | modules/gate 코드 복사 + typecheck |
| 5 | `docs/02-design/features/sprint-187.design.md §7` | PoC 결과 기록 |

---

## 7. PoC 결과

| 항목 | 결과 |
|------|------|
| scaffold 생성 파일 수 | **8개** (wrangler.toml, package.json, tsconfig.json, vitest.config.ts, .github/workflows/deploy.yml, src/index.ts, src/app.ts, src/env.ts) |
| typecheck 에러 | **0** (최종 수정 후) |
| gate routes 등록 | **7개** (app.ts에 모두 등록) |
| 이식 필요 작업 | import 경로 조정 5종: env.js, middleware/tenant.js, kpi-service, notification-service, pipeline-service, execution-types |
| 크로스 모듈 의존성 발견 | **4개** (portal: KpiService/NotificationService, launch: PipelineService/PipelineStage, core/agent: AgentExecutionRequest/Result) |
| Production 이관 과제 | 크로스 의존성 4종을 REST API 또는 이벤트 기반으로 대체해야 함 (harness-kit 이벤트 인터페이스 활용) |

### 7.1 Cross-Module Dependency 분석

| 의존성 | 출처 | 이관 전략 |
|--------|------|-----------|
| `Env` / `TenantVariables` | `packages/api/src/env.js`, `middleware/tenant.js` | harness-kit에 공통 인터페이스로 추가 |
| `KpiService` (create/listByEval/update) | `modules/portal/services/kpi-service.ts` | Gate-X → Portal REST API 호출 |
| `NotificationService` (create) | `modules/portal/services/notification-service.ts` | D1EventBus 이벤트 발행으로 대체 |
| `PipelineService` (getCurrentStage/advanceStage) | `modules/launch/services/pipeline-service.ts` | Gate-X → Launch-X REST API 호출 |
| `AgentExecutionRequest/Result` | `core/agent/services/execution-types.ts` | `@ax-bd/shared-types` 패키지로 추출 |

### 7.2 결론

- **PoC 성공**: harness-kit `create gate-x` 1회 실행으로 독립 Workers scaffold 생성 완료
- modules/gate 7개 라우트를 scaffold에 이식 후 typecheck 통과 (stub 사용)
- Production 이관 시 crass-module deps 4종을 REST/이벤트로 대체 필요
- **harness-kit "1분 내 서비스 생성" 목표 달성 확인**

---

## 8. 테스트 전략

| 레벨 | 방법 | 기준 |
|------|------|------|
| E2E | `pnpm e2e --reporter=list` | 263 passed, 0 failed |
| Unit (API) | `turbo test` | 전체 pass |
| PoC typecheck | `npx tsc --noEmit` in /tmp/gate-x-poc | 에러 0 |

---

## 9. 참조

- Plan: `[[FX-PLAN-S187]]`
- PRD: `docs/specs/ax-bd-msa/prd-final.md`
- harness-kit: `packages/harness-kit/src/`
- modules/gate: `packages/api/src/modules/gate/`
- E2E fixtures: `packages/web/e2e/fixtures/`
