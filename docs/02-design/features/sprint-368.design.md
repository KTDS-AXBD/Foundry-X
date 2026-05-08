---
code: FX-DESIGN-368
title: Sprint 368 — F633 ESLint rules 패키지 분리 설계
version: 1.0
status: Active
category: DESIGN
created: 2026-05-08
sprint: 368
f_item: F633
req: FX-REQ-698
---

# Sprint 368 — F633 ESLint rules 패키지 분리 설계

> Plan: `docs/01-plan/features/sprint-368.plan.md`

## §1 변경 목적

`packages/api/src/eslint-rules/*.mjs` runtime 파일들을 신규 workspace 패키지 `@foundry-x/eslint-config`로 추출하여:
- 5 fx-* 패키지의 cross-package 상대경로 import 안티패턴 해소
- ESLint 룰 SSOT를 monorepo workspace dep 표준으로 격상

## §2 아키텍처 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| 패키지명 | `@foundry-x/eslint-config` | monorepo workspace 관습 일관성 |
| 이동 범위 | `.mjs` runtime 5 + index.mjs만 | `.ts` + tests는 vitest/api 컨텍스트 의존 |
| workspace 인식 | `pnpm-workspace.yaml` `packages/*` 기존 glob | 추가 설정 불필요 |

## §3 신규 패키지 구조

```
packages/eslint-config/
├── package.json        (name=@foundry-x/eslint-config, type=module)
├── index.mjs           (foundryXApiPlugin export — ./rules/*.mjs import)
└── rules/
    ├── no-cross-domain-d1.mjs
    ├── no-cross-domain-import.mjs
    ├── no-direct-route-register.mjs
    ├── no-types-schema-barrel.mjs
    └── use-model-ssot.mjs
```

## §4 파일 이동 흐름

```
packages/api/src/eslint-rules/
  index.mjs           → 삭제 (신규 packages/eslint-config/index.mjs로 대체)
  no-cross-domain-d1.mjs        → git mv → packages/eslint-config/rules/
  no-cross-domain-import.mjs    → git mv → packages/eslint-config/rules/
  no-direct-route-register.mjs  → git mv → packages/eslint-config/rules/
  no-types-schema-barrel.mjs    → git mv → packages/eslint-config/rules/
  use-model-ssot.mjs            → git mv → packages/eslint-config/rules/
  index.ts            ← 잔존 (typecheck SSOT)
  *.ts / *.test.ts    ← 잔존 (vitest 컨텍스트)
```

## §5 파일 매핑

| 작업 | 파일 | 변경 유형 |
|------|------|-----------|
| 신규 | `packages/eslint-config/package.json` | new |
| 신규 | `packages/eslint-config/index.mjs` | new |
| git mv | `packages/api/src/eslint-rules/no-cross-domain-d1.mjs` → `packages/eslint-config/rules/` | rename |
| git mv | `packages/api/src/eslint-rules/no-cross-domain-import.mjs` → `packages/eslint-config/rules/` | rename |
| git mv | `packages/api/src/eslint-rules/no-direct-route-register.mjs` → `packages/eslint-config/rules/` | rename |
| git mv | `packages/api/src/eslint-rules/no-types-schema-barrel.mjs` → `packages/eslint-config/rules/` | rename |
| git mv | `packages/api/src/eslint-rules/use-model-ssot.mjs` → `packages/eslint-config/rules/` | rename |
| 삭제 | `packages/api/src/eslint-rules/index.mjs` | rm |
| 수정 | `packages/api/eslint.config.js` | import path 변경 |
| 수정 | `packages/api/package.json` | devDependencies +1 |
| 수정 | `packages/fx-agent/eslint.config.js` | import path 변경 |
| 수정 | `packages/fx-agent/package.json` | devDependencies +1 |
| 수정 | `packages/fx-discovery/eslint.config.js` | import path 변경 |
| 수정 | `packages/fx-discovery/package.json` | devDependencies +1 |
| 수정 | `packages/fx-modules/eslint.config.js` | import path 변경 |
| 수정 | `packages/fx-modules/package.json` | devDependencies +1 |
| 수정 | `packages/fx-offering/eslint.config.js` | import path 변경 |
| 수정 | `packages/fx-offering/package.json` | devDependencies +1 |
| 수정 | `packages/fx-shaping/eslint.config.js` | import path 변경 |
| 수정 | `packages/fx-shaping/package.json` | devDependencies +1 |

## §6 Phase Exit Criteria

| # | 항목 | 검증 |
|---|------|------|
| P-a | `packages/eslint-config/` 디렉토리 + 7 파일 존재 | find count ≥ 7 |
| P-b | 6 consumer `package.json` 에 workspace:* 등록 | grep count = 6 |
| P-c | 상대경로 `../api/src/eslint-rules` import 0건 | grep count = 0 |
| P-d | packages/api/src/eslint-rules/*.mjs 0개 | ls count = 0 |
| P-e | pnpm install + workspace symlink 확인 | ls node_modules/@foundry-x/eslint-config |
| P-f | `pnpm -r lint` errors 0 / warnings 0 | exit 0 |
| P-g | `pnpm -r typecheck` PASS | exit 0 |
| P-h | vitest eslint-rules tests PASS | exit 0 |
