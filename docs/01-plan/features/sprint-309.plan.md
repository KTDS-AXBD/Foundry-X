---
id: FX-PLAN-309
sprint: 309
f_items: [F541]
req_codes: [FX-REQ-580]
phase: "Phase 44"
status: plan
date: "2026-04-18"
---

# Sprint 309 Plan — F541 Offering 도메인 분리

## 목표

`packages/api`의 `core/offering` 도메인을 **fx-offering** 독립 Worker로 분리한다.
F540 fx-shaping 선례를 그대로 따르며, Sprint 1회 내 완료를 목표로 한다.

## 범위 (SPEC §5 F541 (a)~(g))

| 항목 | 내용 |
|------|------|
| (a) | `core/offering/*` 코드 + D1 offering_* 테이블 이전 → fx-offering Worker |
| (b) | fx-gateway Service Binding `OFFERING` 추가 + 라우팅 12경로 |
| (c) | packages/api app.ts 12 route mount 제거 + msa-lint 통과 |
| (d) | cross-domain import(shaping↔offering) 전수 grep + contract 분리 확인 |
| (e) | F540 Shaping 선례 활용 — Plan/Design 단순화 |
| (f) | Smoke Reality: bi-koami-001 Offering 단계 실행 |
| (g) | `docs/specs/axbd/shape/` relocation 사후 검증 — broken path refs 0건 |

## 신규 Package: packages/fx-offering

| 구성 | 설명 |
|------|------|
| `wrangler.toml` | name="fx-offering", D1/R2/AI/KV 바인딩 |
| `src/index.ts` | ExportedHandler |
| `src/app.ts` | Hono app — 12 routes |
| `src/env.ts` | OfferingEnv interface (DB, FILES_BUCKET, AI, JWT_SECRET, ANTHROPIC_API_KEY) |
| `src/middleware/` | auth.ts (JWT), tenant.ts (orgId guard) |
| `src/routes/` | 12개 — fx-shaping 선례로 OfferingEnv 타입 적용 |
| `src/services/` | 29개 — core/offering/services 적응 |
| `src/schemas/` | 19개 — core/offering/schemas 복사 |

## 주요 바인딩

| Binding | 이유 |
|---------|------|
| `DB` | D1 — offering_*, bdp_* 테이블 |
| `FILES_BUCKET` | R2 — offering-prototype HTML 서빙 |
| `AI` | Workers AI — bdp.ts ProposalGenerator |
| `CACHE` | KV — (선택, 향후 rate limiting) |
| `JWT_SECRET` | auth 필수 |
| `ANTHROPIC_API_KEY` | content-adapter, prd-generator AI 호출 |

## Gateway 라우팅 (15개 항목)

fx-gateway에 OFFERING Service Binding 추가 후:

```
/api/offerings/*                          → OFFERING (all)
/api/bdp/*                               → OFFERING (all)
/api/methodologies*                      → OFFERING (all)
/api/biz-items/:id/business-plan*        → OFFERING ⚠️ catch-all 앞 등록 필수
/api/biz-items/:id/methodology*          → OFFERING ⚠️ catch-all 앞 등록 필수
```

> ⚠️ 현재 gateway에 `/api/biz-items/:id` catch-all → DISCOVERY 있음.
> business-plan/methodology 경로는 반드시 먼저 등록해야 OFFERING으로 정상 라우팅됨.

## app.ts 제거 대상 (12 routes)

```
offeringsRoute, offeringSectionsRoute, offeringExportRoute,
offeringValidateRoute, offeringMetricsRoute, offeringPrototypeRoute,
designTokensRoute, contentAdapterRoute, bdpRoute, methodologyRoute,
businessPlanRoute, businessPlanExportRoute
```

## TDD 전략

- **Red Phase**: fx-offering health endpoint + 주요 route smoke 테스트 (vitest + Hono app.request)
- **Green Phase**: 전체 구현 후 PASS
- **E2E**: F535 Offering Graph 시나리오 재사용 (Playwright)

## 선제 체크리스트 (F540 교훈)

- [ ] pnpm lint PASS (pre-check 완료 ✅)
- [ ] scripts/msa-deploy-preflight.sh PASS (false positive 3건 확인, 실질 PASS ✅)
- [ ] TDD Red→Green 사이클 완료
- [ ] msa-lint 통과
- [ ] fx-offering dry-run deploy PASS
- [ ] Smoke Reality (g): path refs 0건 확인

## 예상 변경 파일

| 패키지 | 변경 | 파일 수 |
|--------|------|---------|
| packages/fx-offering/ | 신규 생성 | ~55개 |
| packages/api/src/app.ts | route mount 12개 제거 | 1개 |
| packages/fx-gateway/wrangler.toml | OFFERING binding 추가 | 1개 |
| packages/fx-gateway/src/app.ts | 라우팅 5경로 추가 | 1개 |
| packages/fx-gateway/src/env.ts | OfferingFetcher 추가 | 1개 |
| .github/workflows/deploy.yml | fx-offering paths-filter + step | 1개 |
| pnpm-workspace.yaml | fx-offering 추가 | 1개 |
| **합계** | | **~60개** |
