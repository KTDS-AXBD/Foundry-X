---
sprint: 314
feature: F563
req: FX-REQ-606
status: plan
date: 2026-04-21
---

# Sprint 314 Plan — F563: fx-shaping E2E + KOAMI P2 완결

## 목표

F540 partial 잔존 4가지를 완결한다:
1. (a) api/core/shaping/routes 13개 dead code 제거 (F540 partial proxy 제거)
2. (b) KOAMI P2 deferred 케이스 분석 + 구현 (bi-koami-001 shaping 실측)
3. (c) Shaping Graph E2E — bi-koami-001 proposals ≥ 1건 실측 (실제 D1 INSERT 확인)
4. (d) Phase Exit P1~P4 Smoke Reality — 실전 dogfood 1회 이상

## 현재 상태 분석 (2026-04-21)

### (a) 이관 현황
- `packages/fx-shaping/src/routes/` — 15개 route 파일 (F540 13개 + F560 2개 추가) ✅
- `packages/fx-gateway/src/app.ts` — `/api/shaping/*`, `/api/ax-bd/*` → SHAPING Service Binding ✅
- `packages/api/src/app.ts` — shaping routes 등록 제거 완료 (F540) ✅
- **`packages/api/src/core/shaping/routes/`** — 13개 파일 **dead code** 잔존 ❌
- `packages/api/src/core/shaping/services/` — 여전히 discovery/offering/agent/harness/collection에서 import (유지 필요)
- `packages/api/src/core/shaping/schemas/` — 여전히 offering/harness/collection에서 import (유지 필요)

### (b+c) KOAMI P2 현황
- F540 Sprint 297 smoke reality 미완료:
  `[ ] KOAMI bi-koami-001 Shaping 단계 Graph proposals >= 1건 (배포 후 검증 필요)`
- fx-shaping/__tests__/ 는 auth(401) 체크만 있음 (D1 INSERT 테스트 없음)
- bi-koami-001 fixture: `packages/api/src/fixtures/discovery-reports/bi-koami-001.json` 존재

## 작업 계획

### Phase A: Dead code 제거 (a)

**삭제 대상:**
1. `packages/api/src/core/shaping/routes/` 디렉토리 전체 (13개 파일)
   - ax-bd-agent.ts, ax-bd-bmc.ts, ax-bd-comments.ts, ax-bd-history.ts
   - ax-bd-links.ts, ax-bd-persona-eval.ts, ax-bd-progress.ts
   - ax-bd-prototypes.ts, ax-bd-skills.ts, ax-bd-viability.ts
   - persona-configs.ts, persona-evals.ts, shaping.ts
2. `packages/api/src/core/shaping/index.ts` — route export 제거 (서비스/스키마 export 유지)
3. `packages/api/src/__tests__/` 에서 dead route를 import하는 테스트 파일들:
   - shaping.test.ts (→ fx-shaping에서 대체)
   - prototype-review.test.ts (일부), ax-bd-skills.test.ts
   - bmc-agent.test.ts, ax-bd-comments.test.ts, ax-bd-prototypes.test.ts
   - bd-progress-route.test.ts, sprint-222-prototype-build.test.ts, bmc-history.test.ts

**유지 대상:**
- `packages/api/src/core/shaping/services/` — 타 도메인 활성 import 유지
- `packages/api/src/core/shaping/schemas/` — 타 도메인 활성 import 유지

### Phase B: fx-shaping D1 통합 테스트 추가 (b+c)

**추가 대상:**
1. `packages/fx-shaping/package.json` — `better-sqlite3` devDependency 추가
2. `packages/fx-shaping/src/__tests__/helpers/mock-d1.ts` — shaping 테이블 스키마 포함 SQLite mock
3. `packages/fx-shaping/src/__tests__/shaping-d1-insert.test.ts` — F563 핵심 테스트:
   - POST /api/shaping/runs (bi-koami-001 bizItemId)
   - D1 INSERT 확인: `shaping_runs` 행 ≥ 1
   - Phase log, review 생성 확인
4. `packages/fx-shaping/src/__tests__/shaping-routes-functional.test.ts` — CRUD 기능 테스트 (13 EP)

### Phase C: Phase Exit Reality (d)

- 프로덕션 배포 후 bi-koami-001 shaping run 생성 확인
- D1 shaping_runs 테이블에 행 ≥ 1 확인 (Cloudflare D1 API 조회)
- 회고 작성: `docs/04-report/features/sprint-314-f563-report.md`

## 파일 변경 매핑

| 파일 | 변경 | 분류 |
|------|------|------|
| `packages/api/src/core/shaping/routes/` (×13) | **삭제** | Dead code |
| `packages/api/src/core/shaping/index.ts` | 수정 (route export 제거) | Cleanup |
| `packages/api/src/__tests__/shaping.test.ts` | **삭제** | Dead test |
| `packages/api/src/__tests__/ax-bd-skills.test.ts` | **삭제** | Dead test |
| `packages/api/src/__tests__/bmc-agent.test.ts` | 수정 (route import 제거) | Cleanup |
| `packages/api/src/__tests__/ax-bd-comments.test.ts` | 수정 (route import 제거) | Cleanup |
| `packages/api/src/__tests__/ax-bd-prototypes.test.ts` | **삭제** | Dead test |
| `packages/api/src/__tests__/bd-progress-route.test.ts` | **삭제** | Dead test |
| `packages/api/src/__tests__/sprint-222-prototype-build.test.ts` | 수정 (route import 제거) | Cleanup |
| `packages/api/src/__tests__/bmc-history.test.ts` | **삭제** | Dead test |
| `packages/api/src/__tests__/prototype-review.test.ts` | 수정 (route import 제거) | Cleanup |
| `packages/fx-shaping/package.json` | better-sqlite3 추가 | New dep |
| `packages/fx-shaping/src/__tests__/helpers/mock-d1.ts` | **신규** | Test infra |
| `packages/fx-shaping/src/__tests__/shaping-d1-insert.test.ts` | **신규** | TDD Red→Green |
| `packages/fx-shaping/src/__tests__/shaping-routes-functional.test.ts` | **신규** | Functional test |
| `docs/04-report/features/sprint-314-f563-report.md` | **신규** | Phase Exit |

## 성공 기준

- [ ] `grep -rn "core/shaping/routes" packages/api/src/` 결과 0건
- [ ] `pnpm typecheck` (api + fx-shaping) PASS
- [ ] `pnpm test` (api 포함) PASS — 삭제된 테스트 제외
- [ ] fx-shaping `shaping-d1-insert.test.ts` PASS — D1 INSERT 확인
- [ ] 프로덕션 bi-koami-001 shaping_runs ≥ 1건 실측
- [ ] Match Rate ≥ 95%

## TDD 전략

- **Red Phase**: shaping-d1-insert.test.ts 먼저 작성 (better-sqlite3 없어 FAIL)
- **Green Phase**: better-sqlite3 추가 + mock-d1.ts 작성 → PASS
- **Refactor**: shaping-routes-functional.test.ts 추가
