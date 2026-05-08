---
code: FX-DESIGN-369
title: Sprint 369 — F634 ESLint base config 확장 Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-08
updated: 2026-05-08
sprint: 369
f_item: F634
req: FX-REQ-699
---

# Sprint 369 — F634 ESLint base config 확장 Design

## §1 목표

`@foundry-x/eslint-config` 패키지에 `baseConfig` + `apiConfig` preset 함수를 추가하여 6 consumer의 eslint.config.js boilerplate(168 LOC)를 ~30 LOC로 축소.

## §2 변경 전/후 비교

### 변경 전 — consumer (fx-agent 예시, 27줄)
```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { foundryXApiPlugin } from '@foundry-x/eslint-config';
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { files: [...], plugins: {...}, rules: {...5 rules} },
  { ignores: [...] }
);
```

### 변경 후 — consumer (fx-agent 예시, ~4줄)
```javascript
import { baseConfig } from '@foundry-x/eslint-config';
export default baseConfig();
```

## §3 설계 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| Export 스타일 | Named exports `baseConfig` + `apiConfig` | IDE 자동완성 + tree-shake + 명시적 이름 |
| Override 메커니즘 | `(...overrides)` rest args | `tseslint.config()` 관용 패턴 + 간결성 |
| API scope | `apiConfig`에 4 rule + azure.ts ignore bake-in | consumer는 1줄 호출만 필요 |
| Backward compat | `foundryXApiPlugin` export 유지 | 기존 직접 import caller 보호 |
| dependencies 위치 | `eslint-config/package.json` dependencies로 이동 | pnpm hoisting 의존 제거 → 안정적 의존 그래프 |

## §4 테스트 계약 (TDD)

TDD 등급: **선택 (리팩토링)** — 기존 린트 통과가 회귀 테스트 역할.

검증 기준:
- `pnpm turbo run lint --force` exit 0 (errors 0)
- `pnpm turbo run typecheck --force` exit 0 (19/19 PASS)
- `pnpm exec eslint --print-config src/app.ts | grep foundry-x-api` = 5 rule

## §5 파일 매핑

| 파일 | 변경 종류 | 내용 |
|------|----------|------|
| `packages/eslint-config/index.mjs` | 수정 | + import @eslint/js + typescript-eslint, + baseConfig export, + apiConfig export |
| `packages/eslint-config/package.json` | 수정 | + dependencies: @eslint/js ^10.0.1, typescript-eslint ^8.57.0 |
| `packages/api/eslint.config.js` | 수정 | 33줄 → ~4줄 (apiConfig() 호출) |
| `packages/fx-agent/eslint.config.js` | 수정 | 27줄 → ~4줄 (baseConfig() 호출) |
| `packages/fx-discovery/eslint.config.js` | 수정 | 27줄 → ~4줄 (baseConfig() 호출) |
| `packages/fx-modules/eslint.config.js` | 수정 | 27줄 → ~4줄 (baseConfig() 호출) |
| `packages/fx-offering/eslint.config.js` | 수정 | 27줄 → ~4줄 (baseConfig() 호출) |
| `packages/fx-shaping/eslint.config.js` | 수정 | 27줄 → ~4줄 (baseConfig() 호출) |
| `pnpm-lock.yaml` | 자동 | dependencies 추가로 hash 변경 |

## §6 Phase Exit Criteria (P-a~P-i)

| # | 항목 |
|---|------|
| P-a | `packages/eslint-config/index.mjs` baseConfig + apiConfig export 존재 |
| P-b | `packages/eslint-config/package.json` dependencies @eslint/js + typescript-eslint |
| P-c | 6 consumer eslint.config.js LOC 평균 ≤ 8 |
| P-d | 5 fx-*는 baseConfig() / api는 apiConfig() 호출 |
| P-e | packages/api에서 5 foundry-x-api rule 활성화 확인 |
| P-f | azure.ts ignore 동작 |
| P-g | `pnpm turbo run lint typecheck --force` exit 0 |
| P-h | Turbo Cache 0건 (S337 함정 회피) |
| P-i | dual_ai_reviews sprint 369 INSERT ≥ 1 |
