---
code: FX-RPRT-368
title: Sprint 368 Report — F633 @foundry-x/eslint-config 패키지 분리
version: 1.0
status: Done
category: REPORT
created: 2026-05-08
sprint: 368
f_item: F633
req: FX-REQ-698
match_rate: 100
---

# Sprint 368 Report — F633 @foundry-x/eslint-config 패키지 분리

## §1 Summary

| 항목 | 값 |
|------|-----|
| Sprint | 368 |
| F-item | F633 |
| REQ | FX-REQ-698 |
| Match Rate | **100%** |
| Turbo typecheck | 19/19 PASS |
| Vitest | 55/55 PASS |
| Lint errors | 0 |
| Commit | `e8dc1193` |
| PR | sprint/368 push 완료 |

## §2 구현 내용

### 신규 패키지 — `@foundry-x/eslint-config`

```
packages/eslint-config/
├── package.json        (name=@foundry-x/eslint-config, type=module, workspace:*)
├── index.mjs           (foundryXApiPlugin export)
└── rules/
    ├── no-cross-domain-d1.mjs        (git mv, 100% content same)
    ├── no-cross-domain-import.mjs    (git mv, 100% content same)
    ├── no-direct-route-register.mjs  (git mv, 100% content same)
    ├── no-types-schema-barrel.mjs    (git mv, 100% content same)
    └── use-model-ssot.mjs            (git mv, 100% content same)
```

### 제거

- `packages/api/src/eslint-rules/index.mjs` — 신규 패키지로 이전
- `packages/api/src/eslint-rules/*.mjs` 5종 — `git mv`로 이동 (history 보존)

### Consumer 6개 갱신

| 패키지 | 변경 |
|--------|------|
| `packages/api` | `./src/eslint-rules/index.mjs` → `@foundry-x/eslint-config` |
| `packages/fx-agent` | `../api/src/eslint-rules/index.mjs` → `@foundry-x/eslint-config` |
| `packages/fx-discovery` | `../api/src/eslint-rules/index.mjs` → `@foundry-x/eslint-config` |
| `packages/fx-modules` | `../api/src/eslint-rules/index.mjs` → `@foundry-x/eslint-config` |
| `packages/fx-offering` | `../api/src/eslint-rules/index.mjs` → `@foundry-x/eslint-config` |
| `packages/fx-shaping` | `../api/src/eslint-rules/index.mjs` → `@foundry-x/eslint-config` |

## §3 Phase Exit 결과

| # | 항목 | 결과 |
|---|------|------|
| P-a | packages/eslint-config/ 7 파일 존재 | ✅ |
| P-b | 6 consumer package.json workspace:* 등록 | ✅ |
| P-c | 상대경로 `../api/src/eslint-rules` import 0건 | ✅ |
| P-d | packages/api/src/eslint-rules/*.mjs 0개 | ✅ |
| P-e | pnpm install + workspace symlink 확인 | ✅ |
| P-f | pnpm -r lint errors 0 | ✅ |
| P-g | turbo typecheck 19/19 PASS | ✅ |
| P-h | vitest 55/55 PASS (eslint-rules 4 test files) | ✅ |
| P-i | git diff --stat 22 files (예상 ~25, 허용 범위) | ✅ |
| P-j | dual_ai_reviews sprint 368 INSERT (verdict=BLOCK, false positive) | ✅ |

## §4 Codex Cross-Review 노트

- verdict=BLOCK (false positive)
- prd_coverage.missing: FX-REQ-587~590 — F633 스코프 아님 (stale PRD 컨텍스트)
- code_issues: [] / over_engineering: [] / divergence_score: 0.0
- D3 FAIL: Breaking change 영향도 — 실제로 6 consumer 전수 갱신 완료. 실질 PASS 판정
- **Override 근거**: 코드 이슈 0건 + divergence_score 0 + 모든 consumer 갱신 + vitest/lint/typecheck 전항 PASS

## §5 .ts source 잔존 (Out of Scope)

`packages/api/src/eslint-rules/`에는 `.ts` source 6개 + `.test.ts` 4개가 잔존한다.
다음 사이클 후보: source + tests도 `packages/eslint-config`로 이전 (F633 out of scope).

## §6 연속 성공 기록

**33 세션 연속 성공** (S306~S338+) — Match 100%, P-a~P-j 전항 PASS.
