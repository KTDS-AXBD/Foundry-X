---
code: FX-DSGN-001
title: Foundry-X CLI MVP Design
version: 2.0
status: Draft
category: DSGN
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# foundry-x-cli Design Document

> **Summary**: CLI 3개 커맨드(init/sync/status) + Harness Pipeline(4단계) + PlumbBridge subprocess 래퍼의 상세 설계 (PRD v4 반영)
>
> **Project**: Foundry-X
> **Version**: 0.1.0
> **Author**: AX BD팀
> **Date**: 2026-03-16
> **Status**: Draft
> **Planning Doc**: [foundry-x-cli.plan.md](../../01-plan/features/foundry-x-cli.plan.md) (v2.0)

---

## 1. Overview

### 1.1 Design Goals

- **Harness Pipeline**: Brownfield/Greenfield 자동 감지 + 4단계 파이프라인으로 맞춤 하네스 구축 (v4 핵심)
- **PlumbBridge**: Python subprocess 안정 통합 (timeout/에러/복구)
- **멱등성**: `init` 재실행 시 기존 파일 보존, 신규 섹션만 merge
- **Phase 2 확장**: packages/cli ↔ packages/shared 모듈 분리
- **개발 흐름 UX**: init < 60초, sync < 30초, status < 5초

### 1.2 Design Principles

- **Git이 진실**: 모든 데이터는 Git 리포에서 읽고, `.foundry-x/`는 캐시/메타만 저장
- **Fail-safe**: 모든 외부 의존(Plumb, 파일시스템) 실패 시 graceful fallback
- **멱등 우선**: `init`은 몇 번을 실행해도 기존 커스터마이징을 절대 파괴하지 않음
- **측정 가능**: 모든 커맨드 실행이 로그에 기록되어 KPI 측정 가능
- **Semantic Linting**: 린터 메시지 = 에이전트 교육 채널 (어떻게 고치나를 포함)

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  foundry-x CLI (packages/cli)                           │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  init    │  │  sync    │  │  status  │              │
│  │ command  │  │ command  │  │ command  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       ▼              ▼              ▼                    │
│  ┌────────────────────────────────────────────────┐     │
│  │              Core Services                      │     │
│  │                                                  │     │
│  │  ┌─────────────────────────┐  ┌──────────────┐ │     │
│  │  │  Harness Pipeline       │  │ PlumbBridge  │ │     │
│  │  │  ┌────────┐ ┌────────┐ │  │ (subprocess) │ │     │
│  │  │  │detect  │→│discover│ │  └──────┬───────┘ │     │
│  │  │  └────────┘ └───┬────┘ │         │         │     │
│  │  │  ┌────────┐ ┌───▼────┐ │  ┌──────┴───────┐ │     │
│  │  │  │verify  │←│generate│ │  │ Logger       │ │     │
│  │  │  └────────┘ └───┬────┘ │  │ (KPI 측정)   │ │     │
│  │  │              ┌───▼────┐ │  └──────────────┘ │     │
│  │  │              │analyze │ │  ┌──────────────┐ │     │
│  │  │              └────────┘ │  │ ConfigManager│ │     │
│  │  └─────────────────────────┘  └──────────────┘ │     │
│  └────────────────────────────────────────────────┘     │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │  packages/shared (공유 타입)                       │   │
│  │  RepoProfile, SyncResult, HealthScore, etc.       │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Git Repo │ │ Plumb    │ │.foundry-x│
   │ (SSOT)   │ │ (Python) │ │ (local)  │
   └──────────┘ └──────────┘ └──────────┘
```

### 2.2 Data Flow

```
[init]
  User → init command
       → detect.ts: Brownfield or Greenfield?
       → discover.ts: 스택 스캔 → RepoProfile
       → analyze.ts: 아키텍처 분석 → RepoProfile 확장
       → generate.ts: 산출물 생성 (merge, 멱등)
       → verify.ts: 무결성 검증
       → .foundry-x/config.json 생성
       → Logger.record()

[sync]
  User → sync command
       → PlumbBridge.execute('review')
       → Parse stdout → SyncResult
       → HealthScoreCalculator.compute()
       → progress.md 업데이트
       → Logger.record()

[status]
  User → status command
       → PlumbBridge.execute('status') (또는 캐시)
       → HealthScore 계산
       → verify-harness 실행 → HarnessIntegrity
       → Ink TUI render
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| init command | Harness Pipeline, ConfigManager | 하네스 구축 |
| sync command | PlumbBridge, Logger | Plumb 호출 + progress.md |
| status command | PlumbBridge, HarnessVerifier | 상태 + 무결성 |
| Harness Pipeline | fs, path, RepoProfile | 4단계 파이프라인 |
| PlumbBridge | child_process | Python subprocess |
| HarnessVerifier | fs, path | verify-harness.sh 래퍼 |

---

## 3. Data Model

### 3.1 Core Types (packages/shared)

```typescript
// packages/shared/src/types.ts

// ─── Harness Pipeline Types (v4 신규) ───

/** 리포지토리 유형 */
type RepoMode = 'brownfield' | 'greenfield';

/** 프로젝트 마커 감지 결과 */
interface RepoProfile {
  mode: RepoMode;
  // Phase 0: discover
  languages: string[];           // ['typescript', 'python']
  frameworks: string[];          // ['react', 'express']
  buildTools: string[];          // ['pnpm', 'turbo']
  testFrameworks: string[];      // ['vitest', 'pytest']
  ci: string | null;             // 'github-actions' | 'gitlab-ci' | null
  packageManager: string | null; // 'pnpm' | 'npm' | 'yarn' | 'pip' | null
  markers: MarkerFile[];         // 감지된 프로젝트 마커 파일
  // Phase 1: analyze
  entryPoints: string[];         // ['src/index.ts', 'main.py']
  modules: ModuleInfo[];         // 주요 모듈/패키지 정보
  architecturePattern: string;   // 'monorepo' | 'single-package' | 'unknown'
}

interface MarkerFile {
  path: string;                  // 'package.json'
  type: 'node' | 'python' | 'go' | 'java' | 'unknown';
}

interface ModuleInfo {
  name: string;
  path: string;
  role: string;                  // 'cli', 'api', 'shared', 'unknown'
}

/** 산출물 생성 결과 */
interface GenerateResult {
  created: string[];             // 새로 생성된 파일
  merged: string[];              // 기존 파일에 merge된 파일
  skipped: string[];             // 이미 존재하여 건너뛴 파일
}

/** 하네스 무결성 검증 결과 */
interface HarnessIntegrity {
  passed: boolean;
  score: number;                 // 0~100 (KPI K6 기준 >95)
  checks: IntegrityCheck[];
}

interface IntegrityCheck {
  name: string;                  // 'claude-md-exists', 'constitution-3tier', etc.
  passed: boolean;
  message?: string;
}

// ─── SDD Triangle Types (v3 유지) ───

interface SyncResult {
  success: boolean;
  timestamp: string;
  duration: number;              // ms
  triangle: {
    specToCode: SyncStatus;
    codeToTest: SyncStatus;
    specToTest: SyncStatus;
  };
  decisions: Decision[];
  errors: PlumbError[];
}

interface SyncStatus {
  matched: number;
  total: number;
  gaps: GapItem[];
}

interface GapItem {
  type: 'spec_only' | 'code_only' | 'test_missing' | 'drift';
  path: string;
  description: string;
}

interface Decision {
  id: string;
  source: 'agent' | 'human';
  summary: string;
  status: 'pending' | 'approved' | 'rejected';
  commit: string;
}

interface HealthScore {
  overall: number;               // 0~100
  specToCode: number;
  codeToTest: number;
  specToTest: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

// ─── PlumbBridge Types (v3 유지) ───

interface PlumbResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  data?: unknown;
}

// ─── Config & Logging (v3 유지 + v4 확장) ───

interface CommandLog {
  command: 'init' | 'sync' | 'status';
  timestamp: string;
  duration: number;
  success: boolean;
  args: Record<string, unknown>;
  plumbCalled: boolean;
  harnessIntegrity?: number;     // v4: status에서 하네스 무결성 점수
  error?: string;
}

interface FoundryXConfig {
  version: string;
  initialized: string;
  template: string;
  mode: RepoMode;                // v4: Brownfield/Greenfield
  repoProfile: RepoProfile;     // v4: 감지된 리포 프로필
  plumb: {
    timeout: number;
    pythonPath: string;
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
├── config.json          # FoundryXConfig (v4: repoProfile 포함)
├── logs/
│   └── YYYY-MM-DD.jsonl # CommandLog (일별 JSONL)
└── cache/
    └── last-sync.json   # 마지막 SyncResult 캐시
```

---

## 4. Harness Pipeline Design (v4 핵심)

### 4.1 Pipeline Overview

```
foundry-x init [--mode brownfield|greenfield] [--template name]
    │
    ▼
┌─ detect.ts ─────────────────────────────────────────┐
│  Input:  cwd, --mode flag                            │
│  Logic:  프로젝트 마커 파일 스캔 (5종 MVP)           │
│          package.json, go.mod, pom.xml,              │
│          Pipfile, Cargo.toml                          │
│  Output: RepoMode ('brownfield' | 'greenfield')      │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌─ discover.ts ───────────────────────────────────────┐
│  Input:  cwd, RepoMode                              │
│  Logic:                                              │
│    [Brownfield] 파일시스템 스캔                       │
│      - package.json → languages, frameworks,         │
│        dependencies, scripts 파싱                     │
│      - go.mod / Pipfile / pom.xml → 동일             │
│      - .github/workflows/ or .gitlab-ci.yml → CI     │
│      - jest.config / vitest.config / pytest.ini      │
│    [Greenfield] 인터랙티브 질문                       │
│      - "어떤 언어?" → "어떤 프레임워크?" → 스택 확정  │
│  Output: RepoProfile (phase 0 필드 채움)             │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌─ analyze.ts ────────────────────────────────────────┐
│  Input:  RepoProfile (phase 0)                       │
│  Logic:                                              │
│    - 디렉토리 구조 스캔 → entryPoints 감지            │
│    - src/, packages/, app/ 패턴 → modules 추출       │
│    - monorepo 감지 (pnpm-workspace, lerna, turbo)    │
│    - architecturePattern 결정                        │
│  Output: RepoProfile (phase 1 필드 추가)             │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌─ generate.ts ───────────────────────────────────────┐
│  Input:  RepoProfile (완성), template name           │
│  Logic:                                              │
│    1. 템플릿 파일 로드 (templates/{name}/)            │
│    2. RepoProfile 기반 변수 치환                      │
│    3. 기존 파일 존재 여부 확인                         │
│       - 없으면: 생성                                  │
│       - 있으면: 섹션 단위 merge (기존 보존)           │
│    4. lint 템플릿: 스택에 맞는 설정 선택              │
│    5. progress.md 초기 생성                           │
│  Output: GenerateResult { created, merged, skipped } │
│                                                      │
│  ★ 멱등성 보장:                                      │
│    - Markdown 파일: ## 헤딩 기준으로 섹션 단위 비교   │
│    - JSON 파일: deep merge (기존 키 보존)             │
│    - 기타 파일: 존재하면 skip                         │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌─ verify.ts ─────────────────────────────────────────┐
│  Input:  GenerateResult, cwd                         │
│  Logic:                                              │
│    1. 필수 파일 존재 확인                             │
│       (CLAUDE.md, AGENTS.md, ARCHITECTURE.md,        │
│        CONSTITUTION.md, .plumb/config.json)           │
│    2. CONSTITUTION.md 3계층 구조 파싱 검증            │
│       (Always / Ask / Never 섹션 존재?)               │
│    3. CLAUDE.md ↔ AGENTS.md 섹션 구조 일치 검사      │
│    4. JSON 파일 파싱 검증 (.plumb/config.json)       │
│    5. Harness Evolution Rules 섹션 존재 확인          │
│  Output: HarnessIntegrity { passed, score, checks }  │
└──────────────────────────────────────────────────────┘
```

### 4.2 Merge Strategy (멱등성 핵심)

```typescript
// generate.ts 내부 merge 전략

async function mergeMarkdown(
  existing: string,
  template: string
): Promise<string> {
  // 1. 기존 파일을 ## 헤딩 기준으로 섹션 분리
  const existingSections = parseSections(existing);
  const templateSections = parseSections(template);

  // 2. 기존에 없는 섹션만 추가
  for (const [heading, content] of templateSections) {
    if (!existingSections.has(heading)) {
      existingSections.set(heading, content);  // 신규 섹션 추가
    }
    // 기존에 있으면 → 건드리지 않음 (사용자 커스터마이징 보존)
  }

  // 3. 원래 순서 유지 + 신규 섹션은 끝에 추가
  return reconstructMarkdown(existingSections);
}

async function mergeJson(
  existing: Record<string, unknown>,
  template: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // deep merge: 기존 키 보존, 신규 키만 추가
  return deepMerge(existing, template, { overwrite: false });
}
```

---

## 5. CLI Interface Specification

### 5.1 `foundry-x init`

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `--mode <mode>` | `brownfield` or `greenfield` | auto-detect |
| `--template <name>` | 템플릿 선택 | `default` |
| `--force` | 기존 .foundry-x/ 재초기화 | false |

**Flow:** §4.1 참조 (detect→discover→analyze→generate→verify)

**Output (Brownfield 성공):**
```
✓ Foundry-X initialized (brownfield mode)

  Detected:
    Language: TypeScript, Python
    Framework: React, Express
    Build: pnpm + Turborepo
    Architecture: monorepo (3 packages)

  Created:
    ARCHITECTURE.md    — 에이전트용 레이어 맵
    CONSTITUTION.md    — Always/Ask/Never 행동 경계
    progress.md        — 에이전트 세션 지속성

  Merged:
    CLAUDE.md          — Harness Evolution Rules 섹션 추가

  Skipped:
    AGENTS.md          — 이미 존재 (커스터마이징 보존)

  Harness integrity: 95/100 ✓

  Next: foundry-x sync
```

**Output (Greenfield 성공):**
```
✓ Foundry-X initialized (greenfield mode)

  Stack: TypeScript + React + Vitest

  Created:
    CLAUDE.md, AGENTS.md, ARCHITECTURE.md,
    CONSTITUTION.md, progress.md, specs/, .plumb/

  Harness integrity: 100/100 ✓

  Next: Write your first spec in specs/
```

**Error Cases:**
| Condition | Message | Exit Code |
|-----------|---------|-----------|
| Not a git repo | `Error: Not a git repository. Run 'git init' first.` | 1 |
| Already initialized (without --force) | `Error: Already initialized. Use --force to reinitialize.` | 1 |
| Template not found | `Error: Template '{name}' not found. Available: default, kt-ds-sr` | 1 |

### 5.2 `foundry-x sync`

v3 Design 유지 + **progress.md 업데이트 추가**.

**Flow:**
```
1. .foundry-x/ 존재 확인
2. PlumbBridge.execute('review')
3. Parse stdout → SyncResult
4. HealthScoreCalculator.compute()
5. progress.md "최근 결정사항" 자동 업데이트
6. Logger.record()
7. 결과 렌더링 (Ink TUI 또는 --json)
```

**TUI Output:** v3 Design 동일 (HealthScore 바 차트 + gaps + decisions)

### 5.3 `foundry-x status`

v3 Design + **하네스 무결성 표시 추가**.

**Flow:**
```
1. .foundry-x/ 존재 확인
2. 캐시/PlumbBridge → HealthScore
3. HarnessVerifier.verify() → HarnessIntegrity
4. Ink TUI render (Triangle + Harness 섹션)
```

**TUI Output:**
```
Foundry-X Status
─────────────────────────────────────────
  Project: my-project (brownfield)
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

  Harness Integrity: 95/100 ✓         ← v4 신규
    ✓ CLAUDE.md exists
    ✓ ARCHITECTURE.md exists
    ✓ CONSTITUTION.md 3-tier valid
    ✓ CLAUDE.md ↔ AGENTS.md sync
    ⚠ progress.md not updated (3 days)

  Pending decisions: 0
  --no-verify bypasses: 2 (this week)
```

---

## 6. PlumbBridge Design

v3 Design 전체 유지. 변경 없음.

- Class: `PlumbBridge` (execute, review, getStatus, isAvailable)
- Subprocess 계약: timeout 30s, exit code 0/1/2/127, SIGTERM
- Error hierarchy: `FoundryXError` → PlumbNotInstalled/Timeout/Execution/Output Error
- Config: `.foundry-x/config.json`의 `plumb.timeout`, `plumb.pythonPath`

---

## 7. Template System Design (v4 확장)

### 7.1 Template Structure

```
templates/
├── default/
│   ├── _meta.json
│   ├── CLAUDE.md               # Harness Evolution Rules 내장
│   ├── AGENTS.md               # CLAUDE.md와 섹션 구조 동기화
│   ├── ARCHITECTURE.md         # ★ v4 신규: 에이전트용 레이어 맵
│   ├── CONSTITUTION.md         # ★ v4 강화: Always/Ask/Never 3계층
│   ├── progress.md             # ★ v4 신규: 에이전트 세션 지속성
│   ├── specs/
│   │   └── .gitkeep
│   └── .plumb/
│       └── config.json
├── lint/                       # ★ v4 신규: 스택별 lint 설정
│   ├── eslint.config.ts.tmpl
│   ├── .ruff.toml.tmpl
│   └── golangci-lint.yml.tmpl
└── kt-ds-sr/
    ├── _meta.json
    ├── CLAUDE.md
    ├── CONSTITUTION.md         # SR 특화 Always/Ask/Never
    └── specs/
        └── sr-template.md
```

### 7.2 CONSTITUTION.md 3계층 구조 (v4 핵심)

```markdown
# CONSTITUTION.md — 에이전트 행동 경계

## Always (항상 해도 됨)
- specs/ 파일 읽기
- 테스트 실행 (read-only)
- lint 실행
- feature branch 생성
- progress.md 업데이트
- ADR 초안 작성 (commit 전 human 확인 필요)

## Ask (반드시 확인 후 실행)
- 외부 API 호출 (부작용 있는 것)
- 의존성 추가 (package.json 등 수정)
- 스키마 변경
- PR merge 또는 main 브랜치 직접 수정
- 새 환경 변수 추가
- 기존 테스트 삭제 또는 skip 처리

## Never (절대 금지)
- main 브랜치 직접 push
- --no-verify 플래그 사용
- 인증 정보 Git commit
- DB 직접 수정 (마이그레이션 외)
- 다른 에이전트의 작업 브랜치에 직접 push
```

### 7.3 ARCHITECTURE.md 구조 (v4 신규)

```markdown
# ARCHITECTURE.md

## 레이어 구조
[RepoProfile.modules 기반 자동 생성 다이어그램]

## 모듈 맵
| 모듈 | 경로 | 역할 | 진입점 |
[RepoProfile.modules + entryPoints 기반 자동 생성]

## 의존성 규칙
[generate.ts가 RepoProfile.architecturePattern 기반 생성]

## 금지 패턴
[템플릿 기본값 + 스택별 커스텀]
```

---

## 8. Verification Scripts (v4 신규)

### 8.1 `scripts/verify-harness.sh`

```bash
#!/bin/bash
# 하네스 무결성 검증 — foundry-x status에서 호출

SCORE=100
CHECKS=()

# 1. 필수 파일 존재
for f in CLAUDE.md AGENTS.md ARCHITECTURE.md CONSTITUTION.md .plumb/config.json; do
  if [ ! -f "$f" ]; then
    SCORE=$((SCORE - 15))
    CHECKS+=("FAIL: $f not found")
  else
    CHECKS+=("PASS: $f exists")
  fi
done

# 2. CONSTITUTION.md 3계층 구조
if [ -f CONSTITUTION.md ]; then
  for tier in "## Always" "## Ask" "## Never"; do
    grep -q "$tier" CONSTITUTION.md || {
      SCORE=$((SCORE - 10))
      CHECKS+=("FAIL: CONSTITUTION.md missing '$tier' section")
    }
  done
fi

# 3. Harness Evolution Rules
for f in CLAUDE.md AGENTS.md ARCHITECTURE.md; do
  if [ -f "$f" ] && ! grep -q "갱신 규칙\|Evolution Rules" "$f"; then
    SCORE=$((SCORE - 5))
    CHECKS+=("WARN: $f missing Evolution Rules section")
  fi
done

# 4. progress.md 존재
[ ! -f progress.md ] && SCORE=$((SCORE - 5)) && CHECKS+=("WARN: progress.md not found")

echo "{\"score\":$SCORE,\"checks\":[$(printf '"%s",' "${CHECKS[@]}" | sed 's/,$//')]}"
```

### 8.2 `scripts/check-sync.sh`

```bash
#!/bin/bash
# CLAUDE.md ↔ AGENTS.md 섹션 구조 일치 검사

CLAUDE_SECTIONS=$(grep '^## ' CLAUDE.md 2>/dev/null | sort)
AGENTS_SECTIONS=$(grep '^## ' AGENTS.md 2>/dev/null | sort)

if [ "$CLAUDE_SECTIONS" = "$AGENTS_SECTIONS" ]; then
  echo '{"synced":true}'
else
  echo '{"synced":false,"claude_only":[],"agents_only":[]}'
fi
```

---

## 9. Test Plan

### 9.1 Test Scope

| Type | Target | Tool | Coverage |
|------|--------|------|----------|
| Unit | Harness Pipeline (detect, discover, analyze, generate, verify) | Vitest | ≥ 80% |
| Unit | PlumbBridge, ConfigManager, Logger | Vitest | ≥ 80% |
| Integration | init → sync → status e2e | Vitest + execa | 주요 경로 |
| Integration | init 멱등성 (2회 실행) | Vitest | 필수 |
| Mock | PlumbBridge (Plumb 미설치 환경) | Vitest mock | subprocess 에러 |

### 9.2 Test Cases (Key)

**Harness Pipeline:**
- [ ] detect: package.json 있음 → brownfield
- [ ] detect: 빈 디렉토리 → greenfield
- [ ] detect: --mode flag 우선
- [ ] discover (brownfield): package.json 파싱 → RepoProfile
- [ ] discover (greenfield): 인터랙티브 질문 → RepoProfile
- [ ] analyze: monorepo 감지 (pnpm-workspace.yaml 존재)
- [ ] generate: 신규 리포 → 모든 파일 created
- [ ] generate: 기존 CLAUDE.md 있음 → merge (기존 내용 보존 + 신규 섹션 추가)
- [ ] generate: 2회 실행 → merged 0건 (이미 merge됨, 멱등성)
- [ ] verify: 모든 파일 존재 → score 100
- [ ] verify: CONSTITUTION.md에 Ask 섹션 누락 → score 감점

**PlumbBridge:** v3 Design 동일 (5개 케이스)

**init command:**
- [ ] Brownfield happy path: git repo + package.json → 하네스 생성 + integrity 표시
- [ ] Greenfield happy path: 빈 git repo → 인터랙티브 → scaffolding
- [ ] 멱등성: 2회 init → 기존 커스터마이징 보존
- [ ] --force: .foundry-x/ 재생성
- [ ] Not git repo → NotGitRepoError

**sync/status:** v3 Design 동일 + progress.md 업데이트 검증, 하네스 무결성 표시 검증

---

## 10. Module Structure

### 10.1 File Structure

```
packages/cli/
├── src/
│   ├── index.ts                      # Commander 프로그램 정의
│   ├── commands/
│   │   ├── init.ts                   # FR-01~09: harness pipeline 통합
│   │   ├── sync.ts                   # FR-10~11: Plumb + progress.md
│   │   └── status.ts                 # FR-12~13: HealthScore + integrity
│   ├── harness/                      # ★ v4 신규
│   │   ├── detect.ts                 # Brownfield/Greenfield 감지
│   │   ├── discover.ts               # Phase 0: 스택 스캔
│   │   ├── analyze.ts                # Phase 1: 아키텍처 분석
│   │   ├── generate.ts               # Phase 2: 산출물 생성 (merge)
│   │   ├── verify.ts                 # Phase 3: 무결성 검증
│   │   └── merge-utils.ts            # Markdown/JSON merge 유틸
│   ├── plumb/
│   │   ├── bridge.ts                 # FR-14: subprocess 래퍼
│   │   └── errors.ts                 # 에러 클래스 계층
│   ├── services/
│   │   ├── config-manager.ts         # FR-18: .foundry-x/ 관리
│   │   ├── health-score.ts           # Triangle Health Score 계산
│   │   ├── harness-verifier.ts       # FR-15: verify-harness 래퍼
│   │   └── logger.ts                 # FR-19~20: 실행 로그 + KPI
│   └── ui/
│       ├── init-report.tsx           # Ink: init 결과 표시
│       ├── sync-report.tsx           # Ink: sync 결과 표시
│       └── status-display.tsx        # Ink: status + integrity 표시
├── package.json
├── tsconfig.json
└── vitest.config.ts

packages/shared/
├── src/
│   └── types.ts                      # 공유 타입 (§3.1)
└── package.json
```

---

## 11. Implementation Order

### Sprint 1 (Week 1~2): 기반 + Harness Pipeline + PlumbBridge

1. [ ] 모노리포 scaffolding (pnpm + Turborepo + tsconfig)
2. [ ] `packages/shared/src/types.ts` — 전체 타입 정의
3. [ ] `packages/cli/src/plumb/errors.ts` — 에러 클래스
4. [ ] `packages/cli/src/plumb/bridge.ts` — PlumbBridge
5. [ ] PlumbBridge 단위 테스트
6. [ ] `harness/detect.ts` — Brownfield/Greenfield 감지
7. [ ] `harness/discover.ts` — 스택 스캔 (MVP: 마커 5종)
8. [ ] `harness/analyze.ts` — 아키텍처 분석 (MVP: 디렉토리+진입점)
9. [ ] `harness/merge-utils.ts` — Markdown/JSON merge 유틸
10. [ ] `harness/generate.ts` — 산출물 생성 + merge
11. [ ] `harness/verify.ts` — 무결성 검증
12. [ ] Harness Pipeline 단위 테스트 (특히 멱등성)

### Sprint 2 (Week 3~4): 커맨드 + 템플릿 + 스크립트 + 배포

13. [ ] 템플릿: default (CLAUDE/AGENTS/ARCHITECTURE/CONSTITUTION/progress.md)
14. [ ] 템플릿: kt-ds-sr + lint 스택별
15. [ ] `commands/init.ts` — Pipeline 통합 + Ink TUI
16. [ ] `commands/sync.ts` + progress.md 업데이트
17. [ ] `commands/status.ts` + 하네스 무결성 표시
18. [ ] `scripts/verify-harness.sh` + `check-sync.sh`
19. [ ] `services/config-manager.ts` + `logger.ts`
20. [ ] `.github/workflows/harness-sync-check.yml`
21. [ ] Integration test (init→sync→status + 멱등성)
22. [ ] npm publish + npx 검증
23. [ ] 사용자 가이드 + 5명 온보딩

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-16 | Initial draft (PRD v3 기반) | AX BD팀 |
| **2.0** | **2026-03-16** | **PRD v4 반영: Harness Pipeline 4단계 설계, RepoProfile 타입, merge 전략, CONSTITUTION.md 3계층, ARCHITECTURE.md, progress.md, verify-harness.sh, HarnessIntegrity, harness/ 모듈 6파일. 테스트 케이스 v4 추가** | **AX BD팀** |
