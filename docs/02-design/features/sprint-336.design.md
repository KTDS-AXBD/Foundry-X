---
id: FX-DESIGN-336
sprint: 336
feature: F590
req: FX-REQ-657
status: approved
date: 2026-05-04
---

# Sprint 336 Design — F590: pm-skills dead code 2 git rm + 1 도메인 이동

## 개요

F587(Sprint 333) 패턴 직접 재현. services/ 루트 pm-skills 3 files 중 dead code 2 git rm + pm-skills-guide → core/discovery/services/ 이동. services/ 26 → 23 (-3).

## §1 변경 파일 목록

### 삭제 (git rm)

| 파일 | 이유 |
|------|------|
| `packages/api/src/services/pm-skills-module.ts` | api/src callers 0건 — dead code |
| `packages/api/src/services/pm-skills-pipeline.ts` | api/src production callers 0건, dead-caller만 — dead-by-association |
| `packages/api/src/__tests__/pm-skills-pipeline.test.ts` | dead code 대상 test |

### 이동 (git mv)

| 소스 | 대상 |
|------|------|
| `packages/api/src/services/pm-skills-guide.ts` | `packages/api/src/core/discovery/services/pm-skills-guide.ts` |

### Callers 갱신 (import path)

| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `packages/api/src/core/discovery/services/analysis-context.ts:6` | `from "../../../services/pm-skills-guide.js"` | `from "./pm-skills-guide.js"` |
| `packages/api/src/__tests__/pm-skills-guide.test.ts:2` | `from "../services/pm-skills-guide.js"` | `from "../core/discovery/services/pm-skills-guide.js"` |

### Dist orphan cleanup

| 대상 | 이유 |
|------|------|
| `packages/api/dist/services/pm-skills-*.{js,js.map,d.ts,d.ts.map}` (12 files) | src 삭제/이동 후 tsc 자동 정리 안 함 |

## §2 스코프 락 (SCOPE LOCK)

- **본 sprint 범위**: `packages/api/src/services/pm-skills-{module,pipeline,guide}.ts` + test + dist orphan
- **제외 (fx-offering self-contained)**: `packages/api/src/` 외 `fx-offering/src/services/pm-skills-*.ts` 3 files — self-contained routes/methodology.ts 사용 그대로 유지. 절대 이동/삭제 금지.
- **제외 (pm-skills-criteria)**: 이미 `core/discovery/services/` 위치. 변경 없음.

## §3 TDD 적용 여부

**면제 (tdd-workflow.md §적용 범위)**: dead code git rm + file move는 로직 신규 없음. 기존 pm-skills-guide.test.ts가 회귀 보장. 별도 Red Phase 불필요.

## §4 검증 기준

Plan §OBSERVED P-a~P-j 10항 numerical 강제 적용 (세부 내용: sprint-336.plan.md 참조).

## §5 파일 매핑 (Worker)

단일 작업 — Worker 분리 불필요. 순서:
1. `git rm` dead code 3 files
2. `git mv` pm-skills-guide
3. import path 2건 갱신 (analysis-context.ts + pm-skills-guide.test.ts)
4. typecheck + test 실행
5. dist orphan cleanup
