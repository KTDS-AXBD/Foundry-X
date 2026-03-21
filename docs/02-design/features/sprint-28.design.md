---
code: FX-DSGN-029
title: "Sprint 28 — Phase 3 완결: 에이전트 자동 Rebase + Semantic Linting + Plumb Track B 판정"
version: 0.1
status: Draft
category: DSGN
system-version: 2.1.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 28 Design Document

> **Summary**: F102(에이전트 자동 rebase) + F103(Semantic Linting 실효성) + F105(Plumb Track B 판정) 상세 설계. Worker별 파일 할당 + API 스펙 + 테스트 계획 포함. D1 migration 없음.
>
> **Project**: Foundry-X
> **Version**: v2.2
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft
> **Planning Doc**: [sprint-28.plan.md](../../01-plan/features/sprint-28.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **에이전트 자율성 강화**: rebase 충돌의 자동 해결로 human escalation 최소화 (K8 향상)
2. **코드 품질 자동화**: ESLint 커스텀 룰이 위반 감지 + 수정 예시를 동시 제공
3. **전략 확정**: Plumb Track A/B 전환 판단을 데이터 기반으로 수행
4. **기존 아키텍처 준수**: Hono service DI + gitExecutor DI + ESLint flat config 패턴 유지

### 1.2 Design Principles

- **기존 코드 확장**: MergeQueueService의 rebase 1회 패턴(L134~L153)을 3회 retry loop으로 확장
- **AutoFixService 패턴 재활용**: F101의 retry-with-LLM 패턴을 F102 rebase에 적용 (일관성)
- **최소 의존성**: ESLint 룰은 외부 패키지 없이 순수 AST visitor로 구현
- **D1 스키마 변경 없음**: 기존 테이블(merge_queue, agent_worktrees, agent_messages)으로 충분

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers (API)                       │
│                                                                    │
│  ┌───────────────────┐   ┌──────────────────────────────────────┐ │
│  │ AutoRebaseService │   │ AgentOrchestrator (기존)              │ │
│  │                   │   │                                      │ │
│  │ rebaseOnto()      │──▶│ executeTaskWithAutoRebase()          │ │
│  │ resolveConflicts()│   │   ↳ MergeQueue.processNextWithRebase│ │
│  │ abortAndRestore() │   └──────────────────────────────────────┘ │
│  │ escalateToHuman() │                                            │
│  └────────┬──────────┘                                            │
│           │                                                        │
│           ▼                                                        │
│  ┌──────────────────┐   ┌──────────────────┐                      │
│  │ WorktreeManager  │   │ AgentInbox       │                      │
│  │ (기존 + 확장)     │   │ (기존)            │                      │
│  │ + rebase()       │   │ send() ← 에스컬  │                      │
│  │ + abortRebase()  │   │     레이션 메시지  │                      │
│  │ + fetchBase()    │   │                  │                      │
│  └──────────────────┘   └──────────────────┘                      │
│                                                                    │
│           D1: merge_queue, agent_worktrees, agent_messages (기존)   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     CLI (packages/cli)                              │
│                                                                    │
│  ┌────────────────────────────────────┐   ┌────────────────────┐  │
│  │ harness/lint-rules/                │   │ plumb/             │  │
│  │   index.ts (plugin export)         │   │  usage-analyzer.ts │  │
│  │   no-direct-db-in-route.ts         │   │  (데이터 수집+분석) │  │
│  │   require-zod-schema.ts            │   └────────────────────┘  │
│  │   no-orphan-plumb-import.ts        │                           │
│  └────────────────────────────────────┘                           │
│                                                                    │
│  eslint.config.js ← foundryXPlugin 등록                            │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### F102: AutoRebase 흐름

```
MergeQueue.processNext()
  → PR not mergeable (기존 L133 분기)
  → AutoRebaseService.rebaseWithRetry(worktreeId, baseBranch, maxAttempts=3)
    ┌──────────────────────────────────────────────┐
    │ Attempt 1: Simple rebase                       │
    │   WorktreeManager.fetchBase(worktreeId)        │
    │   WorktreeManager.rebase(worktreeId, base)     │
    │   → 성공? → return { success: true }           │
    │   → 충돌? → WorktreeManager.abortRebase()     │
    ├──────────────────────────────────────────────┤
    │ Attempt 2: LLM conflict resolution             │
    │   충돌 파일 내용 수집 (conflict markers 포함)     │
    │   ClaudeApiRunner.execute(resolvePrompt)       │
    │   git add resolved files → git rebase --continue│
    │   → 성공? → return { success: true }           │
    │   → 실패? → WorktreeManager.abortRebase()     │
    ├──────────────────────────────────────────────┤
    │ Attempt 3: Extended context LLM retry           │
    │   충돌 주변 ±50줄 + 관련 파일 포함              │
    │   ClaudeApiRunner.execute(extendedPrompt)      │
    │   → 성공? → return { success: true }           │
    │   → 실패? → abortAndRestore() → escalate      │
    └──────────────────────────────────────────────┘

escalateToHuman():
  AgentInbox.send("auto-rebase", "human", "escalation", ...)
  SSE pushEvent("agent.rebase.escalated", { conflicts, attempts })
```

#### F103: Semantic Linting 흐름

```
Developer/Agent runs: pnpm lint
  → ESLint loads flat config
  → foundryXPlugin registered
  → AST visitor checks each rule
  → Violation found → report with suggest[] (수정 예시)
  → IDE: 전구 아이콘으로 자동 수정 제안
  → CLI: --fix-type suggestion 으로 자동 적용 가능
```

#### F105: Plumb 판정 흐름

```
usage-analyzer.ts
  → Git log 분석: plumb 관련 커밋/에러 추출
  → 코드베이스 분석: PlumbBridge 호출 지점 + 에러 핸들링
  → (선택) KPI 데이터: kpi_events에서 cli_invoke type=plumb 쿼리
  → 판정 매트릭스 적용
  → ADR-001-plumb-track-b.md 생성
```

---

## 3. Detailed Design

### 3.1 F102 — AutoRebaseService

#### 3.1.1 새 파일: `packages/api/src/services/auto-rebase.ts`

```typescript
import type { WorktreeManager } from "./worktree-manager.js";
import type { AgentRunner } from "./agent-runner.js";
import type { AgentInbox } from "./agent-inbox.js";
import type { SSEManager } from "./sse-manager.js";

const MAX_REBASE_ATTEMPTS = 3;
const REBASE_TIMEOUT_MS = 60_000;
const MAX_CONFLICT_FILES = 10;

export interface RebaseAttempt {
  attempt: number;
  strategy: "simple" | "llm-resolve" | "llm-extended";
  conflictFiles: string[];
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface RebaseResult {
  success: boolean;
  attempts: RebaseAttempt[];
  escalated: boolean;
  restoredToOriginal: boolean;
}

export interface RebaseEscalation {
  type: "rebase_escalation";
  agentId: string;
  taskId: string;
  baseBranch: string;
  conflictFiles: string[];
  attempts: RebaseAttempt[];
  suggestedAction: "manual_rebase" | "force_push" | "abandon";
}

export class AutoRebaseService {
  constructor(
    private worktreeManager: WorktreeManager,
    private fixRunner: AgentRunner,
    private inbox: AgentInbox,
    private db: D1Database,
    private sse?: SSEManager,
  ) {}

  async rebaseWithRetry(
    agentId: string,
    baseBranch: string,
    taskId: string,
  ): Promise<RebaseResult> {
    const attempts: RebaseAttempt[] = [];
    let success = false;

    for (let i = 1; i <= MAX_REBASE_ATTEMPTS; i++) {
      const strategy = this.getStrategy(i);
      const start = Date.now();

      try {
        const result = await this.attemptRebase(agentId, baseBranch, strategy);
        const attempt: RebaseAttempt = {
          attempt: i, strategy,
          conflictFiles: result.conflictFiles,
          success: result.success,
          error: result.error,
          durationMs: Date.now() - start,
        };
        attempts.push(attempt);

        this.sse?.pushEvent({
          event: "agent.rebase.attempt",
          data: { agentId, taskId, attempt },
        });

        if (result.success) { success = true; break; }
      } catch (err) {
        attempts.push({
          attempt: i, strategy, conflictFiles: [],
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
          durationMs: Date.now() - start,
        });
        await this.worktreeManager.abortRebase?.(agentId);
      }
    }

    if (!success) {
      await this.abortAndRestore(agentId);
      await this.escalateToHuman(agentId, taskId, baseBranch, attempts);
      return { success: false, attempts, escalated: true, restoredToOriginal: true };
    }

    return { success: true, attempts, escalated: false, restoredToOriginal: false };
  }

  private getStrategy(attempt: number): RebaseAttempt["strategy"] {
    if (attempt === 1) return "simple";
    if (attempt === 2) return "llm-resolve";
    return "llm-extended";
  }

  private async attemptRebase(
    agentId: string,
    baseBranch: string,
    strategy: RebaseAttempt["strategy"],
  ): Promise<{ success: boolean; conflictFiles: string[]; error?: string }> {
    // ... (Attempt 로직, 아래 §3.1.2~§3.1.4에서 상세)
  }

  private async abortAndRestore(agentId: string): Promise<void> {
    // git rebase --abort + worktree 상태 복원
  }

  private async escalateToHuman(
    agentId: string,
    taskId: string,
    baseBranch: string,
    attempts: RebaseAttempt[],
  ): Promise<void> {
    const conflictFiles = attempts.flatMap(a => a.conflictFiles);
    const escalation: RebaseEscalation = {
      type: "rebase_escalation",
      agentId, taskId, baseBranch,
      conflictFiles: [...new Set(conflictFiles)],
      attempts,
      suggestedAction: conflictFiles.length > MAX_CONFLICT_FILES ? "abandon" : "manual_rebase",
    };

    await this.inbox.send(
      "auto-rebase", "human", "escalation",
      `Rebase failed after ${MAX_REBASE_ATTEMPTS} attempts`,
      escalation as unknown as Record<string, unknown>,
    );

    this.sse?.pushEvent({
      event: "agent.rebase.escalated",
      data: escalation,
    });
  }
}
```

#### 3.1.2 Attempt 1: Simple Rebase

```typescript
// strategy === "simple"
await this.fetchLatestBase(agentId, baseBranch);
const rebaseResult = await this.executeRebase(agentId, baseBranch);

if (rebaseResult.exitCode === 0) {
  return { success: true, conflictFiles: [] };
}

const conflictFiles = this.parseConflictFiles(rebaseResult.stdout);
await this.abortRebase(agentId);
return { success: false, conflictFiles, error: "Merge conflicts detected" };
```

#### 3.1.3 Attempt 2: LLM Conflict Resolution

```typescript
// strategy === "llm-resolve"
await this.fetchLatestBase(agentId, baseBranch);
const rebaseResult = await this.executeRebase(agentId, baseBranch);

if (rebaseResult.exitCode === 0) {
  return { success: true, conflictFiles: [] };
}

const conflictFiles = this.parseConflictFiles(rebaseResult.stdout);
if (conflictFiles.length > MAX_CONFLICT_FILES) {
  await this.abortRebase(agentId);
  return { success: false, conflictFiles, error: `Too many conflicts: ${conflictFiles.length}` };
}

// LLM에게 충돌 해결 요청
for (const file of conflictFiles) {
  const content = await this.readConflictFile(agentId, file);
  const resolved = await this.fixRunner.execute({
    taskId: `rebase-resolve-${file}`,
    agentId: "auto-rebase",
    taskType: "code-generation",
    context: {
      repoUrl: "", branch: baseBranch,
      instructions: this.buildResolvePrompt(file, content),
    },
    constraints: [],
  });

  if (resolved.status === "success" && resolved.output.generatedCode?.length) {
    await this.writeResolvedFile(agentId, file, resolved.output.generatedCode[0].content);
    await this.stageFile(agentId, file);
  } else {
    await this.abortRebase(agentId);
    return { success: false, conflictFiles, error: `LLM failed to resolve: ${file}` };
  }
}

// git rebase --continue
const continueResult = await this.continueRebase(agentId);
if (continueResult.exitCode === 0) {
  return { success: true, conflictFiles };
}

await this.abortRebase(agentId);
return { success: false, conflictFiles, error: "Continue failed after LLM resolve" };
```

#### 3.1.4 Attempt 3: Extended Context

Attempt 2와 동일하되, `buildResolvePrompt()`에 확장 컨텍스트(충돌 주변 ±50줄 + 관련 import 파일) 포함.

#### 3.1.5 WorktreeManager 확장

기존 `WorktreeManager`에 git 명령어 메서드 추가:

```typescript
// worktree-manager.ts에 추가
async fetchBase(agentId: string, remote = "origin"): Promise<void> {
  if (!this.gitExecutor) return;
  const config = this.worktrees.get(agentId);
  if (!config) throw new Error(`Worktree not found: ${agentId}`);
  await this.gitExecutor(["fetch", remote, config.baseBranch]);
}

async rebase(agentId: string, onto: string): Promise<{ stdout: string; exitCode: number }> {
  if (!this.gitExecutor) return { stdout: "", exitCode: 0 };
  return this.gitExecutor(["rebase", `origin/${onto}`]);
}

async abortRebase(agentId: string): Promise<void> {
  if (!this.gitExecutor) return;
  try {
    await this.gitExecutor(["rebase", "--abort"]);
  } catch {
    // Already not in rebase state
  }
}

async continueRebase(agentId: string): Promise<{ stdout: string; exitCode: number }> {
  if (!this.gitExecutor) return { stdout: "", exitCode: 0 };
  return this.gitExecutor(["rebase", "--continue"]);
}

async stageFile(agentId: string, filePath: string): Promise<void> {
  if (!this.gitExecutor) return;
  await this.gitExecutor(["add", filePath]);
}
```

#### 3.1.6 MergeQueueService 변경

기존 `processNext()` L133~L153의 단일 rebase 시도를 `AutoRebaseService` 호출로 교체:

```typescript
// merge-queue.ts 변경 (processNext 메서드 내부)
// 기존: github.updateBranch(entry.prNumber) — 단순 1회 시도
// 변경: autoRebase.rebaseWithRetry(entry.agentId, baseBranch, entry.id)

if (!prStatus?.mergeable) {
  await this.updateEntry(entry.id, { rebase_attempted: 1 });

  const rebaseResult = await this.autoRebase.rebaseWithRetry(
    entry.agentId,
    "master",  // baseBranch
    entry.id,
  );

  if (!rebaseResult.success) {
    await this.updateEntryStatus(entry.id, "conflict");
    await this.updateEntry(entry.id, { rebase_succeeded: 0 });
    return {
      merged: false,
      entryId: entry.id,
      prNumber: entry.prNumber,
      error: rebaseResult.escalated
        ? "Rebase failed — escalated to human"
        : "Rebase failed",
    };
  }

  await this.updateEntry(entry.id, { rebase_succeeded: 1 });
}
```

**Constructor 변경**: `AutoRebaseService` DI 추가

```typescript
export class MergeQueueService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
    private sse?: SSEManager,
    private autoRebase?: AutoRebaseService,  // 신규
  ) {}
```

---

### 3.2 F103 — Semantic Linting Rules

#### 3.2.1 디렉토리 구조

```
packages/cli/src/harness/lint-rules/
  ├── index.ts                      # Plugin export
  ├── no-direct-db-in-route.ts      # Rule 1
  ├── require-zod-schema.ts         # Rule 2
  ├── no-orphan-plumb-import.ts     # Rule 3
  └── __tests__/
      ├── no-direct-db-in-route.test.ts
      ├── require-zod-schema.test.ts
      └── no-orphan-plumb-import.test.ts
```

#### 3.2.2 Rule 1: `no-direct-db-in-route`

**목적**: 라우트 핸들러에서 D1(`c.env.DB`, `db.prepare`) 직접 접근을 금지하여 서비스 레이어 강제

```typescript
import type { Rule } from "eslint";

export const noDirectDbInRoute: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct D1 database access in route handlers",
    },
    hasSuggestions: true,
    messages: {
      noDirectDb: "Route handler should not access D1 directly. Use a service method instead.",
      useService: "Extract database call to a service method.",
    },
    schema: [],
  },
  create(context) {
    // 파일 경로가 routes/ 하위인지 확인
    const filename = context.filename ?? context.getFilename();
    if (!filename.includes("/routes/")) return {};

    return {
      MemberExpression(node) {
        // c.env.DB 패턴 감지
        if (
          node.object.type === "MemberExpression" &&
          node.object.property.type === "Identifier" &&
          node.object.property.name === "env" &&
          node.property.type === "Identifier" &&
          node.property.name === "DB"
        ) {
          context.report({
            node,
            messageId: "noDirectDb",
            suggest: [{
              messageId: "useService",
              fix: () => null, // suggestion만 제공, auto-fix는 복잡하므로 수동
            }],
          });
        }
      },
      CallExpression(node) {
        // db.prepare() 패턴 감지
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "prepare"
        ) {
          context.report({
            node,
            messageId: "noDirectDb",
            suggest: [{
              messageId: "useService",
              fix: () => null,
            }],
          });
        }
      },
    };
  },
};
```

#### 3.2.3 Rule 2: `require-zod-schema`

**목적**: 라우트 핸들러에서 `c.req.json()` 직접 호출 시 Zod 검증 강제

```typescript
export const requireZodSchema: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require Zod schema validation for request body parsing in routes",
    },
    hasSuggestions: true,
    messages: {
      requireZod: "Use Zod schema to validate request body: `schema.parse(await c.req.json())`",
      addZodParse: "Wrap with schema.parse()",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!filename.includes("/routes/")) return {};

    return {
      CallExpression(node) {
        // c.req.json() 패턴 감지
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "json" &&
          node.callee.object.type === "MemberExpression" &&
          node.callee.object.property.type === "Identifier" &&
          node.callee.object.property.name === "req"
        ) {
          // 부모가 이미 schema.parse() 래핑인지 확인
          const parent = (node as any).parent;
          if (
            parent?.type === "CallExpression" &&
            parent.callee?.type === "MemberExpression" &&
            parent.callee.property?.name === "parse"
          ) {
            return; // 이미 검증됨
          }

          context.report({
            node,
            messageId: "requireZod",
            suggest: [{
              messageId: "addZodParse",
              fix(fixer) {
                const sourceCode = context.sourceCode ?? context.getSourceCode();
                const text = sourceCode.getText(node);
                return fixer.replaceText(node, `schema.parse(${text})`);
              },
            }],
          });
        }
      },
    };
  },
};
```

#### 3.2.4 Rule 3: `no-orphan-plumb-import`

**목적**: CLI 외부 패키지(api, web)에서 PlumbBridge 직접 import 금지

```typescript
export const noOrphanPlumbImport: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow PlumbBridge import outside of CLI package",
    },
    hasSuggestions: true,
    messages: {
      noOrphanImport: "PlumbBridge should only be imported within packages/cli. Use MCP or CLI subprocess instead.",
      useMcp: "Use MCP tool call or CLI subprocess for Plumb integration.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    // CLI 패키지 내부는 허용
    if (filename.includes("packages/cli/")) return {};

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === "string" && (
          source.includes("plumb") ||
          source.includes("PlumbBridge")
        )) {
          context.report({
            node,
            messageId: "noOrphanImport",
            suggest: [{
              messageId: "useMcp",
              fix: () => null,
            }],
          });
        }
      },
    };
  },
};
```

#### 3.2.5 Plugin Export: `index.ts`

```typescript
import { noDirectDbInRoute } from "./no-direct-db-in-route.js";
import { requireZodSchema } from "./require-zod-schema.js";
import { noOrphanPlumbImport } from "./no-orphan-plumb-import.js";

export const foundryXPlugin = {
  meta: { name: "eslint-plugin-foundry-x", version: "1.0.0" },
  rules: {
    "no-direct-db-in-route": noDirectDbInRoute,
    "require-zod-schema": requireZodSchema,
    "no-orphan-plumb-import": noOrphanPlumbImport,
  },
};
```

#### 3.2.6 eslint.config.js 통합

```javascript
// packages/cli/eslint.config.js (변경)
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { foundryXPlugin } from './src/harness/lint-rules/index.js';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'foundry-x': foundryXPlugin },
    rules: {
      // 기존 룰
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
      // 신규 Foundry-X 룰
      'foundry-x/no-direct-db-in-route': 'error',
      'foundry-x/require-zod-schema': 'warn',
      'foundry-x/no-orphan-plumb-import': 'error',
    },
  },
  { ignores: ['dist/', 'node_modules/', '**/*.test.ts'] },
);
```

**API 패키지**: `packages/api/` 에는 별도 eslint.config가 없으므로(루트 또는 CLI config 공유), 루트 config에 `no-direct-db-in-route`와 `require-zod-schema`를 추가하거나 API에 eslint.config.mjs 신규 생성. **Worker 2가 결정**.

---

### 3.3 F105 — Plumb Track B 판정

#### 3.3.1 새 파일: `packages/cli/src/plumb/usage-analyzer.ts`

```typescript
export interface PlumbUsageMetrics {
  totalInvocations: number;
  successCount: number;
  failureCount: number;
  errorRate: number;              // failureCount / totalInvocations
  averageResponseTimeMs: number;
  weeklyFailures: number;         // 최근 4주 평균 주간 실패 수
  callSites: string[];            // 코드베이스 내 호출 지점
  errorPatterns: { type: string; count: number; lastSeen: string }[];
}

export interface TrackBDecision {
  decision: "go-track-b" | "stay-track-a" | "conditional";
  metrics: PlumbUsageMetrics;
  rationale: string;
  nextReviewDate: string;
}

export class PlumbUsageAnalyzer {
  async collectFromGitLog(repoPath: string): Promise<Partial<PlumbUsageMetrics>> {
    // git log --grep="plumb" --since="4 weeks ago" 분석
  }

  async collectFromCodebase(repoPath: string): Promise<{ callSites: string[] }> {
    // grep -r "PlumbBridge\|plumb" packages/cli/src/ 분석
  }

  calculateMetrics(rawData: Partial<PlumbUsageMetrics>): PlumbUsageMetrics {
    // 에러율, 평균 응답시간 등 계산
  }

  applyDecisionMatrix(metrics: PlumbUsageMetrics): TrackBDecision {
    const { weeklyFailures, errorRate } = metrics;

    if (weeklyFailures >= 2 && errorRate > 0.1) {
      return {
        decision: "go-track-b",
        metrics,
        rationale: `주간 실패 ${weeklyFailures}회 (기준 2회), 에러율 ${(errorRate * 100).toFixed(1)}% (기준 10%)`,
        nextReviewDate: "",
      };
    }

    if (weeklyFailures <= 1 && errorRate < 0.05) {
      const reviewDate = new Date();
      reviewDate.setMonth(reviewDate.getMonth() + 6);
      return {
        decision: "stay-track-a",
        metrics,
        rationale: `주간 실패 ${weeklyFailures}회, 에러율 ${(errorRate * 100).toFixed(1)}% — 안정적`,
        nextReviewDate: reviewDate.toISOString().slice(0, 10),
      };
    }

    return {
      decision: "conditional",
      metrics,
      rationale: `경계 영역 — 주간 실패 ${weeklyFailures}회, 에러율 ${(errorRate * 100).toFixed(1)}%. 모니터링 강화 후 Sprint 30에서 재판정`,
      nextReviewDate: "Sprint 30",
    };
  }

  generateAdrMarkdown(decision: TrackBDecision): string {
    // ADR-001-plumb-track-b.md 마크다운 생성
  }
}
```

#### 3.3.2 ADR 문서 구조

```markdown
# ADR-001: Plumb Track B 전환 판정

## Status
[Accepted/Deferred] — 2026-03-21

## Context
- Plumb은 Python 기반 SDD Triangle 엔진으로, CLI에서 subprocess로 호출
- Track A: Plumb을 그대로 사용 (현재)
- Track B: Plumb 핵심 알고리즘을 TypeScript로 재구현
- 전환 기준: Plumb 버그로 인한 장애 주 2회 이상 (PRD v4 기준)

## Decision
[데이터 분석 결과에 따라 결정]

## Data
- 분석 기간: Sprint 24~27 (4주)
- 총 호출: N회
- 에러율: N%
- 주간 실패: N회
- 에러 패턴: [...]

## Consequences
[판정에 따른 후속 조치]
```

---

## 4. File Inventory

### 4.1 Worker 1 (W1): F102 — 에이전트 자동 Rebase

| Action | File | LOC Est. |
|--------|------|:--------:|
| **Create** | `packages/api/src/services/auto-rebase.ts` | ~180 |
| **Modify** | `packages/api/src/services/worktree-manager.ts` | +40 (5 메서드) |
| **Modify** | `packages/api/src/services/merge-queue.ts` | +20 (processNext 변경 + constructor DI) |
| **Modify** | `packages/shared/types.ts` | +15 (RebaseAttempt, RebaseResult 타입) |
| **Create** | `packages/api/src/__tests__/services/auto-rebase.test.ts` | ~200 |
| **Modify** | `packages/api/src/__tests__/merge-queue.test.ts` | +50 |

**수정 허용 파일** (W1):
- `packages/api/src/services/auto-rebase.ts` (신규)
- `packages/api/src/services/worktree-manager.ts`
- `packages/api/src/services/merge-queue.ts`
- `packages/shared/types.ts`
- `packages/api/src/__tests__/services/auto-rebase.test.ts` (신규)
- `packages/api/src/__tests__/merge-queue.test.ts`

### 4.2 Worker 2 (W2): F103 — Semantic Linting

| Action | File | LOC Est. |
|--------|------|:--------:|
| **Create** | `packages/cli/src/harness/lint-rules/index.ts` | ~15 |
| **Create** | `packages/cli/src/harness/lint-rules/no-direct-db-in-route.ts` | ~60 |
| **Create** | `packages/cli/src/harness/lint-rules/require-zod-schema.ts` | ~70 |
| **Create** | `packages/cli/src/harness/lint-rules/no-orphan-plumb-import.ts` | ~45 |
| **Modify** | `packages/cli/eslint.config.js` | +10 |
| **Create** | `packages/cli/src/harness/lint-rules/__tests__/no-direct-db-in-route.test.ts` | ~60 |
| **Create** | `packages/cli/src/harness/lint-rules/__tests__/require-zod-schema.test.ts` | ~60 |
| **Create** | `packages/cli/src/harness/lint-rules/__tests__/no-orphan-plumb-import.test.ts` | ~40 |

**수정 허용 파일** (W2):
- `packages/cli/src/harness/lint-rules/` 전체 (신규 디렉토리)
- `packages/cli/eslint.config.js`

### 4.3 리더: F105 — Plumb Track B 판정

| Action | File | LOC Est. |
|--------|------|:--------:|
| **Create** | `packages/cli/src/plumb/usage-analyzer.ts` | ~120 |
| **Create** | `packages/cli/src/plumb/__tests__/usage-analyzer.test.ts` | ~60 |
| **Create** | `docs/adr/ADR-001-plumb-track-b.md` | ~80 |
| **Modify** | SPEC.md §7 기술 스택 (판정 결과) | +5 |

---

## 5. Test Plan

### 5.1 F102 테스트 (~15건)

| # | 테스트 | 검증 내용 |
|---|--------|-----------|
| 1 | rebaseWithRetry — simple success | Attempt 1에서 성공 시 바로 반환 |
| 2 | rebaseWithRetry — simple fail, llm success | Attempt 1 실패 → Attempt 2 LLM 성공 |
| 3 | rebaseWithRetry — all 3 fail → escalation | 3회 실패 후 AgentInbox 메시지 전송 |
| 4 | rebaseWithRetry — maxAttempts=3 하드 리밋 | 4회 이상 실행되지 않음 |
| 5 | abortAndRestore — rebase 중단 후 원본 복구 | git rebase --abort 호출 확인 |
| 6 | escalateToHuman — inbox 메시지 + SSE 이벤트 | send() 호출 + pushEvent() 호출 |
| 7 | resolveConflicts — LLM 응답 적용 + stage | writeFile + git add 호출 |
| 8 | resolveConflicts — MAX_CONFLICT_FILES 초과 → abort | 10개 초과 시 즉시 포기 |
| 9 | WorktreeManager.rebase — 정상 실행 | gitExecutor(["rebase"]) 호출 |
| 10 | WorktreeManager.abortRebase — abort 실행 | gitExecutor(["rebase", "--abort"]) 호출 |
| 11 | WorktreeManager.fetchBase — fetch 실행 | gitExecutor(["fetch"]) 호출 |
| 12 | WorktreeManager.continueRebase — continue 실행 | gitExecutor(["rebase", "--continue"]) 호출 |
| 13 | MergeQueue + AutoRebase 통합 — processNext rebase 경로 | processNext에서 rebaseWithRetry 호출 |
| 14 | MergeQueue — rebase 실패 시 status=conflict | entry status 갱신 확인 |
| 15 | timeout — 60초 초과 시 abort | 타임아웃 동작 |

### 5.2 F103 테스트 (~10건)

| # | 테스트 | 검증 내용 |
|---|--------|-----------|
| 1 | no-direct-db-in-route — c.env.DB 감지 | routes/ 파일에서 에러 발생 |
| 2 | no-direct-db-in-route — db.prepare 감지 | routes/ 파일에서 에러 발생 |
| 3 | no-direct-db-in-route — services/ 허용 | services/ 파일에서 에러 미발생 |
| 4 | no-direct-db-in-route — suggest 제공 | report에 suggest 배열 존재 |
| 5 | require-zod-schema — c.req.json() 감지 | 미래핑 시 경고 |
| 6 | require-zod-schema — schema.parse() 래핑 허용 | 이미 래핑된 경우 통과 |
| 7 | require-zod-schema — fix suggestion 제공 | schema.parse() 래핑 제안 |
| 8 | no-orphan-plumb-import — api에서 plumb import 감지 | 에러 발생 |
| 9 | no-orphan-plumb-import — cli에서 plumb import 허용 | 에러 미발생 |
| 10 | plugin registration — eslint.config 로딩 확인 | 3개 룰 모두 등록 |

### 5.3 F105 테스트 (~5건)

| # | 테스트 | 검증 내용 |
|---|--------|-----------|
| 1 | calculateMetrics — 에러율 계산 | 정확한 비율 계산 |
| 2 | applyDecisionMatrix — go-track-b | 주간 실패 ≥2 + 에러율 >10% |
| 3 | applyDecisionMatrix — stay-track-a | 주간 실패 ≤1 + 에러율 <5% |
| 4 | applyDecisionMatrix — conditional | 경계 영역 |
| 5 | generateAdrMarkdown — 마크다운 생성 | 필수 섹션 포함 확인 |

---

## 6. Conventions & Constraints

### 6.1 Rebase Safety

- `MAX_REBASE_ATTEMPTS = 3` (하드코딩, 설정 변경 불가)
- `REBASE_TIMEOUT_MS = 60_000` (시도당 60초)
- `MAX_CONFLICT_FILES = 10` (초과 시 자동 해결 포기)
- 모든 실패 경로에서 `git rebase --abort` 필수 호출
- LLM diff 적용 후 반드시 `typecheck` 검증 (향후 F101 AutoFix 연동)

### 6.2 ESLint Rule Conventions

- 파일 경로 기반 적용 범위 제어 (`context.filename`)
- `meta.hasSuggestions: true` 필수 — IDE 수정 제안 동작
- 기존 코드 위반은 `warn` → 신규 코드만 `error` (점진적 적용)

### 6.3 Plumb 판정

- ADR 형식: `docs/adr/ADR-NNN-title.md`
- 판정 결과 SPEC §7에 반영 (1줄 추가)
- 실사용 데이터 부재 시 코드베이스 분석만으로 판정 (명시)

---

## 7. Implementation Order (Agent Team 기준)

### Phase 1: 핵심 서비스 (W1 + W2 + 리더 병렬, ~15min)

1. **W1**: `auto-rebase.ts` — AutoRebaseService 클래스 (§3.1.1)
2. **W2**: `lint-rules/` — 3개 룰 + index.ts (§3.2.2~§3.2.5)
3. **리더**: `usage-analyzer.ts` — PlumbUsageAnalyzer 클래스 (§3.3.1)

### Phase 2: 통합 + 테스트 (W1 + W2 병렬, ~10min)

4. **W1**: `worktree-manager.ts` 확장(§3.1.5) + `merge-queue.ts` 변경(§3.1.6) + 테스트 15건
5. **W2**: `eslint.config.js` 통합(§3.2.6) + 테스트 10건

### Phase 3: 판정 + 마무리 (리더, ~10min)

6. **리더**: Plumb 데이터 수집·분석 실행 + ADR 작성
7. **리더**: `shared/types.ts` 타입 통합 (W1 결과 반영)
8. **리더**: SPEC.md 갱신 + typecheck + lint + 전체 테스트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial design | Sinclair Seo |
