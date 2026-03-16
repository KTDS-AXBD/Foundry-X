# foundry-x-cli Design Document

> **Summary**: CLI 3개 커맨드(init/sync/status) + PlumbBridge subprocess 래퍼의 상세 설계
>
> **Project**: Foundry-X
> **Version**: 0.1.0
> **Author**: AX BD팀
> **Date**: 2026-03-16
> **Status**: Draft
> **Planning Doc**: [foundry-x-cli.plan.md](../../01-plan/features/foundry-x-cli.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- PlumbBridge를 통한 Python subprocess 안정 통합 (timeout/에러/복구)
- 3개 커맨드의 명확한 입출력 계약 정의
- Phase 2 확장을 고려한 모듈 분리 (packages/cli ↔ packages/shared)
- 개발 흐름을 끊지 않는 UX (30초 이내 피드백)

### 1.2 Design Principles

- **Git이 진실**: 모든 데이터는 Git 리포에서 읽고, `.foundry-x/`는 캐시/메타만 저장
- **Fail-safe**: Plumb 실패 시 CLI가 행(hang)하지 않고 즉시 에러 출력 + 안내
- **최소 의존성**: Phase 1은 DB/서버 없이 로컬 Git + Plumb만으로 동작
- **측정 가능**: 모든 커맨드 실행이 로그에 기록되어 KPI 측정 가능

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────┐
│  foundry-x CLI (packages/cli)                       │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  init    │  │  sync    │  │  status  │          │
│  │ command  │  │ command  │  │ command  │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │                │
│       ▼              ▼              ▼                │
│  ┌──────────────────────────────────────┐           │
│  │          Core Services               │           │
│  │  ┌────────────┐  ┌───────────────┐  │           │
│  │  │ Template   │  │ PlumbBridge   │  │           │
│  │  │ Manager    │  │ (subprocess)  │  │           │
│  │  └────────────┘  └───────┬───────┘  │           │
│  │  ┌────────────┐  ┌───────┴───────┐  │           │
│  │  │ Config     │  │ Logger        │  │           │
│  │  │ Manager    │  │ (KPI 측정)    │  │           │
│  │  └────────────┘  └───────────────┘  │           │
│  └──────────────────────────────────────┘           │
│                      │                               │
│                      ▼                               │
│  ┌──────────────────────────────────────┐           │
│  │  packages/shared (공유 타입)          │           │
│  │  - HealthScore, SyncResult, etc.     │           │
│  └──────────────────────────────────────┘           │
└──────────────────────────┬──────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ Git Repo │  │ Plumb    │  │.foundry-x│
     │ (SSOT)   │  │ (Python) │  │ (local)  │
     └──────────┘  └──────────┘  └──────────┘
```

### 2.2 Data Flow

```
[init]    User → init command → TemplateManager.copy() → Git Repo (specs/, .plumb/)
                                                       → .foundry-x/config.json

[sync]    User → sync command → PlumbBridge.execute('review')
                              → Parse stdout JSON → SyncResult
                              → Logger.record() → .foundry-x/logs/

[status]  User → status command → PlumbBridge.execute('status')
                                → HealthScoreCalculator.compute()
                                → Ink TUI render → Terminal
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| init command | TemplateManager, ConfigManager | 하네스 스캐폴딩 + 초기 설정 |
| sync command | PlumbBridge, Logger | Plumb 호출 + 결과 로깅 |
| status command | PlumbBridge, HealthScoreCalculator | 상태 조회 + 점수 계산 |
| PlumbBridge | child_process (Node.js) | Python subprocess 실행 |
| TemplateManager | fs, path | 템플릿 파일 복사 |
| ConfigManager | fs | `.foundry-x/config.json` 읽기/쓰기 |
| Logger | fs | `.foundry-x/logs/` 실행 로그 기록 |

---

## 3. Data Model

### 3.1 Core Types (packages/shared)

```typescript
// packages/shared/src/types.ts

/** SDD Triangle 동기화 상태 */
interface SyncResult {
  success: boolean;
  timestamp: string;              // ISO 8601
  duration: number;               // ms
  triangle: {
    specToCode: SyncStatus;       // 명세 → 코드 일치도
    codeToTest: SyncStatus;       // 코드 → 테스트 커버리지
    specToTest: SyncStatus;       // 명세 → 테스트 추적성
  };
  decisions: Decision[];          // Plumb 추출 결정사항
  errors: PlumbError[];
}

interface SyncStatus {
  matched: number;                // 일치 항목 수
  total: number;                  // 전체 항목 수
  gaps: GapItem[];                // 불일치 목록
}

interface GapItem {
  type: 'spec_only' | 'code_only' | 'test_missing' | 'drift';
  path: string;                   // 파일 경로 또는 명세 항목 ID
  description: string;
}

interface Decision {
  id: string;
  source: 'agent' | 'human';
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  commit: string;                 // Git commit hash
}

/** Triangle Health Score (Gemini 권고) */
interface HealthScore {
  overall: number;                // 0~100
  specToCode: number;             // 0~100
  codeToTest: number;             // 0~100
  specToTest: number;             // 0~100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/** PlumbBridge 실행 결과 */
interface PlumbResult {
  success: boolean;
  exitCode: number;               // 0: success, 1: error, 2: partial
  stdout: string;
  stderr: string;
  duration: number;               // ms
  data?: unknown;                 // parsed JSON from stdout
}

/** CLI 실행 로그 (KPI 측정용) */
interface CommandLog {
  command: 'init' | 'sync' | 'status';
  timestamp: string;
  duration: number;
  success: boolean;
  args: Record<string, unknown>;
  plumbCalled: boolean;
  error?: string;
}

/** 프로젝트 메타데이터 */
interface FoundryXConfig {
  version: string;                // CLI 버전
  initialized: string;            // 초기화 일시
  template: string;               // 사용된 템플릿 이름
  plumb: {
    timeout: number;              // ms, default 30000
    pythonPath: string;           // default 'python'
  };
  git: {
    provider: 'github' | 'gitlab';
    remote?: string;
  };
}
```

### 3.2 로컬 메타데이터 구조

```
.foundry-x/
├── config.json          # FoundryXConfig
├── logs/
│   └── YYYY-MM-DD.jsonl # CommandLog (일별 JSONL)
└── cache/
    └── last-sync.json   # 마지막 SyncResult 캐시
```

> `.foundry-x/`는 `.gitignore`에 추가. Git에는 커밋하지 않음.

---

## 4. CLI Interface Specification

### 4.1 Command Overview

| Command | Arguments | Options | Description |
|---------|-----------|---------|-------------|
| `init` | — | `--template <name>`, `--force` | 하네스 스캐폴딩 |
| `sync` | — | `--json`, `--verbose` | SDD 동기화 검사 |
| `status` | — | `--json`, `--short` | Triangle 상태 표시 |

### 4.2 `foundry-x init`

**Flow:**
```
1. Git 리포 여부 확인 (not git repo → 에러)
2. .foundry-x/ 존재 여부 확인 (exists + !force → 에러)
3. 템플릿 선택 (--template 또는 대화형 선택)
4. TemplateManager.copy(templateName, targetDir)
   - templates/{name}/ → 현재 디렉토리로 복사
   - 기존 파일 충돌 시 skip + 경고
5. ConfigManager.init() → .foundry-x/config.json 생성
6. Plumb 설치 여부 확인
   - 미설치 → "pip install plumb-dev" 안내 (non-blocking)
7. 성공 메시지 + 다음 단계 안내
```

**Output (성공):**
```
✓ Foundry-X initialized with 'default' template

  Created:
    specs/             — 명세 디렉토리
    CLAUDE.md          — 에이전트 컨텍스트
    AGENTS.md          — 에이전트 규칙
    .plumb/config.json — SDD 엔진 설정

  Next steps:
    1. Write your first spec in specs/
    2. Run 'foundry-x sync' to check SDD Triangle
    3. Run 'foundry-x status' to view health score
```

**Error Cases:**
| Condition | Message | Exit Code |
|-----------|---------|-----------|
| Not a git repo | `Error: Not a git repository. Run 'git init' first.` | 1 |
| Already initialized | `Error: Already initialized. Use --force to reinitialize.` | 1 |
| Template not found | `Error: Template '{name}' not found. Available: default, kt-ds-sr` | 1 |

### 4.3 `foundry-x sync`

**Flow:**
```
1. .foundry-x/ 존재 확인 (없으면 → "Run 'foundry-x init' first")
2. PlumbBridge.execute('review', { cwd: process.cwd() })
3. Parse stdout → SyncResult
4. HealthScoreCalculator.compute(syncResult) → HealthScore
5. Logger.record({ command: 'sync', ... })
6. 결과 렌더링 (Ink TUI 또는 --json)
7. decisions[status='pending'] → 승인/거부 대화형 프롬프트 (optional)
```

**Output (TUI):**
```
SDD Triangle Sync Report
─────────────────────────────────────────
  Spec → Code   ████████░░  80% (4/5 matched)
  Code → Test   ██████░░░░  60% (3/5 covered)
  Spec → Test   ████████████ 100% (5/5 traced)
─────────────────────────────────────────
  Health Score: 80/100 (B)

  Gaps found: 2
    ⚠ specs/auth.md:L12 — no matching implementation
    ⚠ src/api/users.ts — no test coverage

  Pending decisions: 1
    → "Add rate limiting to /api/users" (agent, commit a1b2c3d)
      [approve] [reject] [skip]
```

**Output (`--json`):**
```json
{
  "healthScore": { "overall": 80, "grade": "B", ... },
  "triangle": { ... },
  "gaps": [ ... ],
  "decisions": [ ... ]
}
```

### 4.4 `foundry-x status`

**Flow:**
```
1. .foundry-x/ 존재 확인
2. .foundry-x/cache/last-sync.json 읽기 (캐시 있으면 사용)
3. 캐시 없거나 stale(>5분) → PlumbBridge.execute('status')
4. HealthScore 계산 + 렌더링
5. Logger.record()
```

**Output (TUI):**
```
Foundry-X Status
─────────────────────────────────────────
  Project: my-project
  Template: default
  Last sync: 2 minutes ago

  Triangle Health Score: 85/100 (B+)
  ┌──────────────────────────────────┐
  │  Spec ←──── 90% ────→ Code      │
  │    │                     │       │
  │   85%                   80%      │
  │    │                     │       │
  │    └──── Test ───────────┘       │
  └──────────────────────────────────┘

  Pending decisions: 0
  --no-verify bypasses: 2 (this week)
```

**Output (`--short`):**
```
Health: 85/100 (B+) | Gaps: 3 | Decisions: 0 | Last sync: 2m ago
```

---

## 5. PlumbBridge Design

### 5.1 Class Structure

```typescript
// packages/cli/src/plumb/bridge.ts

class PlumbBridge {
  private config: PlumbConfig;

  constructor(config?: Partial<PlumbConfig>) {
    this.config = {
      pythonPath: process.env.FOUNDRY_X_PYTHON_PATH || 'python',
      timeout: Number(process.env.FOUNDRY_X_PLUMB_TIMEOUT) || 30_000,
      cwd: process.cwd(),
      ...config,
    };
  }

  /** Plumb 설치 여부 확인 */
  async isAvailable(): Promise<boolean>;

  /** Plumb 커맨드 실행 */
  async execute(command: string, args?: string[]): Promise<PlumbResult>;

  /** sync 전용: review 실행 + SyncResult 파싱 */
  async review(): Promise<SyncResult>;

  /** status 전용: 현재 상태 조회 */
  async getStatus(): Promise<SyncResult>;
}
```

### 5.2 Subprocess 실행 계약

```typescript
// 내부 계약 (Sprint 1 문서화 대상)

interface PlumbConfig {
  pythonPath: string;     // default: 'python'
  timeout: number;        // default: 30000 (ms)
  cwd: string;            // default: process.cwd()
}

// 실행 방식
spawn(config.pythonPath, ['-m', 'plumb', command, ...args], {
  cwd: config.cwd,
  timeout: config.timeout,
  env: { ...process.env, PLUMB_OUTPUT_FORMAT: 'json' },
});

// Exit Code 계약
// 0 — 성공 (stdout: JSON)
// 1 — 에러 (stderr: 에러 메시지)
// 2 — 부분 성공 (stdout: JSON with warnings)
// 127 — Plumb 미설치
// SIGTERM — timeout 초과
```

### 5.3 Error Handling Chain

```
PlumbBridge.execute()
  ├── spawn 실패 (ENOENT)
  │     → PlumbNotInstalledError
  │     → "Plumb is not installed. Run: pip install plumb-dev"
  │
  ├── timeout (SIGTERM)
  │     → PlumbTimeoutError
  │     → "Plumb timed out after 30s. Try: FOUNDRY_X_PLUMB_TIMEOUT=60000"
  │
  ├── exit code 1
  │     → PlumbExecutionError(stderr)
  │     → stderr 내용 그대로 출력
  │
  ├── exit code 2 (partial)
  │     → 경고 표시 + 부분 결과 반환
  │
  └── stdout JSON 파싱 실패
        → PlumbOutputError
        → "Unexpected Plumb output. Check plumb version."
```

### 5.4 Error Class Hierarchy

```typescript
// packages/cli/src/plumb/errors.ts

abstract class FoundryXError extends Error {
  abstract code: string;
  abstract exitCode: number;
}

class PlumbNotInstalledError extends FoundryXError {
  code = 'PLUMB_NOT_INSTALLED';
  exitCode = 1;
}

class PlumbTimeoutError extends FoundryXError {
  code = 'PLUMB_TIMEOUT';
  exitCode = 1;
}

class PlumbExecutionError extends FoundryXError {
  code = 'PLUMB_EXECUTION_ERROR';
  exitCode = 1;
  constructor(public stderr: string) { ... }
}

class PlumbOutputError extends FoundryXError {
  code = 'PLUMB_OUTPUT_ERROR';
  exitCode = 1;
}

class NotInitializedError extends FoundryXError {
  code = 'NOT_INITIALIZED';
  exitCode = 1;
}

class NotGitRepoError extends FoundryXError {
  code = 'NOT_GIT_REPO';
  exitCode = 1;
}
```

---

## 6. Template System Design

### 6.1 Template Structure

```
templates/
├── default/
│   ├── _meta.json           # 템플릿 메타데이터
│   ├── CLAUDE.md             # 에이전트 컨텍스트 (프로젝트별 커스터마이징 가능)
│   ├── AGENTS.md             # 에이전트 행동 규칙
│   ├── CONSTITUTION.md       # 프로젝트 헌법 (변경 불가 규칙)
│   ├── specs/
│   │   └── .gitkeep
│   └── .plumb/
│       └── config.json       # Plumb 엔진 설정
│
└── kt-ds-sr/
    ├── _meta.json
    ├── CLAUDE.md             # KT DS SM 운영 맞춤
    ├── AGENTS.md
    ├── specs/
    │   └── sr-template.md    # SR 처리 명세 템플릿
    └── .plumb/
        └── config.json       # SR 특화 Plumb 설정
```

### 6.2 `_meta.json` 스키마

```json
{
  "name": "default",
  "description": "Standard harness for general-purpose projects",
  "version": "1.0.0",
  "files": ["CLAUDE.md", "AGENTS.md", "CONSTITUTION.md", "specs/", ".plumb/"],
  "requiredPython": ">=3.10",
  "requiredPlumb": ">=0.1.0"
}
```

### 6.3 TemplateManager

```typescript
class TemplateManager {
  /** 사용 가능한 템플릿 목록 */
  listTemplates(): TemplateMeta[];

  /** 템플릿을 대상 디렉토리에 복사 */
  async copy(templateName: string, targetDir: string, options?: {
    force?: boolean;     // 기존 파일 덮어쓰기
    skip?: string[];     // 건너뛸 파일 목록
  }): Promise<CopyResult>;
}

interface CopyResult {
  created: string[];     // 새로 생성된 파일
  skipped: string[];     // 이미 존재하여 건너뛴 파일
  overwritten: string[]; // --force로 덮어쓴 파일
}
```

---

## 7. Logging & KPI Measurement

### 7.1 Log Format (JSONL)

```jsonl
{"command":"init","timestamp":"2026-03-16T09:00:00Z","duration":1200,"success":true,"args":{"template":"default"},"plumbCalled":false}
{"command":"sync","timestamp":"2026-03-16T09:05:00Z","duration":8500,"success":true,"args":{},"plumbCalled":true,"healthScore":85}
{"command":"status","timestamp":"2026-03-16T09:10:00Z","duration":2100,"success":true,"args":{"short":true},"plumbCalled":false}
```

### 7.2 KPI 측정 매핑

| KPI | 측정 소스 | 계산 방법 |
|-----|----------|----------|
| K1: CLI 주간 호출/사용자 | `.foundry-x/logs/*.jsonl` | 주간 로그 라인 수 |
| K2: `--no-verify` 비율 | Git hook 로그 (별도 hook 구현 필요) | 우회 수 / 전체 커밋 수 |
| K3: sync 후 수동 수정 | `sync` 결과 → 다음 `sync` 결과 비교 | gap 감소 추세 |
| K4: 결정 승인율 | `decisions.jsonl` (Plumb 생성) | approved / total |

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Coverage |
|------|--------|------|----------|
| Unit Test | PlumbBridge, TemplateManager, ConfigManager, Logger | Vitest | ≥ 80% |
| Integration Test | CLI 커맨드 e2e (init→sync→status 시나리오) | Vitest + execa | 주요 경로 |
| Mock Test | PlumbBridge (Plumb 미설치 환경) | Vitest mock | subprocess 에러 시나리오 |

### 8.2 Test Cases (Key)

**PlumbBridge:**
- [ ] Happy path: `execute('review')` → exit 0 → JSON 파싱 성공
- [ ] Timeout: 30초 초과 → PlumbTimeoutError
- [ ] Not installed: spawn ENOENT → PlumbNotInstalledError
- [ ] Partial success: exit 2 → 경고 + 부분 결과
- [ ] Invalid JSON output: → PlumbOutputError

**init command:**
- [ ] Happy path: Git 리포에서 init → 파일 생성 확인
- [ ] Not git repo: → NotGitRepoError
- [ ] Already initialized: → 에러 (without --force)
- [ ] `--force`: 기존 .foundry-x/ 재생성
- [ ] `--template kt-ds-sr`: SR 템플릿 파일 확인

**sync command:**
- [ ] Happy path: PlumbBridge 호출 → SyncResult → TUI 렌더링
- [ ] Not initialized: → NotInitializedError
- [ ] `--json` flag: JSON 출력
- [ ] Plumb 실패: graceful 에러 메시지

**status command:**
- [ ] Happy path: 캐시 있음 → 즉시 표시
- [ ] 캐시 stale: → PlumbBridge 재호출
- [ ] `--short` flag: 한 줄 출력

---

## 9. Module Structure

### 9.1 Layer Assignment

| Module | Layer | Location | Responsibility |
|--------|-------|----------|----------------|
| commands/init.ts | Presentation | `packages/cli/src/commands/` | CLI 인터페이스 + Ink 렌더링 |
| commands/sync.ts | Presentation | `packages/cli/src/commands/` | CLI 인터페이스 + Ink 렌더링 |
| commands/status.ts | Presentation | `packages/cli/src/commands/` | CLI 인터페이스 + Ink 렌더링 |
| plumb/bridge.ts | Infrastructure | `packages/cli/src/plumb/` | Python subprocess 실행 |
| plumb/errors.ts | Domain | `packages/cli/src/plumb/` | 에러 타입 정의 |
| services/template-manager.ts | Application | `packages/cli/src/services/` | 템플릿 복사 로직 |
| services/config-manager.ts | Application | `packages/cli/src/services/` | 설정 읽기/쓰기 |
| services/health-score.ts | Application | `packages/cli/src/services/` | Triangle Health Score 계산 |
| services/logger.ts | Infrastructure | `packages/cli/src/services/` | 실행 로그 기록 |
| types.ts | Domain | `packages/shared/src/` | 공유 타입 정의 |

### 9.2 File Structure

```
packages/cli/
├── src/
│   ├── index.ts                  # Commander 프로그램 정의
│   ├── commands/
│   │   ├── init.ts               # FR-01, FR-02
│   │   ├── sync.ts               # FR-03
│   │   └── status.ts             # FR-04
│   ├── plumb/
│   │   ├── bridge.ts             # FR-05
│   │   └── errors.ts             # 에러 클래스 계층
│   ├── services/
│   │   ├── template-manager.ts   # 템플릿 복사
│   │   ├── config-manager.ts     # FR-06
│   │   ├── health-score.ts       # Triangle Health Score
│   │   └── logger.ts             # FR-07, FR-08
│   └── ui/
│       ├── sync-report.tsx       # Ink TUI: sync 결과
│       └── status-display.tsx    # Ink TUI: status 대시보드
├── package.json
├── tsconfig.json
└── vitest.config.ts

packages/shared/
├── src/
│   └── types.ts                  # SyncResult, HealthScore, etc.
└── package.json
```

---

## 10. Coding Convention

### 10.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| Files (module) | kebab-case.ts | `plumb-bridge.ts`, `template-manager.ts` |
| Files (command) | kebab-case.ts | `init.ts`, `sync.ts` |
| Files (UI component) | kebab-case.tsx | `sync-report.tsx` |
| Classes | PascalCase | `PlumbBridge`, `TemplateManager` |
| Functions | camelCase | `computeHealthScore()`, `parseOutput()` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT`, `MAX_RETRY` |
| Types/Interfaces | PascalCase | `SyncResult`, `HealthScore` |

### 10.2 Import Order

```typescript
// 1. Node.js builtins
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';

// 2. External packages
import { Command } from 'commander';
import { render } from 'ink';

// 3. Internal packages
import type { SyncResult } from '@foundry-x/shared';

// 4. Relative imports
import { PlumbBridge } from '../plumb/bridge.js';

// 5. Type-only imports
import type { PlumbConfig } from '../plumb/types.js';
```

---

## 11. Implementation Order

### Phase 1 — Sprint 1 (Week 1~2): 기반

1. [ ] 모노리포 scaffolding (`pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`)
2. [ ] `packages/shared/src/types.ts` — 공유 타입 정의
3. [ ] `packages/cli/src/plumb/errors.ts` — 에러 클래스 계층
4. [ ] `packages/cli/src/plumb/bridge.ts` — PlumbBridge 구현
5. [ ] PlumbBridge 단위 테스트 (mock subprocess)
6. [ ] `packages/cli/src/services/config-manager.ts`
7. [ ] `packages/cli/src/services/logger.ts`
8. [ ] `packages/cli/src/index.ts` — Commander 프로그램 뼈대

### Phase 2 — Sprint 2 (Week 3~4): 커맨드 + 배포

9. [ ] `packages/cli/src/services/template-manager.ts`
10. [ ] `packages/cli/src/commands/init.ts` + 템플릿 2종
11. [ ] `packages/cli/src/services/health-score.ts`
12. [ ] `packages/cli/src/commands/sync.ts` + `ui/sync-report.tsx`
13. [ ] `packages/cli/src/commands/status.ts` + `ui/status-display.tsx`
14. [ ] Integration test (init → sync → status 시나리오)
15. [ ] npm publish 설정 + `npx foundry-x` 검증
16. [ ] 사용자 가이드 + 5명 온보딩

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft (Plan document 기반 상세 설계) | AX BD팀 |
