---
code: FX-RPRT-338
title: Sprint 369 — F634 ESLint base config 확장 Report
version: 1.0
status: Completed
category: REPORT
created: 2026-05-08
updated: 2026-05-08
sprint: 369
f_item: F634
req: FX-REQ-699
match_rate: 100
---

# Sprint 369 — F634 ESLint base config 확장 Report

## 요약

| 항목 | 값 |
|------|-----|
| Sprint | 369 |
| F-item | F634 |
| REQ | FX-REQ-699 (P3) |
| Match Rate | **100%** |
| 테스트 | lint 10/10 + typecheck 19/19 + eslint-rules 55/55 PASS |
| Codex 리뷰 | BLOCK (오탐 — 잘못된 PRD 컨텍스트 + 잘못된 패키지명 판단, 상세 하단) |
| 완료 여부 | ✅ DONE |

## 변경 내역

### packages/eslint-config/index.mjs
`foundryXApiPlugin` export만 있던 패키지에 `baseConfig` + `apiConfig` preset 함수 추가.
`commonRules` 객체로 5개 공통 rule을 DRY하게 추출.

```
before: 17 LOC (plugin export only)
after:  70 LOC (+53 LOC = baseConfig + apiConfig + commonRules)
```

### packages/eslint-config/package.json
`@eslint/js ^10.0.1` + `typescript-eslint ^8.57.0`를 `dependencies`로 등록.
기존에 pnpm hoisting 의존이던 것을 패키지 자체 의존으로 격상.

### 6 consumer eslint.config.js
| 패키지 | before | after | 변화 |
|--------|--------|-------|------|
| packages/api | 33 LOC | 3 LOC | -30 LOC, apiConfig() |
| packages/fx-agent | 27 LOC | 4 LOC | -23 LOC, baseConfig() |
| packages/fx-discovery | 27 LOC | 4 LOC | -23 LOC, baseConfig() |
| packages/fx-modules | 27 LOC | 4 LOC | -23 LOC, baseConfig() |
| packages/fx-offering | 27 LOC | 4 LOC | -23 LOC, baseConfig() |
| packages/fx-shaping | 27 LOC | 4 LOC | -23 LOC, baseConfig() |
| **합계** | **168 LOC** | **23 LOC** | **-145 LOC (-86%)** |

## Phase Exit Criteria (P-a~P-i) 검증

| # | 항목 | 결과 |
|---|------|:----:|
| P-a | baseConfig + apiConfig export 2건 | ✅ |
| P-b | eslint-config package.json dependencies 2건 | ✅ |
| P-c | 6 consumer LOC 평균 3.8 (≤ 8) | ✅ |
| P-d | 5 fx-*는 baseConfig() / api는 apiConfig() | ✅ |
| P-e | packages/api에서 5 foundry-x-api rule 활성화 | ✅ |
| P-f | azure.ts ignore (exit 0, 0 errors) | ✅ |
| P-g | turbo lint+typecheck --force 10/10 + 19/19 | ✅ |
| P-h | Turbo Cache 0 cached (S337 함정 회피 2회차) | ✅ |
| P-i | dual_ai_reviews sprint-369 INSERT ≥ 1건 | ✅ |

## Codex Cross-Review 오탐 기록

**verdict**: BLOCK (degraded: false)

**오탐 근거**:

1. **패키지명 오류**: Codex가 `import tseslint from 'typescript-eslint'`를 "잘못된 import"로 판단. 사실은 `typescript-eslint`가 v7+ 기준 공식 통합 패키지 이름이며, 기존 코드(F633 이전 packages/fx-agent 등)에서도 동일하게 사용 중이었음. `@typescript-eslint/parser`와 `@typescript-eslint/eslint-plugin`을 별도로 설치하는 것은 v5 이하 방식.

2. **잘못된 PRD 컨텍스트**: Codex가 FX-REQ-587~590(Codex 통합 PRD)을 참조하여 "미구현"으로 판단. F634의 PRD는 FX-REQ-699(ESLint base config 확장)이므로 완전히 다른 요구사항 컨텍스트를 참조한 오탐.

**결론**: 실제 코드 품질 이슈 없음. BLOCK verdict는 Codex reviewer의 PRD 컨텍스트 혼동으로 인한 false positive.

## S337 Turbo Cache 함정 회피 2회차 적용

`pnpm turbo run lint --force` + `pnpm turbo run typecheck --force` 모두 `Cached: 0 cached, N total` 확인.
- lint: `Cached: 0 cached, 10 total` ✅
- typecheck: `Cached: 0 cached, 19 total` ✅

이 패턴은 S337(첫 실전 적용)에 이어 Sprint 369에서 두 번째로 적용됨.

## 다음 사이클 후보 (out of scope)

1. `.ts` source + tests도 packages/eslint-config로 이전 (현재 SSOT 분리 OK)
2. content-sync-check.sh F-item ✅ false positive fix (S336 silent layer 6)
3. `@hono/zod-openapi 0.18+` 버전업 (S336 silent layer 4 견고화)
4. ESLint base config TypeScript 타입 export (`Linter.FlatConfig[]`)
