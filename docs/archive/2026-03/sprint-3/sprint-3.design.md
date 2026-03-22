---
code: FX-DSGN-003
title: Sprint 3 (v0.3.0) — Ink TUI + eslint 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 0.3.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# Sprint 3 (v0.3.0) Design Document

> **Summary**: Ink TUI 컴포넌트 상세 설계 — 데이터 타입, 컴포넌트 인터페이스, 렌더링 분기, eslint 설정
>
> **Project**: Foundry-X
> **Version**: 0.3.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-16
> **Status**: Draft
> **Planning Doc**: [sprint-3.plan.md](../../01-plan/features/sprint-3.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **로직/렌더링 완전 분리** — 커맨드 함수는 데이터 객체만 반환, UI는 별도 레이어
2. **컴포넌트 재사용** — 3개 커맨드가 공유하는 공통 UI 컴포넌트 라이브러리
3. **TTY 투명 분기** — 한 곳(render.tsx)에서 Ink/plain text 자동 전환
4. **기존 테스트 무결성** — 비즈니스 로직 분리로 35개 테스트 변경 없이 유지
5. **eslint 품질 게이트** — flat config로 TypeScript 린트 규칙 적용

### 1.2 Design Principles

- **Single Responsibility**: 커맨드 = 로직, 뷰 = 렌더링, render.tsx = 디스패치
- **데이터 계약 우선**: 커맨드-뷰 간 타입 인터페이스를 먼저 정의하고 구현
- **Progressive Enhancement**: TTY에서 Ink 풍부한 출력, non-TTY에서 plain text 폴백

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────┐
│  CLI Entry (index.ts)                                │
│    └── Commander program.parse()                     │
├──────────────────────────────────────────────────────┤
│  Commands Layer (commands/*.ts)                      │
│    ├── initCommand()  → returns InitData             │
│    ├── statusCommand() → returns StatusData          │
│    └── syncCommand()  → returns SyncData             │
├──────────────────────────────────────────────────────┤
│  Render Layer (ui/render.tsx)                        │
│    ├── isTTY? → Ink render(<View data={...} />)      │
│    └── !isTTY → formatPlainText(data) → stdout       │
├──────────────────────────────────────────────────────┤
│  Views (ui/views/*.tsx)                              │
│    ├── StatusView  — composes: Header, HealthBar,    │
│    │                 StatusBadge, IntegrityList       │
│    ├── InitView    — composes: Header, ProgressStep, │
│    │                 Spinner, ResultList              │
│    └── SyncView    — composes: Header, HealthBar,    │
│                      GapList, DecisionList            │
├──────────────────────────────────────────────────────┤
│  Components (ui/components/*.tsx)                    │
│    Header, StatusBadge, HealthBar, ProgressStep,     │
│    Spinner, ErrorBox                                 │
├──────────────────────────────────────────────────────┤
│  Services / Harness / Plumb (existing, unchanged)   │
└──────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User runs CLI command
  → Commander parses args + options
  → Command function executes business logic (services, harness, plumb)
  → Command returns typed data object (StatusData / InitData / SyncData)
  → renderOutput(viewType, data, options) called
    → if TTY: Ink render(<View {...data} />) → waitUntilExit()
    → if --json: JSON.stringify(data) → stdout
    → if --short: formatShort(data) → stdout
    → if !TTY: formatPlainText(data) → stdout
```

### 2.3 Dependencies (신규)

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| `ui/render.tsx` | `ink` | Ink render() 호출 |
| `ui/views/*.tsx` | `ink`, `react`, `ui/components/` | 커맨드별 전체 뷰 |
| `ui/components/*.tsx` | `ink`, `react` | 재사용 가능 TUI 원자 컴포넌트 |
| `commands/*.ts` | `ui/render.tsx` | 렌더링 위임 (데이터만 전달) |
| `eslint.config.js` | `eslint`, `typescript-eslint` | 린트 규칙 |

---

## 3. Data Model — Command Output Types

기존 `@foundry-x/shared` 타입을 활용하고, 커맨드-뷰 간 계약용 타입을 추가해요.

### 3.1 StatusData

```typescript
// packages/cli/src/ui/types.ts

import type { FoundryXConfig, HealthScore, HarnessIntegrity } from '@foundry-x/shared';

/** status 커맨드가 반환하는 데이터 */
export interface StatusData {
  config: {
    mode: string;
    template: string;
    initialized: string;
  };
  healthScore: HealthScore | null;
  integrity: HarnessIntegrity;
  plumbAvailable: boolean;
}
```

### 3.2 InitData

```typescript
/** init 커맨드의 단계별 진행 상태 */
export type InitStep =
  | 'git-check'
  | 'detect-mode'
  | 'discover-stack'
  | 'analyze-arch'
  | 'resolve-template'
  | 'generate-harness'
  | 'verify-integrity'
  | 'save-config';

export interface InitStepResult {
  step: InitStep;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;  // e.g., "Mode: brownfield", "Languages: TypeScript, Python"
}

/** init 커맨드가 반환하는 데이터 */
export interface InitData {
  steps: InitStepResult[];
  result: {
    created: string[];
    merged: string[];
    skipped: string[];
  };
  integrity: {
    score: number;
  };
}
```

### 3.3 SyncData

```typescript
import type { SyncResult, HealthScore, GapItem, Decision } from '@foundry-x/shared';

/** sync 커맨드가 반환하는 데이터 */
export interface SyncData {
  triangle: {
    specToCode: { matched: number; total: number; gaps: GapItem[] };
    codeToTest: { matched: number; total: number; gaps: GapItem[] };
    specToTest: { matched: number; total: number; gaps: GapItem[] };
  };
  decisions: Decision[];
  healthScore: HealthScore;
}
```

### 3.4 공통 렌더링 옵션

```typescript
/** 모든 커맨드 공통 출력 옵션 */
export interface RenderOptions {
  json: boolean;
  short?: boolean;
  verbose?: boolean;
}
```

---

## 4. Component Specifications

### 4.1 공통 컴포넌트 (`ui/components/`)

#### Header

```typescript
// ui/components/Header.tsx
interface HeaderProps {
  title: string;       // e.g., "Foundry-X Status"
  subtitle?: string;   // e.g., "brownfield · default template"
}
```

```
┌─ Foundry-X Status ──────────────────────┐
│  brownfield · default template          │
└─────────────────────────────────────────┘
```

- Ink `<Box>` + `<Text bold>` 사용
- 80자 폭 기준 보더 렌더링

#### StatusBadge

```typescript
// ui/components/StatusBadge.tsx
interface StatusBadgeProps {
  level: 'PASS' | 'WARN' | 'FAIL';
  label: string;        // e.g., "CLAUDE.md exists"
  message?: string;     // e.g., "found at root"
}
```

```
  [✓] CLAUDE.md exists: found at root
  [!] .gitignore: missing patterns
  [✗] tests: not found
```

- `PASS` → green `✓`, `WARN` → yellow `!`, `FAIL` → red `✗`

#### HealthBar

```typescript
// ui/components/HealthBar.tsx
interface HealthBarProps {
  label: string;       // e.g., "Spec→Code"
  score: number;       // 0-100
  width?: number;      // bar width in chars (default: 20)
}
```

```
  Overall:    ████████████████░░░░  82.3 (B)
  Spec→Code:  ██████████████████░░  91.0
  Code→Test:  ████████████████░░░░  78.5
  Spec→Test:  ███████████████░░░░░  77.3
```

- score >= 90: green, >= 70: yellow, < 70: red
- `█` filled, `░` empty

#### ProgressStep

```typescript
// ui/components/ProgressStep.tsx
interface ProgressStepProps {
  steps: Array<{
    label: string;
    status: 'pending' | 'running' | 'done' | 'error';
    detail?: string;
  }>;
}
```

```
  ✓ Git repository check
  ✓ Detect mode: brownfield
  ● Discover stack...
  ○ Analyze architecture
  ○ Generate harness
```

- `done` → green `✓`, `running` → cyan `●` (+ spinner), `pending` → dim `○`, `error` → red `✗`

#### ErrorBox

```typescript
// ui/components/ErrorBox.tsx
interface ErrorBoxProps {
  title: string;         // e.g., "Not Initialized"
  message: string;       // e.g., "Run 'foundry-x init' first"
  code?: string;         // e.g., "NOT_INITIALIZED"
}
```

```
┌─ Error ──────────────────────────────────┐
│  NOT_INITIALIZED                         │
│  Run 'foundry-x init' first             │
└──────────────────────────────────────────┘
```

- red border, bold title

### 4.2 뷰 컴포넌트 (`ui/views/`)

#### StatusView

```typescript
// ui/views/StatusView.tsx
import type { StatusData } from '../types.js';

interface StatusViewProps extends StatusData {}
```

**렌더링 구조:**
```
<Header title="Foundry-X Status" subtitle={`${mode} · ${template}`} />

<Box label="Project">
  Mode:      {mode}
  Template:  {template}
  Init:      {initialized}
</Box>

<Box label="Health Score">
  <HealthBar label="Overall" score={overall} />    // + grade badge
  <HealthBar label="Spec→Code" score={specToCode} />
  <HealthBar label="Code→Test" score={codeToTest} />
  <HealthBar label="Spec→Test" score={specToTest} />
</Box>
// OR "Health Score: unavailable (Plumb not installed)" if null

<Box label="Harness Integrity">
  Score: {score}/100 ({passed ? 'PASS' : 'FAIL'})
  {checks.map(c => <StatusBadge level={c.level} label={c.name} message={c.message} />)}
</Box>
```

#### InitView

```typescript
// ui/views/InitView.tsx
import type { InitData } from '../types.js';

interface InitViewProps extends InitData {}
```

**렌더링 구조:**
```
<Header title="Foundry-X Init" />

<ProgressStep steps={steps} />

<Box label="Results">
  Created:
    + CLAUDE.md
    + .github/workflows/ci.yml
  Merged:
    ~ .gitignore
  Skipped:
    - tsconfig.json (exists)
</Box>

<Text>Harness Integrity: {score}/100</Text>
```

#### SyncView

```typescript
// ui/views/SyncView.tsx
import type { SyncData } from '../types.js';

interface SyncViewProps extends SyncData {}
```

**렌더링 구조:**
```
<Header title="SDD Triangle Sync" />

<Box label="Triangle">
  <HealthBar label="Spec→Code" score={ratio(specToCode)} />
  <HealthBar label="Code→Test" score={ratio(codeToTest)} />
  <HealthBar label="Spec→Test" score={ratio(specToTest)} />
</Box>

{gaps.length > 0 && (
  <Box label={`Gaps (${gaps.length})`}>
    {gaps.map(g => <Text>[{g.type}] {g.path}: {g.description}</Text>)}
  </Box>
)}

{decisions.length > 0 && (
  <Box label={`Decisions (${decisions.length})`}>
    {decisions.map(d => <Text>[{d.status}] {d.summary} ({d.source})</Text>)}
  </Box>
)}

<HealthBar label="Overall" score={healthScore.overall} />
```

---

## 5. Render Utility (`ui/render.tsx`)

### 5.1 Core Interface

```typescript
// ui/render.tsx
import { render } from 'ink';
import React from 'react';

type ViewType = 'status' | 'init' | 'sync';
type ViewData = StatusData | InitData | SyncData;

/**
 * 출력 디스패처 — TTY/옵션에 따라 Ink 또는 plain text로 렌더링
 *
 * 분기 우선순위:
 * 1. --json → JSON.stringify
 * 2. --short → formatShort()
 * 3. !isTTY → formatPlainText()
 * 4. isTTY → Ink render()
 */
export async function renderOutput(
  view: ViewType,
  data: ViewData,
  options: RenderOptions,
): Promise<void> {
  // 1. JSON 모드
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // 2. Short 모드
  if (options.short) {
    console.log(formatShort(view, data));
    return;
  }

  // 3. Non-TTY 폴백
  if (!process.stdout.isTTY) {
    console.log(formatPlainText(view, data));
    return;
  }

  // 4. Ink TUI 렌더링
  const Component = getViewComponent(view);
  const { waitUntilExit } = render(
    React.createElement(Component, data as any),
  );
  await waitUntilExit();
}
```

### 5.2 Plain Text Formatter

```typescript
/** Non-TTY용 plain text 포맷터 — 기존 console.log 출력과 동일한 형식 */
function formatPlainText(view: ViewType, data: ViewData): string {
  switch (view) {
    case 'status': return formatStatusPlain(data as StatusData);
    case 'init':   return formatInitPlain(data as InitData);
    case 'sync':   return formatSyncPlain(data as SyncData);
  }
}
```

- `formatStatusPlain()` — 기존 `status.ts`의 console.log 출력과 **100% 동일한 텍스트** 생성
- 기존 출력 형식은 backward compatibility를 위해 유지 (파싱하는 스크립트가 있을 수 있음)

### 5.3 View Registry

```typescript
function getViewComponent(view: ViewType): React.FC<any> {
  const views = {
    status: StatusView,
    init: InitView,
    sync: SyncView,
  };
  return views[view];
}
```

---

## 6. Command Refactoring

각 커맨드 파일의 변경 전/후 비교. 비즈니스 로직을 `run*()` 함수로 추출하고, Commander action에서 `renderOutput()`을 호출해요.

### 6.1 status.ts — Before/After

**Before** (현재):
```typescript
cmd.action(async (options) => {
  // ... 비즈니스 로직 ...
  // 출력 (console.log 직접 호출)
  if (options.json) { console.log(JSON.stringify(...)); return; }
  console.log('Foundry-X Status\n');
  console.log(`    Mode:      ${config.mode}`);
  // ... 40줄 이상의 console.log ...
});
```

**After** (Sprint 3):
```typescript
/** 비즈니스 로직 — 데이터만 반환 */
export async function runStatus(cwd: string): Promise<StatusData> {
  const configManager = new ConfigManager(cwd);
  if (!(await configManager.exists())) throw new NotInitializedError();
  const config = await configManager.read();
  // ... PlumbBridge, HealthScore, verifyHarness ...
  return { config: { mode, template, initialized }, healthScore, integrity, plumbAvailable };
}

/** Commander 등록 */
export function statusCommand(): Command {
  const cmd = new Command('status');
  cmd
    .option('--json', 'output as JSON', false)
    .option('--short', 'show compact output', false)
    .action(async (options) => {
      const data = await runStatus(process.cwd());
      await renderOutput('status', data, options);
    });
  return cmd;
}
```

**핵심**: `runStatus()`는 순수 데이터 반환 → 기존 테스트에서 이 함수를 직접 테스트

### 6.2 init.ts — 변경 포인트

- 기존: 단계마다 `console.log()`로 즉시 출력
- **변경**: 단계별 결과를 `InitStepResult[]` 배열에 수집 → 최종 `InitData` 반환
- **주의**: init은 단계가 순차적이므로, 실시간 스피너 표시를 위해 콜백 패턴 또는 이벤트 이미터 검토 필요

```typescript
/** 실시간 진행 표시를 위한 콜백 옵션 */
export interface InitCallbacks {
  onStepStart?: (step: InitStep, label: string) => void;
  onStepDone?: (step: InitStep, detail: string) => void;
}

export async function runInit(
  cwd: string,
  options: InitOptions,
  callbacks?: InitCallbacks,
): Promise<InitData> {
  // 각 단계에서 callbacks.onStepStart/onStepDone 호출
  // Ink 모드에서는 이 콜백이 React state를 업데이트
}
```

### 6.3 sync.ts — 변경 포인트

- 기존과 유사한 패턴: 로직 → 데이터 → `renderOutput('sync', data, options)`
- `SyncData` 타입으로 깔끔하게 변환

---

## 7. eslint Configuration (F19)

### 7.1 패키지 설치

```bash
cd packages/cli
pnpm add -D eslint @eslint/js typescript-eslint
```

### 7.2 eslint.config.js

```javascript
// packages/cli/eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',   // CLI이므로 console 허용
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '**/*.test.ts'],
  },
);
```

### 7.3 예상 수정 사항

현재 코드 분석 기반 예상 lint 이슈:

| 파일 | 예상 이슈 | 수정 방법 |
|------|-----------|-----------|
| `commands/*.ts` | `catch` 미사용 변수 | `catch (_err)` 또는 `catch (err: unknown)` |
| `harness/*.ts` | 일부 `any` 타입 | 구체적 타입으로 교체 또는 `warn` 유지 |
| `plumb/bridge.ts` | `any` subprocess 결과 | `unknown` + 타입 가드 |
| 전체 | `import type` 미분리 | `consistent-type-imports` 규칙으로 자동 수정 |

---

## 8. Test Plan

### 8.1 테스트 전략

| Type | Target | Tool | 변경 |
|------|--------|------|------|
| Unit Test | 비즈니스 로직 (run*) | vitest | **기존 유지 — 테스트 대상이 run* 함수로 이동** |
| Unit Test | UI 컴포넌트 | ink-testing-library | **Out of scope (Sprint 4)** |
| Manual Test | TTY Ink 렌더링 | 직접 실행 | `foundry-x status` / `init` / `sync` |
| Manual Test | non-TTY 폴백 | pipe 테스트 | `foundry-x status \| cat` |
| Manual Test | `--json` / `--short` | 직접 실행 | 기존 동작 유지 확인 |

### 8.2 기존 테스트 영향 분석

```
테스트 파일 (8개)               변경 필요 여부
──────────────────────────     ──────────────
harness/detect.test.ts          ✅ 변경 없음
harness/discover.test.ts        ✅ 변경 없음
harness/generate.test.ts        ✅ 변경 없음
harness/merge-utils.test.ts     ✅ 변경 없음
harness/verify.test.ts          ✅ 변경 없음
plumb/*.test.ts                 ✅ 변경 없음
services/*.test.ts              ✅ 변경 없음
commands/*.test.ts              ⚠️ import 경로 변경 가능 (runStatus 등)
```

- 커맨드 테스트가 `runStatus()` 등을 직접 import하는 경우 경로만 변경
- 비즈니스 로직 자체는 동일하므로 assertion 변경 없음

### 8.3 Regression Checklist

- [ ] `foundry-x status` — TTY에서 Ink 렌더링 확인
- [ ] `foundry-x status --json` — 기존과 동일한 JSON 출력
- [ ] `foundry-x status --short` — 기존과 동일한 compact 출력
- [ ] `foundry-x status | cat` — non-TTY에서 plain text 출력
- [ ] `foundry-x init` — 단계별 진행 표시
- [ ] `foundry-x init --force` — 재초기화 정상 동작
- [ ] `foundry-x sync` — Plumb 연동 + Triangle 표시
- [ ] `foundry-x sync --json` — JSON 출력
- [ ] `pnpm lint` — 0 error
- [ ] `pnpm typecheck` — 0 error
- [ ] `pnpm build` — dist/ 정상 생성
- [ ] `pnpm test` — 35/35 pass

---

## 9. Implementation Order

| # | 파일/작업 | F# | 의존성 | 예상 LOC |
|:-:|----------|:--:|:------:|:--------:|
| 1 | `pnpm add -D eslint @eslint/js typescript-eslint` | F19 | — | — |
| 2 | `packages/cli/eslint.config.js` 생성 | F19 | #1 | ~25 |
| 3 | 기존 코드 lint fix | F19 | #2 | ~30 수정 |
| 4 | `ui/types.ts` — StatusData, InitData, SyncData, RenderOptions | F15 | — | ~60 |
| 5 | `ui/render.tsx` — renderOutput, formatPlainText, formatShort | F15, F20 | #4 | ~80 |
| 6 | `ui/components/Header.tsx` | F15 | — | ~20 |
| 7 | `ui/components/StatusBadge.tsx` | F15 | — | ~25 |
| 8 | `ui/components/HealthBar.tsx` | F15 | — | ~35 |
| 9 | `ui/components/ProgressStep.tsx` | F15 | — | ~30 |
| 10 | `ui/components/ErrorBox.tsx` | F15 | — | ~20 |
| 11 | `commands/status.ts` 리팩터 → runStatus() + renderOutput() | F16 | #4, #5 | ~20 수정 |
| 12 | `ui/views/StatusView.tsx` | F16 | #6-#8 | ~50 |
| 13 | `commands/init.ts` 리팩터 → runInit() + callbacks | F17 | #4, #5 | ~30 수정 |
| 14 | `ui/views/InitView.tsx` | F17 | #6, #9 | ~45 |
| 15 | `commands/sync.ts` 리팩터 → runSync() + renderOutput() | F18 | #4, #5 | ~15 수정 |
| 16 | `ui/views/SyncView.tsx` | F18 | #6, #8 | ~40 |
| 17 | 전체 테스트 실행 + regression 확인 | — | #11-#16 | — |
| 18 | non-TTY 폴백 검증 (pipe test) | F20 | #5 | — |
| 19 | typecheck + build + lint 최종 확인 | — | all | — |
| 20 | v0.3.0 버전 범프 + CHANGELOG | — | #19 | — |

---

## 10. Coding Convention (Sprint 3 적용)

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| TSX Components | PascalCase | `StatusBadge.tsx`, `HealthBar.tsx` |
| TSX Component type | `FC<Props>` 대신 함수 선언 | `export function Header(props: HeaderProps)` |
| Data types | PascalCase + `Data` suffix | `StatusData`, `InitData` |
| Props types | PascalCase + `Props` suffix | `HeaderProps`, `HealthBarProps` |
| View components | PascalCase + `View` suffix | `StatusView`, `InitView` |
| Utility files | camelCase | `render.tsx`, `types.ts` |

### 10.2 Import Order

```typescript
// 1. Node built-ins
import { resolve } from 'node:path';

// 2. External packages
import { Box, Text } from 'ink';
import React from 'react';

// 3. Internal absolute (monorepo)
import type { HealthScore } from '@foundry-x/shared';

// 4. Relative imports
import { Header } from '../components/Header.js';

// 5. Type-only imports (consistent-type-imports)
import type { StatusData } from '../types.js';
```

### 10.3 Component Pattern

```typescript
// Ink 컴포넌트 표준 패턴
import { Box, Text } from 'ink';

interface HealthBarProps {
  label: string;
  score: number;
  width?: number;
}

export function HealthBar({ label, score, width = 20 }: HealthBarProps) {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const color = score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red';

  return (
    <Box>
      <Text>{label.padEnd(12)}</Text>
      <Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>
      <Text>  {score.toFixed(1)}</Text>
    </Box>
  );
}
```

---

## 11. File Structure (최종)

```
packages/cli/src/
├── commands/
│   ├── init.ts              # ← MODIFIED: runInit() 추출, renderOutput 호출
│   ├── status.ts            # ← MODIFIED: runStatus() 추출, renderOutput 호출
│   └── sync.ts              # ← MODIFIED: runSync() 추출, renderOutput 호출
├── ui/                      # ← NEW DIRECTORY
│   ├── types.ts             # StatusData, InitData, SyncData, RenderOptions
│   ├── render.tsx           # renderOutput(), formatPlainText(), formatShort()
│   ├── components/
│   │   ├── Header.tsx       # 공통 헤더
│   │   ├── StatusBadge.tsx  # PASS/WARN/FAIL 뱃지
│   │   ├── HealthBar.tsx    # 점수 시각화 바
│   │   ├── ProgressStep.tsx # 단계별 진행 표시
│   │   └── ErrorBox.tsx     # 에러 메시지 박스
│   └── views/
│       ├── StatusView.tsx   # status 전체 뷰
│       ├── InitView.tsx     # init 전체 뷰
│       └── SyncView.tsx     # sync 전체 뷰
├── harness/                 # (unchanged)
├── plumb/                   # (unchanged)
├── services/                # (unchanged)
└── index.ts                 # (unchanged)
```

**신규 파일**: 12개 (types.ts + render.tsx + 5 components + 3 views + eslint.config.js + 1 config)
**수정 파일**: 3개 (commands/init.ts, status.ts, sync.ts)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft — 컴포넌트 설계, 타입 정의, 구현 순서 | Sinclair Seo |
