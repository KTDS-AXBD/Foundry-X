---
code: FX-PLAN-369
title: Sprint 369 — F634 ESLint base config 확장 (baseConfig + apiConfig preset)
version: 1.0
status: Active
category: PLAN
created: 2026-05-08
updated: 2026-05-08
sprint: 369
f_item: F634
req: FX-REQ-699
priority: P3
---

# Sprint 369 — F634 ESLint base config 확장 (baseConfig + apiConfig preset)

> SPEC.md §5 F634 row가 권위 소스. 본 plan은 F633(Sprint 368, packages/eslint-config 신설) follow-up.

## §1 배경 + 사전 측정

### 동기

F633(Sprint 368 ✅)에서 `@foundry-x/eslint-config` 패키지를 신설하고 5개의 룰(`.mjs`)만 export했다. 하지만 6 consumer의 eslint.config.js는 여전히 100% 중복 boilerplate를 보유:

- 5 fx-*(fx-agent / fx-discovery / fx-modules / fx-offering / fx-shaping): **각 27줄 100% 동일**
- packages/api: **33줄** — 5 fx-*과 동일 + 4 추가 rule + extra ignore(`src/azure.ts`)

총 **168 LOC** boilerplate. consumer가 1줄 import + 1줄 함수 호출로 줄도록 base config preset 확장.

### 사전 측정 (S339, 2026-05-08)

5 fx-* 패키지 eslint.config.js 공통 항목:
1. `import eslint from '@eslint/js'`
2. `import tseslint from 'typescript-eslint'`
3. `eslint.configs.recommended` + `...tseslint.configs.recommended` extends
4. `files: ['src/**/*.{ts,tsx}']` glob
5. `plugins: { 'foundry-x-api': foundryXApiPlugin }`
6. **5 공통 rule**:
   - `@typescript-eslint/no-unused-vars` (argsIgnorePattern + varsIgnorePattern `^_`)
   - `@typescript-eslint/no-explicit-any: warn`
   - `@typescript-eslint/consistent-type-imports: error`
   - `no-console: off`
   - `foundry-x-api/no-types-schema-barrel: error`
7. `ignores: ['dist/', 'node_modules/', '**/*.test.ts']`

packages/api 만의 추가:
- **4 추가 rule**: `foundry-x-api/no-cross-domain-import: error` / `no-direct-route-register: error` / `use-model-ssot: error` / `no-cross-domain-d1: warn`
- **추가 ignore**: `src/azure.ts`

### 의존성 hoisting 현황

5 fx-*(fx-agent/fx-discovery/fx-modules/fx-offering/fx-shaping) 모두 `@eslint/js`와 `typescript-eslint`를 자체 devDependencies로 보유하지 않음. pnpm hoisting으로 packages/api에서 거슬러 올라간 dependency를 사용 중. F634에서 `@foundry-x/eslint-config` 내부로 import가 이동하면, **eslint-config 패키지가 `dependencies`로 직접 보유**해야 안전.

## §2 인터뷰 3회 패턴 (S339)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 export 스타일 | **Named exports `baseConfig` + `apiConfig`** | IDE 자동완성 + tree-shake + 명시적 이름 |
| 2차 Override 메커니즘 | **Function arg pattern**: `baseConfig(...overrides) => [...baseRules, ...overrides]` | 간결 + ESLint flat config 관습 + tseslint.config rest args 자연스러움 |
| 3차 API scope | **apiConfig로 완전 이전** | 4 추가 rule + azure.ts ignore 모두 apiConfig 내부에 bake-in. consumer는 1줄 함수 호출만 |

## §3 범위 (a~i)

### packages/eslint-config 확장

**(a)** `packages/eslint-config/index.mjs` 확장 — 새 import + 새 export:

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { noCrossDomainD1 } from './rules/no-cross-domain-d1.mjs';
import { noCrossDomainImport } from './rules/no-cross-domain-import.mjs';
import { noDirectRouteRegister } from './rules/no-direct-route-register.mjs';
import { noTypesSchemaBarrel } from './rules/no-types-schema-barrel.mjs';
import { useModelSsot } from './rules/use-model-ssot.mjs';

// 기존 (backward compat 유지)
export const foundryXApiPlugin = {
  meta: { name: 'eslint-plugin-foundry-x-api', version: '1.0.0' },
  rules: {
    'no-cross-domain-d1': noCrossDomainD1,
    'no-cross-domain-import': noCrossDomainImport,
    'no-direct-route-register': noDirectRouteRegister,
    'no-types-schema-barrel': noTypesSchemaBarrel,
    'use-model-ssot': useModelSsot,
  },
};

// 5 fx-* 공통 base preset
export const baseConfig = (...overrides) => tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'foundry-x-api': foundryXApiPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
      // S336: types.ts schemas barrel 차단 (순환 import → openapi.json 500 시한폭탄)
      'foundry-x-api/no-types-schema-barrel': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts'],
  },
  ...overrides,
);

// packages/api 전용 preset (baseConfig + 4 추가 rule + azure.ts ignore)
export const apiConfig = (...overrides) => tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'foundry-x-api': foundryXApiPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
      'foundry-x-api/no-types-schema-barrel': 'error',
      // MSA 원칙 룰 — core/{domain}/ 신규 파일에만 의도적으로 적용
      'foundry-x-api/no-cross-domain-import': 'error',
      'foundry-x-api/no-direct-route-register': 'error',
      // C71: 하드코딩 모델 ID 차단 — @foundry-x/shared/model-defaults SSOT 강제
      'foundry-x-api/use-model-ssot': 'error',
      // C75: D1 크로스도메인 테이블 접근 차단 (forward-only)
      'foundry-x-api/no-cross-domain-d1': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts', 'src/azure.ts'],
  },
  ...overrides,
);
```

**(b)** `packages/eslint-config/package.json` `dependencies` 추가:

```json
{
  "dependencies": {
    "@eslint/js": "^10.0.1",
    "typescript-eslint": "^8.57.0"
  }
}
```

(현재 packages/api/package.json에 devDependencies로 있는 버전과 동일하게)

### packages/api 갱신

**(c)** `packages/api/eslint.config.js` 33줄 → ~5줄:

```javascript
import { apiConfig } from '@foundry-x/eslint-config';

export default apiConfig();
```

### 5 fx-* 갱신

**(d)** 5 패키지(fx-agent, fx-discovery, fx-modules, fx-offering, fx-shaping) eslint.config.js 27줄 → ~5줄 (각 동일):

```javascript
import { baseConfig } from '@foundry-x/eslint-config';

export default baseConfig();
```

### 검증

**(e)** `pnpm install` — workspace symlink + `@eslint/js` + `typescript-eslint` 5 fx-* node_modules에 자동 설치 확인 (eslint-config dependencies 추적).

**(f)** `pnpm turbo run lint --force` baseline 회귀 0 (errors 0 + warnings 변화 없음, 161→0 baseline 유지).

**(g)** `pnpm turbo run typecheck --force` 19/19 PASS.

**(h)** rule 활성화 검증 — packages/api에서 5 + 4 = **9 rule** 모두 ESLint config에 반영됐는지 grep:

```bash
cd packages/api && pnpm exec eslint --print-config src/app.ts | jq '.rules' | grep "foundry-x-api"
# 예상: 5 rule (no-cross-domain-d1 / no-cross-domain-import / no-direct-route-register / no-types-schema-barrel / use-model-ssot)
```

**(i)** azure.ts ignore 동작 — `src/azure.ts`가 ESLint 검사 대상에서 제외됐는지:

```bash
cd packages/api && pnpm exec eslint src/azure.ts --no-error-on-unmatched-pattern
# exit 0 + 0 errors (ignored)
```

## §4 파일 매핑

| 작업 | 파일 | 변경 |
|------|------|------|
| 수정 | `packages/eslint-config/index.mjs` | + import 2 + baseConfig export + apiConfig export |
| 수정 | `packages/eslint-config/package.json` | + dependencies 2 (@eslint/js, typescript-eslint) |
| 수정 | `packages/api/eslint.config.js` | 33 → ~5줄 |
| 수정 | `packages/fx-agent/eslint.config.js` | 27 → ~5줄 |
| 수정 | `packages/fx-discovery/eslint.config.js` | 27 → ~5줄 |
| 수정 | `packages/fx-modules/eslint.config.js` | 27 → ~5줄 |
| 수정 | `packages/fx-offering/eslint.config.js` | 27 → ~5줄 |
| 수정 | `packages/fx-shaping/eslint.config.js` | 27 → ~5줄 |
| 자동 갱신 | `pnpm-lock.yaml` | dependencies 추가로 hash 변경 |

총 변경: 8 file 수정 + lock 1 → 약 9 files. -168 LOC + ~30 LOC = **net -138 LOC** 예상.

## §5 Phase Exit Criteria (P-a~P-i)

| # | 항목 | 검증 |
|---|------|------|
| P-a | `packages/eslint-config/index.mjs` baseConfig + apiConfig export 존재 | `grep -E "export const (baseConfig\|apiConfig)" packages/eslint-config/index.mjs \| wc -l` = 2 |
| P-b | `packages/eslint-config/package.json` dependencies 2건 | `jq '.dependencies \| keys' packages/eslint-config/package.json` = `["@eslint/js", "typescript-eslint"]` |
| P-c | 6 consumer eslint.config.js LOC 평균 ≤ 8 | `for d in api fx-agent fx-discovery fx-modules fx-offering fx-shaping; do wc -l < packages/$d/eslint.config.js; done \| awk '{s+=$1} END {print s/6}'` ≤ 8 |
| P-d | 5 fx-*는 baseConfig() / api는 apiConfig() 호출 | `grep -l "baseConfig()" packages/{fx-agent,fx-discovery,fx-modules,fx-offering,fx-shaping}/eslint.config.js \| wc -l` = 5 + `grep -l "apiConfig()" packages/api/eslint.config.js` = 1 |
| P-e | packages/api에 9 rule 활성화 | `cd packages/api && pnpm exec eslint --print-config src/app.ts \| jq '.rules \| keys[]' \| grep -c "foundry-x-api"` = 5 |
| P-f | azure.ts ignore 동작 | `cd packages/api && pnpm exec eslint src/azure.ts 2>&1 \| grep -c "error"` = 0 |
| P-g | `pnpm -r lint` baseline 회귀 0 + typecheck PASS | `pnpm turbo run lint typecheck --force` exit 0 |
| P-h | Master 독립 검증 cache 우회(`--force`) cache 0건 | turbo output `Cached: 0 cached, N total` (S337 Turbo Cache 함정 회피 2회차) |
| P-i | dual_ai_reviews sprint 369 자동 INSERT ≥ 1건 | D1 쿼리 |

## §6 위험 + 대응

| 위험 | 대응 |
|------|------|
| `@eslint/js` / `typescript-eslint` 버전이 packages/api와 packages/eslint-config 사이 drift 가능 | 본 sprint에서 동일 버전(^10.0.1, ^8.57.0)으로 등록. 향후 dependabot 등 갱신 시 양쪽 동시 |
| consumer가 추가 rule을 덧붙여야 하는 경우 | `baseConfig({ rules: { 'foo': 'error' } })` overrides 인자로 처리 가능 — pattern 검증을 P-d에 포함 안 함(현재 6 consumer 모두 추가 override 불필요) |
| backward compat — 기존 `foundryXApiPlugin` 직접 import하던 caller | 본 sprint에서도 `foundryXApiPlugin` export 유지(deprecation 표시 안 함). 향후 0 caller 확인 후 제거 검토 |
| pnpm hoisting 의존 → eslint-config dependencies로 격상 시 5 fx-* node_modules 새로 생성 가능 | `pnpm install` 후 워크스페이스 의존 그래프 정상화. 정상 동작 확인 |

## §7 다음 사이클 후보 (out of scope)

1. `.ts` source + tests도 packages/eslint-config로 이전 (현재 SSOT 분리 OK 결정)
2. content-sync-check.sh F-item ✅ false positive fix (S336 silent layer 6)
3. `@hono/zod-openapi 0.18+` 버전업 (S336 silent layer 4 견고화)
4. ESLint base config TypeScript 타입 export (`Linter.FlatConfig[]`)

## §8 시동

- master 직접 commit + push (meta-only: SPEC + plan)
- `bash -i -c "sprint 369"` Sprint WT 시동
- autopilot pipeline (plan → design → impl → verify → gap → report → PR)
- Stale F_ITEMS 패턴 7회→8회차 재현 가능성 — 시동 후 signal/.sprint-context 보정 필요시 즉시 fix
