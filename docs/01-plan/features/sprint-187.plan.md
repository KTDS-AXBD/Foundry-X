---
code: FX-PLAN-S187
title: Sprint 187 — F400 E2E 서비스별 태깅 + Gate-X scaffold PoC
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (autopilot)
sprint: 187
f_items: [F400]
req_ids: [FX-REQ-392]
phase: 20
milestone: M4
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F400 — E2E 서비스별 태깅 + IA 변경 E2E 검증 + 전체 회귀 테스트 + Gate-X scaffold PoC |
| Sprint | 187 |
| Phase | 20 (AX BD MSA 재조정) / M4 (통합 검증) |
| REQ | FX-REQ-392 |
| 목표 | E2E 263개 전체 통과 + Gate-X PoC 서비스 독립 동작 확인 |

### 1.3 Value Delivered (4-Perspective)

| 관점 | 내용 |
|------|------|
| Problem | Phase 20-A/B 모듈화 + harness-kit + Strangler 프록시 작업 이후, E2E 회귀 검증이 없어 서비스 분리 작업의 안전성을 보장할 수 없음 |
| Solution | E2E 전체 통과 확인(회귀 안전망) + harness-kit `create` 명령으로 Gate-X scaffold 생성 PoC, modules/gate 코드가 독립 Workers로 동작 가능한지 검증 |
| Function / UX Effect | 개발팀이 "분리 가능성"을 실제 코드로 검증받은 상태에서 Sprint 188 Production 배포에 자신감 있게 진입 가능 |
| Core Value | Phase 20의 핵심 목표인 "harness-kit 기반 1분 내 새 서비스 생성"의 실제 검증 — Gate-X scaffold PoC가 이를 증명 |

---

## 1. 컨텍스트

### 1.1 이전 Sprint 완료 현황

| Sprint | F-item | 내용 | 상태 |
|--------|--------|------|------|
| 179 | F392 | 118 라우트/252 서비스 서비스별 태깅 + D1 소유권 태깅 | ✅ |
| 180 | F394 | harness-kit 패키지 — Workers scaffold + D1 + JWT + CORS + 이벤트 | ✅ |
| 181 | F395 | Auth/SSO → modules/auth/ 분리 | ✅ |
| 182 | F396 | Dashboard/KPI + Wiki → modules/portal/ 분리 | ✅ |
| 183 | F397 | 검증 → modules/gate/ + 제품화/GTM → modules/launch/ 분리 | ✅ |
| 184 | F398 | Foundry-X 코어 의존성 정리 (core/discovery + core/shaping) | ✅ |
| 185 | F399(part) | harness-kit 이벤트 유틸리티 (D1EventBus + createEvent) | ✅ |
| 186 | F399 | Strangler Fig 프록시 레이어 + harness-kit 이벤트 유틸리티 완료 | ✅ |

### 1.2 현재 코드베이스 상태

| 항목 | 현황 |
|------|------|
| modules/ | auth/, gate/, launch/, portal/, index.ts — 4 모듈 분리 완료 |
| packages/harness-kit | src/cli/create.ts, src/scaffold/generator.ts + templates — scaffold 생성 가능 |
| packages/web/e2e | 40+ spec 파일, 263 tests (Sprint 215 기준) |
| modules/gate/routes | 7개 (ax-bd-evaluations, decisions, evaluation-report, gate-package, team-reviews, validation-meetings, validation-tier) |
| modules/gate/services | 7개 |
| modules/gate/schemas | 별도 |

---

## 2. 목표 (F400)

### 2.1 Task 분류

| Task | 내용 | 우선순위 |
|------|------|----------|
| T1 | E2E 서비스별 태깅 — spec 파일에 서비스 그룹 주석 + test.describe 그룹화 | P1 |
| T2 | E2E 전체 회귀 테스트 실행 + 실패 spec 수정 | P0 |
| T3 | harness-kit `create gate-x` 명령 실행 → Gate-X scaffold 생성 PoC | P1 |
| T4 | modules/gate/ 코드를 Gate-X scaffold에 복사 → 독립 동작 검증 (build + typecheck) | P1 |

### 2.2 성공 기준

- [ ] `pnpm e2e` 전체 통과 (263 tests, fail 0)
- [ ] E2E spec 파일에 서비스 그룹 태그 추가 (`// @service: foundry-x | gate-x | portal` 등)
- [ ] `harness create gate-x --service-id gate-x` 실행 → scaffold 파일 생성 성공
- [ ] Gate-X scaffold에 modules/gate 코드 복사 후 `tsc --noEmit` 통과
- [ ] 전체 API + CLI 테스트 통과 (`turbo test`)

---

## 3. 구현 전략

### 3.1 T1: E2E 서비스별 태깅

E2E spec 파일 40+개를 서비스별로 그룹화:

| 서비스 그룹 | 해당 spec 파일 |
|------------|--------------|
| `foundry-x` (core) | discovery-wizard, discovery-detail, discovery-intensity, discovery-persona-eval, discovery-report, shaping, spec-generator, offering-pipeline, guard-rail, help-agent, pipeline-dashboard |
| `portal` | dashboard, auth-flow, org-members, org-settings, workspace-navigation, onboarding-flow, setup-guide, nps-dashboard, inbox-thread, tokens, kg-ontology, wiki |
| `gate-x` | hitl-review, conflict-resolution, orchestration, agent-execute, agents, skill-catalog, skill-detail |
| `infra/shared` | landing, redirect-routes, share-links, sse-lifecycle, team-shared, integration-path, uncovered-pages |
| `bd-demo` | bd-demo-walkthrough, ax-bd-hub, discovery-pipeline-api, discovery-tour |

각 spec 파일 상단에 주석 추가:
```ts
// @service: foundry-x
// Sprint 187 — F400 서비스별 태깅
```

### 3.2 T2: E2E 회귀 테스트

```bash
cd packages/web && pnpm e2e --reporter=list 2>&1 | tail -20
```

실패 시 각 spec 별 원인 파악 후 수정 (mock-factory 스키마, selector 변경, IA 변경 반영).

### 3.3 T3: Gate-X scaffold PoC

```bash
cd packages/harness-kit
npx tsx src/cli/index.ts create gate-x --service-id gate-x --db-name gate-x-db -o /tmp/gate-x-poc
```

예상 생성 파일:
- `wrangler.toml` — Gate-X Workers 설정
- `src/index.ts` — Hono 앱 진입점 + JWT 미들웨어
- `src/routes/` — 기본 라우트 구조
- `package.json`, `tsconfig.json`, `vitest.config.ts`

### 3.4 T4: modules/gate 코드 Gate-X scaffold 복사 + 독립 동작 검증

1. `/tmp/gate-x-poc/` scaffold에 `packages/api/src/modules/gate/` 코드 복사
2. import 경로 조정 (shared 타입 → 상대 경로 또는 패키지 참조)
3. `cd /tmp/gate-x-poc && npx tsc --noEmit` — 타입 에러 0 목표
4. PoC 결과를 `docs/02-design/features/sprint-187.design.md`에 기록

---

## 4. 위험 요소

| 위험 | 가능성 | 대응 |
|------|--------|------|
| E2E 실패 (IA 변경으로 selector 깨짐) | 중 | spec별 수정, 필요시 selector 업데이트 |
| Gate-X scaffold typecheck 실패 (import 경로) | 중 | shared 타입 복사 또는 상대 경로 조정 |
| harness-kit create CLI 오류 | 낮 | CLI 코드 직접 디버깅 |
| E2E 환경 (Playwright) dev server 미구동 | 낮 | `pnpm dev` 병행 또는 mock 모드 확인 |

---

## 5. 파일 변경 예상

| 파일/디렉토리 | 변경 유형 | 설명 |
|-------------|----------|------|
| `packages/web/e2e/*.spec.ts` (40+개) | 수정 | 서비스 태그 주석 추가 + 회귀 수정 |
| `/tmp/gate-x-poc/` | 신규 (PoC, 리포 외) | Gate-X scaffold PoC |
| `docs/02-design/features/sprint-187.design.md` | 신규 | PoC 결과 포함 Design 문서 |
| `docs/01-plan/features/sprint-187.plan.md` | 신규 | 이 문서 |

---

## 6. 참조 문서

| 문서 | 경로 |
|------|------|
| Phase 20 PRD | `docs/specs/ax-bd-msa/prd-final.md` |
| 서비스 매핑 | `docs/specs/ax-bd-msa/service-mapping.md` (Sprint 179 산출물) |
| harness-kit | `packages/harness-kit/` |
| modules/gate | `packages/api/src/modules/gate/` |
| E2E fixtures | `packages/web/e2e/fixtures/` |
