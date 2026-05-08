---
code: FX-PLAN-368
title: Sprint 368 — F633 ESLint rules 패키지 분리 → @foundry-x/eslint-config
version: 1.0
status: Active
category: PLAN
created: 2026-05-08
updated: 2026-05-08
sprint: 368
f_item: F633
req: FX-REQ-698
priority: P2
---

# Sprint 368 — F633 ESLint rules 패키지 분리 → @foundry-x/eslint-config

> SPEC.md §5 F633 row가 권위 소스. 본 plan은 S336 follow-up — cross-package 상대경로 import 안티패턴 영구 해소.

## §1 배경 + 사전 측정

### 동기

S336에서 `foundry-x-api/no-types-schema-barrel` ESLint 룰을 도입하며 모노리포 6 패키지(api + 5 fx-*) PR CI 자동 차단을 구현했다. 그 과정에서 5 fx-* 패키지의 `eslint.config.js`가 `../api/src/eslint-rules/index.mjs` cross-package 상대경로로 룰을 가져오는 안티패턴이 생겼다(PR #771/#772). 차단막 도입이 우선이라 단기적으로 수용했고, 후속 정리 약속이 있었다.

본 sprint는 그 약속을 이행한다 — 룰을 별도 워크스페이스 패키지로 추출하여 cross-package 상대경로를 monorepo 표준 workspace dep으로 격상.

### 사전 측정 (S338, 2026-05-08)

```
packages/api/src/eslint-rules/
  index.mjs        ← ESLint runtime entry, foundryXApiPlugin export
  index.ts         ← TS source for typecheck
  no-cross-domain-d1.{mjs, ts, test.ts}
  no-cross-domain-import.{mjs, ts}
  no-direct-route-register.{mjs, ts}
  no-types-schema-barrel.{mjs, ts, test.ts}
  use-model-ssot.{mjs, ts, test.ts}
  lint-baseline.test.ts
```

**Consumer 6개**:
- `packages/api/eslint.config.js` — `./src/eslint-rules/index.mjs` (self-relative)
- `packages/fx-agent/eslint.config.js` — `../api/src/eslint-rules/index.mjs`
- `packages/fx-discovery/eslint.config.js` — `../api/src/eslint-rules/index.mjs`
- `packages/fx-modules/eslint.config.js` — `../api/src/eslint-rules/index.mjs`
- `packages/fx-offering/eslint.config.js` — `../api/src/eslint-rules/index.mjs`
- `packages/fx-shaping/eslint.config.js` — `../api/src/eslint-rules/index.mjs`

`.ts` 와 `.mjs` 의 관계: 같은 룰을 두 형태로 보유 — `.ts`는 TypeScript 타입체크 + vitest 단위 테스트 SSOT, `.mjs`는 ESLint flat config가 직접 ESM으로 로드하는 runtime 엔트리. 본 sprint는 **`.mjs`만** 신규 패키지로 격상 — `.ts` 와 tests 는 packages/api에 잔존하여 vitest config + db mocks + lint-baseline.test.ts의 packages/api 시점 컨텍스트를 유지한다.

## §2 의존 + 책임 분리

| 의존 F# | 상태 | 본 sprint 영향 |
|---------|------|----------------|
| (없음) | — | 독립 sprint |

## §3 인터뷰 3회 패턴 (S338)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 단위 | **F-item Sprint (autopilot)** | task-promotion.md 기준 2 충족 (3+ files 변경, 6 패키지 + 신규 1) |
| 2차 패키지 이름 | **@foundry-x/eslint-config** | monorepo workspace 관습(@foundry-x/shared 등과 일관). plugin이 아닌 config 상위 개념 |
| 3차 이동 범위 | **`.mjs` 5 + index.mjs만 신규 패키지로**. `.ts` source + tests 는 packages/api에 잔존 | 최소 변화 원칙. tests는 vitest config + lint-baseline.test.ts api/src 시점 스캔 컨텍스트 의존 |

## §4 범위 (a~k)

### 신규 패키지 생성

**(a)** `packages/eslint-config/` 신설 + `package.json`:

```json
{
  "name": "@foundry-x/eslint-config",
  "version": "0.1.0",
  "type": "module",
  "main": "./index.mjs",
  "exports": {
    ".": "./index.mjs"
  },
  "license": "UNLICENSED",
  "private": true
}
```

**(b)** `packages/eslint-config/index.mjs` — 현 packages/api/src/eslint-rules/index.mjs 와 동일 형태로 5 rule import + `foundryXApiPlugin` re-export. 단지 import path가 `./rules/*.mjs`로 바뀜:

```javascript
import { noCrossDomainD1 } from './rules/no-cross-domain-d1.mjs';
import { noCrossDomainImport } from './rules/no-cross-domain-import.mjs';
import { noDirectRouteRegister } from './rules/no-direct-route-register.mjs';
import { noTypesSchemaBarrel } from './rules/no-types-schema-barrel.mjs';
import { useModelSsot } from './rules/use-model-ssot.mjs';

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
```

**(c)** `packages/eslint-config/rules/*.mjs` 5종 git mv from `packages/api/src/eslint-rules/`:
- `no-cross-domain-d1.mjs`
- `no-cross-domain-import.mjs`
- `no-direct-route-register.mjs`
- `no-types-schema-barrel.mjs`
- `use-model-ssot.mjs`

원본은 packages/api/src/eslint-rules/에서 제거된다. `.ts` source 와 tests 는 그대로 잔존.

### packages/api 갱신

**(d)** packages/api/src/eslint-rules/index.mjs 제거 — 신규 패키지가 runtime SSOT.

**(e)** packages/api/eslint.config.js 1줄 변경:

```diff
-import { foundryXApiPlugin } from './src/eslint-rules/index.mjs';
+import { foundryXApiPlugin } from '@foundry-x/eslint-config';
```

packages/api/package.json devDependencies에 `"@foundry-x/eslint-config": "workspace:*"` 추가.

### 5 fx-* 패키지 갱신

**(f)** 5개 패키지(fx-agent, fx-discovery, fx-modules, fx-offering, fx-shaping) 각각 eslint.config.js 1줄 변경:

```diff
-import { foundryXApiPlugin } from '../api/src/eslint-rules/index.mjs';
+import { foundryXApiPlugin } from '@foundry-x/eslint-config';
```

각 package.json devDependencies에 `"@foundry-x/eslint-config": "workspace:*"` 추가.

### 잔존 항목

**(g)** packages/api/src/eslint-rules/는 다음만 잔존:
- `index.ts` (TS source)
- `no-cross-domain-d1.ts` + `.test.ts`
- `no-cross-domain-import.ts`
- `no-direct-route-register.ts`
- `no-types-schema-barrel.ts` + `.test.ts`
- `use-model-ssot.ts` + `.test.ts`
- `lint-baseline.test.ts`

`.mjs` 0개 (모두 신규 패키지로 이동).

### 검증

**(h)** `pnpm install` 후 6 consumer 의 node_modules 에 `@foundry-x/eslint-config` symlink 생성 확인.

**(i)** `pnpm -r lint` 실행 — baseline 회귀 0 (errors 0, warnings 0 변화 없음). 161→0 baseline (S332~S333 F608~F613 시리즈) 유지.

**(j)** `pnpm -r typecheck` PASS.

**(k)** `pnpm test --filter=foundry-x-api -- eslint-rules` — rule unit 3 + lint-baseline 1 PASS.

## §5 파일 매핑

| 작업 | 파일 | 변경 |
|------|------|------|
| 신규 | `packages/eslint-config/package.json` | new |
| 신규 | `packages/eslint-config/index.mjs` | new |
| git mv | `packages/api/src/eslint-rules/no-cross-domain-d1.mjs` → `packages/eslint-config/rules/no-cross-domain-d1.mjs` | rename |
| git mv | `packages/api/src/eslint-rules/no-cross-domain-import.mjs` → `packages/eslint-config/rules/no-cross-domain-import.mjs` | rename |
| git mv | `packages/api/src/eslint-rules/no-direct-route-register.mjs` → `packages/eslint-config/rules/no-direct-route-register.mjs` | rename |
| git mv | `packages/api/src/eslint-rules/no-types-schema-barrel.mjs` → `packages/eslint-config/rules/no-types-schema-barrel.mjs` | rename |
| git mv | `packages/api/src/eslint-rules/use-model-ssot.mjs` → `packages/eslint-config/rules/use-model-ssot.mjs` | rename |
| 삭제 | `packages/api/src/eslint-rules/index.mjs` | rm |
| 수정 | `packages/api/eslint.config.js` | import path |
| 수정 | `packages/api/package.json` | devDependencies +1 |
| 수정 | `packages/fx-agent/eslint.config.js` | import path |
| 수정 | `packages/fx-agent/package.json` | devDependencies +1 |
| 수정 | `packages/fx-discovery/eslint.config.js` | import path |
| 수정 | `packages/fx-discovery/package.json` | devDependencies +1 |
| 수정 | `packages/fx-modules/eslint.config.js` | import path |
| 수정 | `packages/fx-modules/package.json` | devDependencies +1 |
| 수정 | `packages/fx-offering/eslint.config.js` | import path |
| 수정 | `packages/fx-offering/package.json` | devDependencies +1 |
| 수정 | `packages/fx-shaping/eslint.config.js` | import path |
| 수정 | `packages/fx-shaping/package.json` | devDependencies +1 |

총 변경: 7 신규 (package.json + index.mjs + 5 rules) + 6 rm + 12 수정 = ~25 변경 (5 mjs는 git mv로 rename).

## §6 Phase Exit Criteria (P-a~P-j)

| # | 항목 | 검증 |
|---|------|------|
| P-a | `packages/eslint-config/{package.json, index.mjs, rules/}` 디렉토리 + 5 mjs 존재 | `find packages/eslint-config -type f \| wc -l` ≥ 7 |
| P-b | 6 consumer `package.json` 에 `@foundry-x/eslint-config: workspace:*` 등록 | `grep -l "@foundry-x/eslint-config" packages/*/package.json \| wc -l` = 6 |
| P-c | 6 consumer `eslint.config.js` `from '@foundry-x/eslint-config'` 통일 (상대경로 `../api/src/eslint-rules` import 0건) | `grep -r "api/src/eslint-rules" packages/*/eslint.config.js \| wc -l` = 0 |
| P-d | packages/api/src/eslint-rules/ `.mjs` 0개 + index.mjs 0개 | `ls packages/api/src/eslint-rules/*.mjs 2>/dev/null \| wc -l` = 0 |
| P-e | `pnpm install` 정상 + workspace symlink 확인 | `ls packages/api/node_modules/@foundry-x/eslint-config` 존재 |
| P-f | `pnpm -r lint` baseline 회귀 0 | errors 0, warnings 0 |
| P-g | `pnpm -r typecheck` PASS | exit 0 |
| P-h | rule unit + lint-baseline tests PASS | vitest exit 0 |
| P-i | `git diff --stat` 변경 파일 약 25건 (신규 7 + rm 6 + 수정 12) | 합리적 범위 |
| P-j | dual_ai_reviews sprint 368 자동 INSERT ≥ 1건 (hook 24+ sprint 연속) | D1 쿼리 |

## §7 위험 + 대응

| 위험 | 대응 |
|------|------|
| `.ts` source 와 `.mjs` runtime 구현이 drift 가능 (현재 같은 룰을 두 형태로 유지) | scope 외 (out of scope #1, 후속 sprint 검토) |
| pnpm workspace 의 `@foundry-x/eslint-config` 인식 실패 가능성 | `pnpm-workspace.yaml` 이 `packages/*` 패턴이라 자동 인식 |
| ESLint flat config 의 `from '@foundry-x/eslint-config'` 가 ESM 로딩 실패 | `package.json` 의 `type: "module"` + `exports` 명시로 차단 |
| 5 fx-* 패키지 PR CI에서 ESLint 룰 미적용 | P-c 그렙으로 전수 검증 |

## §8 다음 사이클 후보 (out of scope)

1. `.ts` source + tests 도 packages/eslint-config 로 이전 (현재 SSOT 분리 OK 결정)
2. base config (parser/extends) 확장 — 단순 룰 export 외 ESLint config preset
3. `@hono/zod-openapi 0.18+` 버전업 (S336 silent layer 4 회피 견고화)
4. content-sync-check.sh F-item ✅ false positive fix (S336 silent layer 6)

## §9 시동

- master 직접 commit + push (meta-only: SPEC + plan)
- `bash -i -c "sprint 368"` Sprint WT 시동
- autopilot pipeline (plan → design → impl → verify → gap → report → PR)
