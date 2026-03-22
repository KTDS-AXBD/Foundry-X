---
code: FX-DSGN-004
title: Sprint 4 (v0.4.0) — UI 테스트 프레임워크 + Ink 실시간 업데이트 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 0.4.0
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# Sprint 4 (v0.4.0) Design Document

> **Summary**: ink-testing-library 기반 컴포넌트 테스트 상세 설계 + `status --watch` 실시간 모니터링 아키텍처
>
> **Project**: Foundry-X
> **Version**: 0.4.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-16
> **Status**: Draft
> **Planning Doc**: [sprint-4.plan.md](../../01-plan/features/sprint-4.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **테스트 인프라 구축** — vitest + ink-testing-library로 TSX 컴포넌트 테스트 파이프라인 확립
2. **공통 컴포넌트 100% 커버** — 5개 컴포넌트의 모든 prop 조합에 대한 단위 테스트
3. **View 통합 테스트** — 3개 View가 올바른 데이터 렌더링을 검증
4. **렌더링 분기 테스트** — render.tsx의 4-branch(json/short/non-TTY/TTY) 각각 검증
5. **Watch 모드** — `status --watch`로 파일 변경 시 자동 리렌더링, 개발 루프 단축

### 1.2 Design Principles

- **실제 렌더링 검증**: mock 없이 ink-testing-library의 `render()` → `lastFrame()` 으로 실제 Ink 출력 검증
- **데이터 팩토리 패턴**: 테스트 데이터를 중앙 헬퍼로 관리, 변형은 spread로 오버라이드
- **Watch = React State**: fs.watch 이벤트 → `setState` → Ink 자동 리렌더 (명령적 갱신 없음)

---

## 2. Architecture

### 2.1 테스트 인프라 변경

```
packages/cli/
├── vitest.config.ts                # MODIFY: include에 *.test.tsx 추가
├── package.json                    # MODIFY: ink-testing-library devDep 추가
└── src/
    ├── ui/
    │   ├── __tests__/
    │   │   └── test-data.ts        # NEW: 공통 테스트 데이터 팩토리
    │   ├── components/
    │   │   ├── Header.test.tsx     # NEW
    │   │   ├── StatusBadge.test.tsx # NEW
    │   │   ├── HealthBar.test.tsx  # NEW
    │   │   ├── ProgressStep.test.tsx # NEW
    │   │   └── ErrorBox.test.tsx   # NEW
    │   ├── views/
    │   │   ├── StatusView.test.tsx  # NEW
    │   │   ├── InitView.test.tsx    # NEW
    │   │   ├── SyncView.test.tsx    # NEW
    │   │   └── StatusWatchView.tsx  # NEW: watch 모드 전용 뷰
    │   ├── render.test.tsx          # NEW
    │   └── render.tsx               # MODIFY: watch 뷰 등록 + ViewType 확장
    └── commands/
        └── status.ts               # MODIFY: --watch 옵션 추가
```

### 2.2 Dependency Changes

```diff
# packages/cli/package.json devDependencies
+ "ink-testing-library": "^4.0.0"
```

> `ink-testing-library@4`는 Ink v5 호환. `render()` → `lastFrame()` → `frames` API 제공.

### 2.3 vitest.config.ts 변경

```typescript
// BEFORE
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});

// AFTER
export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
```

> vitest는 esbuild를 기본 트랜스포머로 사용하므로 JSX 변환이 자동 지원돼요.
> `tsconfig.json`에 이미 `"jsx": "react-jsx"`가 설정되어 있으므로 추가 설정 불필요.

---

## 3. 테스트 데이터 팩토리

### 3.1 `src/ui/__tests__/test-data.ts`

```typescript
import type { StatusData, InitData, SyncData, InitStepResult } from '../types.js';

// ── StatusData ──

export function makeStatusData(overrides?: Partial<StatusData>): StatusData {
  return {
    config: { mode: 'brownfield', template: 'default', initialized: '2026-03-16' },
    healthScore: {
      overall: 85.5,
      grade: 'B',
      specToCode: 90.0,
      codeToTest: 80.0,
      specToTest: 78.5,
    },
    integrity: {
      score: 95,
      passed: true,
      checks: [
        { name: 'CLAUDE.md', level: 'PASS' as const, message: 'found at root' },
        { name: '.gitignore', level: 'WARN' as const, message: 'missing patterns' },
        { name: 'tests', level: 'PASS' as const, message: '8 test files' },
      ],
    },
    plumbAvailable: true,
    ...overrides,
  };
}

export function makeStatusDataNoPlumb(): StatusData {
  return makeStatusData({ healthScore: null, plumbAvailable: false });
}

// ── InitData ──

export function makeInitSteps(
  statuses: Array<InitStepResult['status']> = ['done', 'done', 'done', 'done', 'done', 'done', 'done', 'done'],
): InitStepResult[] {
  const labels = [
    'Git repository check',
    'Detect mode',
    'Discover stack',
    'Analyze architecture',
    'Resolve template',
    'Generate harness',
    'Verify integrity',
    'Save config',
  ];
  const steps: Array<'git-check' | 'detect-mode' | 'discover-stack' | 'analyze-arch' | 'resolve-template' | 'generate-harness' | 'verify-integrity' | 'save-config'> = [
    'git-check', 'detect-mode', 'discover-stack', 'analyze-arch',
    'resolve-template', 'generate-harness', 'verify-integrity', 'save-config',
  ];
  return steps.map((step, i) => ({
    step,
    label: labels[i],
    status: statuses[i] ?? 'pending',
    detail: statuses[i] === 'done' ? 'OK' : undefined,
  }));
}

export function makeInitData(overrides?: Partial<InitData>): InitData {
  return {
    steps: makeInitSteps(),
    result: { created: ['CLAUDE.md', '.github/ci.yml'], merged: ['.gitignore'], skipped: ['tsconfig.json'] },
    integrity: { score: 92 },
    ...overrides,
  };
}

// ── SyncData ──

export function makeSyncData(overrides?: Partial<SyncData>): SyncData {
  return {
    triangle: {
      specToCode: { matched: 9, total: 10, gaps: [] },
      codeToTest: { matched: 7, total: 10, gaps: [{ type: 'missing-test', path: 'src/foo.ts', description: 'No test file' }] },
      specToTest: { matched: 8, total: 10, gaps: [] },
    },
    decisions: [{ status: 'approved', summary: 'Add test for foo', source: 'plumb' }],
    healthScore: { overall: 80.0, grade: 'B', specToCode: 90, codeToTest: 70, specToTest: 80 },
    ...overrides,
  };
}
```

**설계 근거**: 각 테스트에서 `makeStatusData({ healthScore: null })` 처럼 부분 오버라이드로 특정 케이스를 표현. 데이터 구조가 변경되면 팩토리 한 곳만 수정하면 돼요.

---

## 4. 컴포넌트 테스트 상세 설계

### 4.1 테스트 패턴

모든 컴포넌트 테스트는 동일한 패턴을 따라요:

```typescript
import React from 'react';
import { render } from 'ink-testing-library';
import { ComponentName } from './ComponentName.js';

describe('ComponentName', () => {
  it('특정 조건에서 기대 출력을 포함한다', () => {
    const { lastFrame } = render(<ComponentName prop="value" />);
    expect(lastFrame()).toContain('expected text');
  });
});
```

> `lastFrame()` — 마지막 렌더링 프레임을 ANSI strip된 문자열로 반환.
> `frames` — 렌더링 히스토리 배열 (리렌더 추적용).
> `stdin.write()` — 키 입력 시뮬레이션 (watch 모드 테스트용).

### 4.2 Header.test.tsx

```typescript
describe('Header', () => {
  it('title을 렌더링한다', () => {
    const { lastFrame } = render(<Header title="Test Title" />);
    expect(lastFrame()).toContain('Test Title');
  });

  it('subtitle이 있으면 title 아래에 렌더링한다', () => {
    const { lastFrame } = render(<Header title="Title" subtitle="Sub" />);
    expect(lastFrame()).toContain('Title');
    expect(lastFrame()).toContain('Sub');
  });

  it('subtitle이 없으면 title만 렌더링한다', () => {
    const { lastFrame } = render(<Header title="Only Title" />);
    expect(lastFrame()).toContain('Only Title');
    // subtitle이 없으므로 다른 텍스트가 없어야 함
  });
});
```

**테스트 수**: 3

### 4.3 StatusBadge.test.tsx

```typescript
describe('StatusBadge', () => {
  it('PASS level — 초록 체크 아이콘 + label', () => {
    const { lastFrame } = render(<StatusBadge level="PASS" label="CLAUDE.md" />);
    expect(lastFrame()).toContain('✓');
    expect(lastFrame()).toContain('CLAUDE.md');
  });

  it('WARN level — 노란 ! 아이콘 + label', () => {
    const { lastFrame } = render(<StatusBadge level="WARN" label=".gitignore" />);
    expect(lastFrame()).toContain('!');
    expect(lastFrame()).toContain('.gitignore');
  });

  it('FAIL level — 빨간 ✗ 아이콘 + label', () => {
    const { lastFrame } = render(<StatusBadge level="FAIL" label="tests" />);
    expect(lastFrame()).toContain('✗');
    expect(lastFrame()).toContain('tests');
  });

  it('message가 있으면 label 뒤에 표시', () => {
    const { lastFrame } = render(<StatusBadge level="PASS" label="CLAUDE.md" message="found at root" />);
    expect(lastFrame()).toContain('found at root');
  });

  it('message가 없으면 label만 표시', () => {
    const { lastFrame } = render(<StatusBadge level="PASS" label="CLAUDE.md" />);
    expect(lastFrame()).toContain('CLAUDE.md');
    expect(lastFrame()).not.toContain('undefined');
  });
});
```

**테스트 수**: 5

### 4.4 HealthBar.test.tsx

```typescript
describe('HealthBar', () => {
  it('label과 score를 렌더링한다', () => {
    const { lastFrame } = render(<HealthBar label="Overall" score={85} />);
    expect(lastFrame()).toContain('Overall');
    expect(lastFrame()).toContain('85%');
  });

  it('score >= 90 — 초록 색상 영역 (정확한 채움 비율)', () => {
    const { lastFrame } = render(<HealthBar label="Test" score={100} width={10} />);
    expect(lastFrame()).toContain('100%');
    // 10칸 모두 채워짐 (█ 10개)
    expect(lastFrame()).toContain('██████████');
  });

  it('score 0 — 빨간 색상, 빈 바', () => {
    const { lastFrame } = render(<HealthBar label="Test" score={0} width={10} />);
    expect(lastFrame()).toContain('0%');
    // 빈 바 10칸 (░ 10개)
    expect(lastFrame()).toContain('░░░░░░░░░░');
  });

  it('score 50 — 절반 채움', () => {
    const { lastFrame } = render(<HealthBar label="Mid" score={50} width={10} />);
    expect(lastFrame()).toContain('50%');
    expect(lastFrame()).toContain('█████');
    expect(lastFrame()).toContain('░░░░░');
  });

  it('score > 100 — 100으로 클램핑', () => {
    const { lastFrame } = render(<HealthBar label="Over" score={150} width={10} />);
    expect(lastFrame()).toContain('100%');
  });

  it('score < 0 — 0으로 클램핑', () => {
    const { lastFrame } = render(<HealthBar label="Under" score={-10} width={10} />);
    expect(lastFrame()).toContain('0%');
  });

  it('width 기본값은 20', () => {
    const { lastFrame } = render(<HealthBar label="Default" score={50} />);
    const frame = lastFrame() ?? '';
    // 10개 채움 + 10개 빈칸 (width=20, score=50)
    expect(frame).toContain('██████████');
  });
});
```

**테스트 수**: 7

### 4.5 ProgressStep.test.tsx

```typescript
describe('ProgressStep', () => {
  it('done 상태 — ✓ 아이콘 + label', () => {
    const steps = [{ label: 'Git check', status: 'done' as const }];
    const { lastFrame } = render(<ProgressStep steps={steps} />);
    expect(lastFrame()).toContain('✓');
    expect(lastFrame()).toContain('Git check');
  });

  it('running 상태 — ● 아이콘', () => {
    const steps = [{ label: 'Discovering', status: 'running' as const }];
    const { lastFrame } = render(<ProgressStep steps={steps} />);
    expect(lastFrame()).toContain('●');
    expect(lastFrame()).toContain('Discovering');
  });

  it('pending 상태 — ○ 아이콘', () => {
    const steps = [{ label: 'Generate', status: 'pending' as const }];
    const { lastFrame } = render(<ProgressStep steps={steps} />);
    expect(lastFrame()).toContain('○');
  });

  it('error 상태 — ✗ 아이콘', () => {
    const steps = [{ label: 'Failed step', status: 'error' as const }];
    const { lastFrame } = render(<ProgressStep steps={steps} />);
    expect(lastFrame()).toContain('✗');
  });

  it('detail이 있으면 label 뒤에 표시', () => {
    const steps = [{ label: 'Detect mode', status: 'done' as const, detail: 'brownfield' }];
    const { lastFrame } = render(<ProgressStep steps={steps} />);
    expect(lastFrame()).toContain('brownfield');
  });

  it('여러 단계를 순서대로 렌더링', () => {
    const steps = [
      { label: 'Step 1', status: 'done' as const },
      { label: 'Step 2', status: 'running' as const },
      { label: 'Step 3', status: 'pending' as const },
    ];
    const { lastFrame } = render(<ProgressStep steps={steps} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Step 1');
    expect(frame).toContain('Step 2');
    expect(frame).toContain('Step 3');
  });
});
```

**테스트 수**: 6

### 4.6 ErrorBox.test.tsx

```typescript
describe('ErrorBox', () => {
  it('title과 message를 렌더링한다', () => {
    const { lastFrame } = render(<ErrorBox title="Not Initialized" message="Run init first" />);
    expect(lastFrame()).toContain('Not Initialized');
    expect(lastFrame()).toContain('Run init first');
  });

  it('code가 있으면 표시', () => {
    const { lastFrame } = render(<ErrorBox title="Error" message="msg" code="NOT_INIT" />);
    expect(lastFrame()).toContain('NOT_INIT');
  });

  it('code가 없으면 code 줄 미표시', () => {
    const { lastFrame } = render(<ErrorBox title="Error" message="msg" />);
    expect(lastFrame()).not.toContain('Code:');
  });
});
```

**테스트 수**: 3

---

## 5. View 통합 테스트 상세 설계

### 5.1 StatusView.test.tsx

```typescript
import { makeStatusData, makeStatusDataNoPlumb } from '../__tests__/test-data.js';

describe('StatusView', () => {
  it('정상 데이터 — config, health bars, integrity 모두 렌더링', () => {
    const data = makeStatusData();
    const { lastFrame } = render(<StatusView {...data} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Foundry-X Status');
    expect(frame).toContain('brownfield');
    expect(frame).toContain('Overall');
    expect(frame).toContain('85%');
    expect(frame).toContain('CLAUDE.md');
  });

  it('Plumb 미설치 — health score "unavailable" 표시', () => {
    const data = makeStatusDataNoPlumb();
    const { lastFrame } = render(<StatusView {...data} />);
    expect(lastFrame()).toContain('unavailable');
  });

  it('integrity checks가 올바른 아이콘으로 렌더링', () => {
    const data = makeStatusData();
    const { lastFrame } = render(<StatusView {...data} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('✓'); // PASS check
    expect(frame).toContain('!'); // WARN check
  });
});
```

**테스트 수**: 3

### 5.2 InitView.test.tsx

```typescript
import { makeInitData, makeInitSteps } from '../__tests__/test-data.js';

describe('InitView', () => {
  it('모든 단계 done — 성공 메시지 + 파일 목록 렌더링', () => {
    const data = makeInitData();
    const { lastFrame } = render(<InitView {...data} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('Foundry-X Init');
    expect(frame).toContain('CLAUDE.md');
    expect(frame).toContain('92');
  });

  it('진행 중 — running 단계와 pending 단계가 구분됨', () => {
    const steps = makeInitSteps(['done', 'done', 'running', 'pending', 'pending', 'pending', 'pending', 'pending']);
    const data = makeInitData({ steps });
    const { lastFrame } = render(<InitView {...data} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('✓'); // done
    expect(frame).toContain('●'); // running
    expect(frame).toContain('○'); // pending
  });
});
```

**테스트 수**: 2

### 5.3 SyncView.test.tsx

```typescript
import { makeSyncData } from '../__tests__/test-data.js';

describe('SyncView', () => {
  it('정상 데이터 — triangle bars + gaps + decisions 렌더링', () => {
    const data = makeSyncData();
    const { lastFrame } = render(<SyncView {...data} />);
    const frame = lastFrame() ?? '';
    expect(frame).toContain('SDD Triangle');
    expect(frame).toContain('No test file'); // gap
    expect(frame).toContain('Add test for foo'); // decision
  });

  it('gap이 없으면 gap 섹션 미표시', () => {
    const data = makeSyncData({
      triangle: {
        specToCode: { matched: 10, total: 10, gaps: [] },
        codeToTest: { matched: 10, total: 10, gaps: [] },
        specToTest: { matched: 10, total: 10, gaps: [] },
      },
    });
    const { lastFrame } = render(<SyncView {...data} />);
    expect(lastFrame()).not.toContain('Gaps');
  });
});
```

**테스트 수**: 2

---

## 6. render.tsx 분기 테스트

### 6.1 render.test.tsx

render.tsx의 4-branch 분기를 테스트해요. Ink 렌더링 분기는 ink-testing-library로 간접 검증하고, 나머지 3개 분기(json/short/non-TTY)는 `console.log` spy로 검증해요.

```typescript
import { vi } from 'vitest';
import { renderOutput } from './render.js';
import { makeStatusData, makeInitData, makeSyncData } from './__tests__/test-data.js';

describe('renderOutput', () => {
  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  afterEach(() => consoleSpy.mockClear());
  afterAll(() => consoleSpy.mockRestore());

  describe('json 모드', () => {
    it('status — JSON.stringify 출력', async () => {
      const data = makeStatusData();
      await renderOutput('status', data, { json: true });
      expect(consoleSpy).toHaveBeenCalledOnce();
      const output = consoleSpy.mock.calls[0][0];
      expect(JSON.parse(output)).toHaveProperty('config');
    });

    it('init — JSON.stringify 출력', async () => {
      await renderOutput('init', makeInitData(), { json: true });
      const output = consoleSpy.mock.calls[0][0];
      expect(JSON.parse(output)).toHaveProperty('steps');
    });
  });

  describe('short 모드', () => {
    it('status — compact 한 줄 출력', async () => {
      await renderOutput('status', makeStatusData(), { json: false, short: true });
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('[brownfield]');
      expect(output).toContain('health=');
    });

    it('init — compact 한 줄 출력', async () => {
      await renderOutput('init', makeInitData(), { json: false, short: true });
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('init:');
      expect(output).toContain('created');
    });

    it('sync — compact 한 줄 출력', async () => {
      await renderOutput('sync', makeSyncData(), { json: false, short: true });
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('sync:');
    });
  });

  describe('non-TTY plain text', () => {
    const origIsTTY = process.stdout.isTTY;
    beforeEach(() => { Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true }); });
    afterEach(() => { Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, writable: true }); });

    it('status — formatStatusPlain 출력', async () => {
      await renderOutput('status', makeStatusData(), { json: false });
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('Foundry-X Status');
      expect(output).toContain('Mode:');
    });
  });
});
```

**테스트 수**: 5 (json 2 + short 3 + non-TTY 1, TTY branch는 View 테스트에서 간접 커버)

---

## 7. Watch 모드 아키텍처

### 7.1 개요

```
foundry-x status --watch [--interval <ms>]

┌─────────────────────────────────────────────┐
│  StatusWatchView (Ink Component)            │
│  ┌───────────────────────────────────────┐  │
│  │  Header: "Foundry-X Status (watching)"│  │
│  ├───────────────────────────────────────┤  │
│  │  StatusView (기존 컴포넌트 그대로 재사용) │  │
│  ├───────────────────────────────────────┤  │
│  │  ── Last: 14:32:05 ─ q to quit ──    │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 7.2 StatusWatchView.tsx

```typescript
// packages/cli/src/ui/views/StatusWatchView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { watch } from 'node:fs';
import { StatusView } from './StatusView.js';
import type { StatusData } from '../types.js';

interface StatusWatchViewProps {
  initialData: StatusData;
  cwd: string;
  refreshFn: (cwd: string) => Promise<StatusData>;
  interval?: number; // debounce ms, default 500
}

export const StatusWatchView: React.FC<StatusWatchViewProps> = ({
  initialData,
  cwd,
  refreshFn,
  interval = 500,
}) => {
  const { exit } = useApp();
  const [data, setData] = useState<StatusData>(initialData);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Debounced refresh
  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const newData = await refreshFn(cwd);
      setData(newData);
      setLastUpdate(new Date());
    } catch {
      // 에러 발생해도 이전 데이터 유지
    } finally {
      setRefreshing(false);
    }
  }, [cwd, refreshFn, refreshing]);

  // fs.watch로 파일 변경 감시
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout | null = null;

    const watcher = watch(cwd, { recursive: true }, (_event, filename) => {
      // .foundry-x/logs/ 등 자체 출력 파일은 무시
      if (filename && (filename.startsWith('.foundry-x/logs') || filename.includes('node_modules'))) {
        return;
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refresh();
      }, interval);
    });

    return () => {
      watcher.close();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [cwd, interval, refresh]);

  // q 키로 종료
  useInput((input) => {
    if (input === 'q') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <StatusView {...data} />
      <Box paddingLeft={2}>
        <Text dimColor>
          Last: {lastUpdate.toLocaleTimeString()} {refreshing ? '(refreshing...)' : ''}
          {' · '}Press q to quit
        </Text>
      </Box>
    </Box>
  );
};
```

**설계 포인트:**

| 결정 | 선택 | 근거 |
|------|------|------|
| 감시 방식 | `node:fs/watch` | 외부 dep 없음, recursive 지원 (Node 20+) |
| 리렌더 방식 | `useState` + `setData()` | React 모델, Ink 자동 리렌더 |
| Debounce | `setTimeout` (자체 구현) | lodash 불필요, 단순 시나리오 |
| 종료 | `useInput('q')` + `useApp().exit()` | Ink 표준 패턴 |
| 에러 처리 | 이전 데이터 유지 | watch 모드에서 일시적 에러로 화면이 깨지면 안 됨 |
| 무시 경로 | `.foundry-x/logs`, `node_modules` | 자체 출력과 dep 변경은 무시 |

### 7.3 status.ts 변경

```typescript
// status.ts — Commander 옵션 추가
interface StatusOptions {
  json: boolean;
  short: boolean;
  watch: boolean;       // NEW
  interval: string;     // NEW (string → parseInt)
}

cmd
  .option('--json', 'output as JSON', false)
  .option('--short', 'show compact output', false)
  .option('--watch', 'watch mode — auto-refresh on file changes', false)
  .option('--interval <ms>', 'debounce interval for watch mode', '500')
  .action(async (options: StatusOptions) => {
    // ... 기존 로직 ...

    if (options.watch) {
      // non-TTY에서는 watch 불가
      if (!process.stdout.isTTY) {
        console.error('Error: --watch requires a TTY terminal');
        process.exit(1);
      }

      const { render } = await import('ink');
      const React = await import('react');
      const { StatusWatchView } = await import('../ui/views/StatusWatchView.js');

      const { waitUntilExit } = render(
        React.createElement(StatusWatchView, {
          initialData: result,
          cwd,
          refreshFn: runStatus,
          interval: parseInt(options.interval, 10),
        }),
      );
      await waitUntilExit();
      return;
    }

    // 기존: renderOutput('status', result, options)
    await renderOutput('status', result, { json: options.json, short: options.short });
  });
```

### 7.4 render.tsx 변경 — 최소

render.tsx에 watch 관련 변경은 **불필요**. watch 모드는 `status.ts`에서 직접 Ink render를 호출하므로, `renderOutput()`의 4-branch 분기에 영향 없어요. 이것은 의도적인 설계예요 — watch는 status 커맨드에만 한정된 특수 모드이므로 범용 디스패처에 넣지 않아요.

---

## 8. Implementation Order

| # | 파일/작업 | F# | 의존성 | 예상 LOC | 테스트 수 |
|:-:|----------|:--:|:------:|:--------:|:--------:|
| 1 | `pnpm add -D ink-testing-library` | F22 | — | — | — |
| 2 | `vitest.config.ts` — `.test.tsx` 패턴 추가 | F22 | — | ~2 | — |
| 3 | `ui/__tests__/test-data.ts` — 테스트 데이터 팩토리 | F22 | — | ~80 | — |
| 4 | `Header.test.tsx` — 첫 번째 TSX 테스트로 파이프라인 검증 | F23 | #1-3 | ~25 | 3 |
| 5 | `StatusBadge.test.tsx` | F23 | #3 | ~40 | 5 |
| 6 | `HealthBar.test.tsx` | F23 | #3 | ~50 | 7 |
| 7 | `ProgressStep.test.tsx` | F23 | #3 | ~45 | 6 |
| 8 | `ErrorBox.test.tsx` | F23 | #3 | ~25 | 3 |
| 9 | `StatusView.test.tsx` | F24 | #3 | ~35 | 3 |
| 10 | `InitView.test.tsx` | F24 | #3 | ~30 | 2 |
| 11 | `SyncView.test.tsx` | F24 | #3 | ~30 | 2 |
| 12 | `render.test.tsx` — 4-branch 분기 테스트 | F24 | #3 | ~60 | 5 |
| 13 | `StatusWatchView.tsx` — watch 모드 뷰 | F25 | — | ~70 | — |
| 14 | `status.ts` — `--watch`, `--interval` 옵션 추가 | F25 | #13 | ~25 | — |
| 15 | 전체 테스트 실행 (기존 35 + 신규 36) | — | all | — | 71 total |
| 16 | typecheck + build + lint 검증 | — | all | — | — |
| 17 | v0.4.0 버전 범프 + CHANGELOG | — | #16 | — | — |

**예상 총 변경**: ~515 LOC 추가 (테스트 ~340 + 팩토리 ~80 + watch ~95), ~25 LOC 수정 (vitest.config, status.ts)
**신규 테스트**: 36건 (컴포넌트 24 + View 7 + render 5)
**총 테스트**: 71건 (기존 35 + 신규 36)

---

## 9. Test Coverage Matrix

| 컴포넌트 | 파일 | 테스트 수 | 커버 항목 |
|----------|------|:---------:|-----------|
| Header | Header.test.tsx | 3 | title만 / title+subtitle / subtitle 미전달 |
| StatusBadge | StatusBadge.test.tsx | 5 | PASS/WARN/FAIL level, message 유무 |
| HealthBar | HealthBar.test.tsx | 7 | 정상 점수, 0%, 100%, 50%, 음수 클램핑, 초과 클램핑, 기본 width |
| ProgressStep | ProgressStep.test.tsx | 6 | done/running/pending/error 상태, detail, 다중 단계 |
| ErrorBox | ErrorBox.test.tsx | 3 | title+message, code 유무 |
| StatusView | StatusView.test.tsx | 3 | 정상 데이터, Plumb 없음, integrity checks |
| InitView | InitView.test.tsx | 2 | 완료 상태, 진행 중 상태 |
| SyncView | SyncView.test.tsx | 2 | gap 있음/없음 |
| render.tsx | render.test.tsx | 5 | json 2 + short 3 + non-TTY 1 |
| **합계** | **9 파일** | **36** | |

---

## 10. Non-TTY / Edge Case Handling

### 10.1 Watch 모드 + non-TTY

```
$ foundry-x status --watch | cat
Error: --watch requires a TTY terminal
$ echo $?
1
```

- `process.stdout.isTTY`가 falsy면 에러 메시지 출력 후 exit(1)
- `--json`과 `--watch` 동시 지정 시: `--watch` 우선 (json은 단발 출력용)

### 10.2 Watch 모드 + 초기화 안 됨

- `runStatus()`가 `NotInitializedError`를 throw
- watch 모드 진입 전에 에러 발생하므로 기존 에러 핸들링으로 처리

### 10.3 Watch 모드 + Ctrl+C

- Ink의 기본 `SIGINT` 핸들링으로 정상 종료
- `useApp().exit()` + watcher.close()로 리소스 정리

---

## 11. Coding Convention (Sprint 4 추가)

### 11.1 테스트 파일 컨벤션

| Rule | Convention |
|------|-----------|
| 파일명 | `{Component}.test.tsx` (컴포넌트 옆 co-located) |
| describe | `describe('ComponentName', () => { ... })` |
| it 문 | 한국어 서술: `it('PASS level에서 초록 체크 아이콘을 렌더링한다', ...)` |
| 테스트 데이터 | `__tests__/test-data.ts`에서 `make*()` 팩토리 import |
| Mock | Ink 컴포넌트는 mock 금지 (실제 render), 외부 서비스만 mock |

### 11.2 Watch 모드 컨벤션

| Rule | Convention |
|------|-----------|
| 감시 경로 제외 | `.foundry-x/logs`, `node_modules`, `.git` |
| Debounce 기본값 | 500ms (Commander option으로 변경 가능) |
| 에러 시 | 이전 데이터 유지, 화면 깨지지 않도록 |

---

## 12. File Structure (최종)

```
packages/cli/
├── vitest.config.ts              # MODIFY
├── package.json                  # MODIFY (+ink-testing-library)
└── src/
    └── ui/
        ├── __tests__/
        │   └── test-data.ts      # NEW: 테스트 데이터 팩토리
        ├── components/
        │   ├── Header.tsx
        │   ├── Header.test.tsx         # NEW (3 tests)
        │   ├── StatusBadge.tsx
        │   ├── StatusBadge.test.tsx     # NEW (5 tests)
        │   ├── HealthBar.tsx
        │   ├── HealthBar.test.tsx       # NEW (7 tests)
        │   ├── ProgressStep.tsx
        │   ├── ProgressStep.test.tsx    # NEW (6 tests)
        │   ├── ErrorBox.tsx
        │   └── ErrorBox.test.tsx        # NEW (3 tests)
        ├── views/
        │   ├── StatusView.tsx
        │   ├── StatusView.test.tsx      # NEW (3 tests)
        │   ├── InitView.tsx
        │   ├── InitView.test.tsx        # NEW (2 tests)
        │   ├── SyncView.tsx
        │   ├── SyncView.test.tsx        # NEW (2 tests)
        │   └── StatusWatchView.tsx      # NEW (watch 모드)
        ├── render.tsx
        ├── render.test.tsx              # NEW (5 tests)
        └── types.ts

신규 파일: 12개 (테스트 9 + 팩토리 1 + StatusWatchView 1 + eslint ignore 패턴 1)
수정 파일: 3개 (vitest.config.ts, package.json, commands/status.ts)
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft — 테스트 상세 설계 + watch 아키텍처 | Sinclair Seo |
