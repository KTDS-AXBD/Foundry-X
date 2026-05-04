---
id: FX-DESIGN-334
sprint: 334
feature: F588
req: FX-REQ-655
status: approved
date: 2026-05-04
---

# Sprint 334 Design — F588: work 도메인 본격 분리

## §1 목표

F587 시드(traceability.service.ts) 위에 routes/work + services/work.{service,kg.service} 4 files를 `core/work/` 도메인으로 이동하여 work 도메인 closure 완성.

## §2 분석 결과

### 이동 대상 4 files

| 원본 | 대상 | 비고 |
|------|------|------|
| `routes/work.ts` | `core/work/routes/work.ts` | workRoute |
| `routes/work-public.ts` | `core/work/routes/work-public.ts` | workPublicRoute |
| `services/work.service.ts` | `core/work/services/work.service.ts` | 21907B |
| `services/work-kg.service.ts` | `core/work/services/work-kg.service.ts` | 9547B |

### Import 경로 변경 매핑 (TDD 면제 — 순수 git mv + path 갱신)

**`core/work/routes/work.ts`** (routes/work.ts 이동 후):

| 기존 | 변경 후 |
|------|---------|
| `"../schemas/work.js"` | `"../../../schemas/work.js"` |
| `"../env.js"` | `"../../../env.js"` |
| `"../services/work.service.js"` | `"../services/work.service.js"` (sibling — **변경 없음**) |
| `"../core/work/services/traceability.service.js"` | `"../services/traceability.service.js"` |
| `"../services/work-kg.service.js"` | `"../services/work-kg.service.js"` (sibling — **변경 없음**) |

**`core/work/routes/work-public.ts`** (routes/work-public.ts 이동 후):

| 기존 | 변경 후 |
|------|---------|
| `"../env.js"` | `"../../../env.js"` |
| `"../services/work.service.js"` | `"../services/work.service.js"` (sibling — **변경 없음**) |
| `"../services/work-kg.service.js"` | `"../services/work-kg.service.js"` (sibling — **변경 없음**) |

**`core/work/services/work.service.ts`** (services/work.service.ts 이동 후):

| 기존 | 변경 후 |
|------|---------|
| `"../env.js"` | `"../../../env.js"` |
| `"./sse-manager.js"` | `"../../../services/sse-manager.js"` |

**`core/work/services/work-kg.service.ts`** (services/work-kg.service.ts 이동 후):

| 기존 | 변경 후 |
|------|---------|
| `"../env.js"` | `"../../../env.js"` |
| `"../core/work/services/traceability.service.js"` | `"./traceability.service.js"` (sibling) |

## §3 변경 파일 전체 목록

### git mv (4 files)
1. `packages/api/src/routes/work.ts` → `packages/api/src/core/work/routes/work.ts`
2. `packages/api/src/routes/work-public.ts` → `packages/api/src/core/work/routes/work-public.ts`
3. `packages/api/src/services/work.service.ts` → `packages/api/src/core/work/services/work.service.ts`
4. `packages/api/src/services/work-kg.service.ts` → `packages/api/src/core/work/services/work-kg.service.ts`

### Import 갱신 (9건)
5. `packages/api/src/app.ts` — routes mount 2 path 갱신
6. `packages/api/src/core/work/routes/work.ts` — schemas + env + traceability 3 path 갱신
7. `packages/api/src/core/work/routes/work-public.ts` — env 1 path 갱신
8. `packages/api/src/core/work/services/work.service.ts` — env + sse-manager 2 path 갱신
9. `packages/api/src/core/work/services/work-kg.service.ts` — env + traceability 2 path 갱신
10. `packages/api/src/__tests__/work.service.test.ts` — WorkService import 1 path 갱신
11. `packages/api/src/__tests__/work-sessions.test.ts` — WorkService import 1 path 갱신
12. `packages/api/src/__tests__/work-kg.service.test.ts` — WorkKGService import 1 path 갱신

## §4 TDD 적용 여부

**면제** — 새 로직 없음, 순수 파일 이동 + import 경로 갱신. 회귀 검증(P-f typecheck + test GREEN)으로 대체.

## §5 OBSERVED P-a~P-i (Plan §3 그대로)

| # | 항목 | 검증 | 기대치 |
|---|------|------|--------|
| P-a | services/ 루트 work.service.ts + work-kg.service.ts = 0 | `find packages/api/src/services -maxdepth 1 \( -name "work.service.ts" -o -name "work-kg.service.ts" \) \| wc -l` | **0** |
| P-b | core/work/ 5 files | `find packages/api/src/core/work -type f -name "*.ts" \| wc -l` | **5** |
| P-c | services/ 루트 .ts 27 (29-2) | `ls packages/api/src/services/*.ts \| wc -l` | **27** |
| P-d | 외부 callers 잔존 OLD import 0건 | grep 잔존 확인 | **0** |
| P-e | routes/ 루트 work*.ts = 0 | `find packages/api/src/routes -maxdepth 1 -name "work*.ts" \| wc -l` | **0** |
| P-f | typecheck + test GREEN | turbo 전체 | **GREEN** |
| P-g | dual_ai_reviews sprint 334 자동 INSERT | wrangler d1 query | **≥ 1건** |
| P-h | F560~F587 회귀 0건 | 각 시그니처 grep | **PASS** |
| P-i | Match ≥ 90% | autopilot 평가 | **≥ 90%** |

> Note: Plan의 P-c는 29-4=25로 기재됐으나, routes/는 별도 dir이라 services/ 루트에서는 2 files만 제거 → **27**이 정확.
