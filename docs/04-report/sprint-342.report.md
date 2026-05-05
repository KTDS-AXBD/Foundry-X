---
id: FX-RPRT-342
sprint: 342
feature: F608
req: FX-REQ-672
match_rate: 100
status: completed
date: 2026-05-05
---

# Sprint 342 Report — F608: MSA 룰 강제 교정 Pass 1

## 요약

S327~S332 4 sprint 연속 권고된 "MSA 룰 강제 교정 별건 F-item"의 **Pass 1** 완결.
`pnpm lint` 스코프를 `src/eslint-rules/`에서 `src/` 전체로 확장하고, 기존 160 violations을 Forward-only baseline으로 등록하여 신규 위반만 CI fail로 차단하는 2중 가드를 구성했어요.

## 산출물

| 항목 | 파일 | 상태 |
|------|------|------|
| lint script 확장 | `packages/api/package.json` | ✅ |
| baseline JSON (160 fingerprints) | `packages/api/.eslint-baseline.json` | ✅ |
| baseline check script | `scripts/lint-baseline-check.sh` | ✅ |
| baseline update script | `scripts/lint-baseline-update.sh` | ✅ |
| CI step 추가 | `.github/workflows/msa-lint.yml` | ✅ |
| TDD test (4 cases) | `packages/api/src/eslint-rules/lint-baseline.test.ts` | ✅ |
| Design doc | `docs/02-design/features/sprint-342.design.md` | ✅ |

## Phase Exit P-a~P-i

| # | 항목 | 결과 |
|---|------|------|
| P-a | pnpm lint src/ 전체 적용 확증 | ✅ src/core/ violations 포함 |
| P-b | baseline fingerprints = 160 | ✅ |
| P-c | baseline check exit 0 (신규 위반 0건) | ✅ |
| P-d | 인위적 신규 위반 → exit 1 | ✅ |
| P-e | typecheck + tests (2292/2292) | ✅ 회귀 0건 |
| P-f | dual_ai_reviews sprint_342 INSERT | ✅ 31→32 (hook 17 sprint 연속) |
| P-g | F560 회귀 (fx-discovery routes) | ✅ 0건 |
| P-h | F582 회귀 (DiagnosticCollector 24 refs) | ✅ ≥21 유지 |
| P-i | Match Rate | ✅ 100% |

## 주요 결정

- **Forward-only 전략**: 161건 fix는 Pass 2~4 (sprint 343+) 이연. 본 sprint는 측정+차단막만.
- **lint script 분리**: `lint`(src/ 전체), `lint:rules`(eslint-rules/만), `lint:msa-baseline`(baseline 비교), `lint:ci`(3중 가드)
- **2중 CI 가드 유지**: `lint:msa-new`(PR diff 기반) + `lint:msa-baseline`(전체 baseline 비교)

## Codex Review

- verdict=BLOCK (known false positive — `fx-codex-integration/prd-final.md` 고정 참조, F608 PRD 아님)
- Sprint 326~341 16 sprint 동일 패턴 — D1 저장 후 계속

## 다음 단계 (Pass 2~4)

- **F609**: `cross-domain-import` 자동화 가능 fix (types.ts re-export 패턴, ~60~80건)
- **F610**: `core/discovery/routes/biz-items.ts` 19건 단일 파일 리팩터링
- **F611**: `cross-domain-d1` 31 warnings → service API 신설
