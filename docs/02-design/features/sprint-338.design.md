---
id: FX-DESIGN-338
sprint: 338
feature: F592
req: FX-REQ-659
status: approved
date: 2026-05-04
---

# Sprint 338 Design — F592: services/ 잔존 dead+sibling 2 files 정리 (옵션 D-a)

## 목표

services/ 루트에 남은 18 files 중 가장 보수적인 묶음 2 files만 처리:
- `entity-sync.ts` (0 callers, pure dead) → git rm
- `methodology-types.ts` (1 caller sibling) → git mv → `core/discovery/services/`

## §1 변경 파일 목록

| 작업 | 파일 | 설명 |
|------|------|------|
| git rm | `packages/api/src/services/entity-sync.ts` | 0 callers, pure dead code |
| git mv | `packages/api/src/services/methodology-types.ts` → `packages/api/src/core/discovery/services/methodology-types.ts` | 1 caller sibling natural move |
| import 갱신 | `packages/api/src/core/discovery/services/pm-skills-criteria.ts:6` | `../../../services/methodology-types.js` → `./methodology-types.js` |
| git rm (dist orphan) | `packages/api/dist/services/entity-sync.{js,js.map,d.ts,d.ts.map}` | tsc 자동 미정리 (S314 패턴) |
| git rm (dist orphan) | `packages/api/dist/services/methodology-types.{js,js.map,d.ts,d.ts.map}` | tsc 자동 미정리 (S314 패턴) |

## §2 변경 불가 (scope lock)

- `entity-registry.ts` → C105 Backlog C-track 보류 (도메인 모호)
- services/ 루트 나머지 14 files → 후속 사이클 (F593 spec-*, F594 sr-*, F595 infra cluster)

## §3 TDD 적용 여부

**면제**: 리팩토링/파일 이동. 신규 서비스 로직 없음. type-only import erasure로 runtime 영향 0.

## §4 검증 계획

1. `turbo typecheck` — 19/19 PASS (type-only import 갱신, 런타임 영향 0)
2. `turbo test` — 2308+ tests PASS (entity-sync 테스트 없음, methodology-types 테스트 없음)
3. P-a~P-k smoke reality (plan §OBSERVED 참조)

## §5 파일 매핑 (Design ↔ Implementation)

| Design 항목 | 구현 파일 | 작업 |
|------------|---------|------|
| entity-sync rm | `packages/api/src/services/entity-sync.ts` | git rm |
| methodology-types mv | `packages/api/src/services/methodology-types.ts` | git rm (git mv로 처리) |
| methodology-types target | `packages/api/src/core/discovery/services/methodology-types.ts` | 신설 (git mv) |
| caller 갱신 | `packages/api/src/core/discovery/services/pm-skills-criteria.ts` | line 6 import path |
| dist orphan | `packages/api/dist/services/entity-sync.*` | 수동 git rm 4 files |
| dist orphan | `packages/api/dist/services/methodology-types.*` | 수동 git rm 4 files |

## §6 영향 범위

- services/ 루트 .ts: 18 → **16** (-2)
- cross-domain 룰 위반: 19 → **19** (증가 없음)
- dual_ai_reviews: 26 → **≥27** (hook 13 sprint 연속)
