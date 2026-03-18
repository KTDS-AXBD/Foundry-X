---
code: FX-DSGN-016
title: Sprint 15 (v1.3.0) — PlannerAgent + 에이전트 inbox 통신 + git worktree 격리 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 1.3.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 15 (v1.3.0) Design Document

> **Summary**: PlannerAgent(코드 분석+계획+인간 승인), Agent inbox(비동기 메시지 큐), git worktree 격리(에이전트별 독립 디렉토리) 상세 설계.
>
> **Project**: Foundry-X
> **Version**: 1.3.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [[FX-PLAN-016]] (`docs/01-plan/features/sprint-15.plan.md`)

---

## 1. Overview

### 1.1 Design Goals

1. 에이전트 실행 전 **Plan 단계** 삽입 — 코드베이스 분석 + 계획 수립 + 인간 승인 흐름 확립
2. 에이전트 간 **비동기 메시지 큐** — Leader/Worker 패턴의 통신 기반 구축
3. 에이전트별 **독립 git worktree** — 병렬 작업 물리적 격리로 충돌 근본 제거

### 1.2 현재 코드 분석

#### AgentOrchestrator 현황 (599 LOC)

| 메서드 | 상태 | Sprint |
|--------|:----:|:------:|
| `executeTask()` | ✅ | S10 |
| `executeTaskWithPr()` | ✅ | S13 |
| `selectRunner()` | ✅ | S12 |
| `executeParallel()` | ✅ | S14 |
| `executeParallelWithPr()` | ✅ | S14 |
| `createPlanAndWait()` | ❌ | **S15 F70** |
| `executePlan()` | ❌ | **S15 F70** |
| `executeTaskIsolated()` | ❌ | **S15 F72** |

#### 서비스 주입 패턴

| 메서드 | 주입 대상 | Sprint |
|--------|-----------|:------:|
| `setPrPipeline()` | PrPipelineService | S13 |
| `setMergeQueue()` | MergeQueueService | S14 |
| `setPlannerAgent()` | PlannerAgent | **S15 F70** |
| `setWorktreeManager()` | WorktreeManager | **S15 F72** |

### 1.3 환경 변경 요약

| 항목 | 현재 | 변경 후 |
|------|:----:|:-------:|
| D1 테이블 | 15 | 18 (+agent_plans, +agent_messages, +agent_worktrees) |
| API endpoints | 50 | 57 (+plan 3, +inbox 3, +worktree 1) |
| SSE 이벤트 | 13종 | 17종 (+plan 3, +message 1) |
| shared 타입 | 55 | 61 (+6) |
| API 서비스 | 19 | 21 (+planner-agent, +agent-inbox) |

---

## 2. F70: PlannerAgent 상세 설계

### 2.1 PlannerAgent 서비스

#### 2.1.1 클래스 설계

```typescript
// packages/api/src/services/planner-agent.ts

import type { AgentPlan, ProposedStep, AgentPlanStatus } from "@foundry-x/shared";

interface PlannerAgentDeps {
  db: D1Database;
  sse?: SSEManager;
  llmService?: LLMService;
}

export class PlannerAgent {
  constructor(private deps: PlannerAgentDeps) {}

  /**
   * 코드베이스를 분석하고 실행 계획을 수립한다.
   * 1. targetFiles 읽기 + 의존성 그래프 파악
   * 2. Claude API로 계획 수립 (ProposedStep[] 생성)
   * 3. 리스크 평가 (영향 범위 + 토큰 추정)
   * 4. D1에 agent_plans 레코드 저장
   * 5. SSE agent.plan.created 이벤트 발행
   */
  async createPlan(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
  ): Promise<AgentPlan> { /* ... */ }

  /**
   * 인간 피드백을 반영하여 계획을 수정한다.
   * status: pending_approval → modified
   */
  async revisePlan(planId: string, feedback: string): Promise<AgentPlan> { /* ... */ }

  /**
   * 계획 승인. status → approved
   */
  async approvePlan(planId: string): Promise<AgentPlan> { /* ... */ }

  /**
   * 계획 거절. status → rejected
   */
  async rejectPlan(planId: string, reason?: string): Promise<AgentPlan> { /* ... */ }

  async getPlan(planId: string): Promise<AgentPlan | null> { /* ... */ }

  async listPlans(agentId?: string): Promise<AgentPlan[]> { /* ... */ }
}
```

#### 2.1.2 LLM 프롬프트 설계

```typescript
const PLAN_SYSTEM_PROMPT = `
You are a planning agent for a software project.
Given the task description and codebase context, produce a structured execution plan.

Rules:
1. Analyze the target files and their dependencies
2. Break down into concrete steps (create/modify/delete/test)
3. Identify risks (breaking changes, high-impact files, complex dependencies)
4. Estimate affected file count and token usage
5. Respond in JSON format matching the ProposedStep[] schema
`;
```

#### 2.1.3 상태 머신

```
                    ┌──────────────┐
                    │  analyzing   │ ← createPlan() 시작
                    └──────┬───────┘
                           │ LLM 응답 완료
                    ┌──────▼───────┐
              ┌────►│pending_approval│◄──────┐
              │     └──────┬───────┘        │
              │            │                │
     revisePlan()    approvePlan()   rejectPlan()
              │            │                │
     ┌────────▼──┐  ┌──────▼──┐   ┌────────▼──┐
     │  modified  │  │ approved │   │  rejected  │
     └────────────┘  └─────┬───┘   └───────────┘
                           │ executePlan()
                    ┌──────▼───────┐
                    │  executing   │
                    └──────┬───────┘
                           │ 실행 완료
                    ┌──────▼───────┐
                    │  completed   │
                    └──────────────┘
```

### 2.2 Shared Types

```typescript
// packages/shared/src/agent.ts에 추가

// ─── Sprint 15: PlannerAgent Types (F70) ───

export type AgentPlanStatus =
  | 'analyzing'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'modified'
  | 'executing'
  | 'completed';

export interface ProposedStep {
  description: string;
  type: 'create' | 'modify' | 'delete' | 'test';
  targetFile?: string;
  estimatedLines?: number;
}

export interface AgentPlan {
  id: string;
  taskId: string;
  agentId: string;
  codebaseAnalysis: string;
  proposedSteps: ProposedStep[];
  estimatedFiles: number;
  risks: string[];
  estimatedTokens: number;
  status: AgentPlanStatus;
  humanFeedback?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}
```

### 2.3 D1 스키마

```sql
CREATE TABLE IF NOT EXISTS agent_plans (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  codebase_analysis TEXT NOT NULL DEFAULT '',
  proposed_steps TEXT NOT NULL DEFAULT '[]',
  estimated_files INTEGER DEFAULT 0,
  risks TEXT DEFAULT '[]',
  estimated_tokens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analyzing',
  human_feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  rejected_at TEXT
);
```

### 2.4 Zod 스키마

```typescript
// packages/api/src/schemas/plan.ts

import { z } from "zod";

export const createPlanSchema = z.object({
  agentId: z.string().min(1),
  taskType: z.enum([
    "code-review", "code-generation", "spec-analysis", "test-generation",
  ]),
  context: z.object({
    repoUrl: z.string(),
    branch: z.string(),
    targetFiles: z.array(z.string()).optional(),
    instructions: z.string().optional(),
  }),
});

export const rejectPlanSchema = z.object({
  reason: z.string().optional(),
});

export const modifyPlanSchema = z.object({
  feedback: z.string().min(1),
});
```

### 2.5 API Endpoints

| Method | Path | 설명 | Auth |
|--------|------|------|:----:|
| POST | `/agents/plan` | 계획 생성 | ✅ |
| POST | `/agents/plan/:id/approve` | 계획 승인 → 실행 시작 | ✅ |
| POST | `/agents/plan/:id/reject` | 계획 거절 + 사유 기록 | ✅ |

#### POST `/agents/plan` — Request/Response

**Request:**
```json
{
  "agentId": "code-gen-agent",
  "taskType": "code-generation",
  "context": {
    "repoUrl": "https://github.com/KTDS-AXBD/Foundry-X",
    "branch": "master",
    "targetFiles": ["packages/api/src/services/agent-orchestrator.ts"],
    "instructions": "Add executeTaskIsolated method with worktree support"
  }
}
```

**Response (201):**
```json
{
  "id": "plan-abc12345",
  "taskId": "task-xyz",
  "agentId": "code-gen-agent",
  "codebaseAnalysis": "AgentOrchestrator는 현재 5개 메서드...",
  "proposedSteps": [
    { "type": "modify", "description": "WorktreeManager import 추가", "targetFile": "agent-orchestrator.ts", "estimatedLines": 5 },
    { "type": "modify", "description": "executeTaskIsolated() 구현", "targetFile": "agent-orchestrator.ts", "estimatedLines": 35 },
    { "type": "create", "description": "executeTaskIsolated 테스트", "targetFile": "agent-orchestrator.test.ts", "estimatedLines": 40 }
  ],
  "estimatedFiles": 2,
  "risks": ["agent-orchestrator.ts가 이미 599 LOC"],
  "estimatedTokens": 8500,
  "status": "pending_approval",
  "createdAt": "2026-03-18T10:30:00Z"
}
```

### 2.6 AgentOrchestrator 확장

```typescript
// agent-orchestrator.ts에 추가

private plannerAgent?: PlannerAgent;

setPlannerAgent(planner: PlannerAgent): void {
  this.plannerAgent = planner;
}

/**
 * F70: 계획 수립 후 대기 — 인간 승인 후 executePlan()으로 실행
 */
async createPlanAndWait(
  agentId: string,
  taskType: AgentTaskType,
  context: AgentExecutionRequest["context"],
): Promise<AgentPlan> {
  if (!this.plannerAgent) {
    throw new Error("PlannerAgent not configured");
  }
  return this.plannerAgent.createPlan(agentId, taskType, context);
}

/**
 * F70: 승인된 계획을 실행
 * plan.status === 'approved'인 경우에만 실행
 */
async executePlan(
  planId: string,
  runner: AgentRunner,
): Promise<AgentExecutionResult> {
  if (!this.plannerAgent) {
    throw new Error("PlannerAgent not configured");
  }
  const plan = await this.plannerAgent.getPlan(planId);
  if (!plan || plan.status !== "approved") {
    throw new Error(`Plan ${planId} is not approved`);
  }

  const context: AgentExecutionRequest["context"] = {
    repoUrl: "",
    branch: "master",
    targetFiles: plan.proposedSteps
      .filter(s => s.targetFile)
      .map(s => s.targetFile!),
    instructions: plan.proposedSteps
      .map((s, i) => `Step ${i + 1} (${s.type}): ${s.description}`)
      .join("\n"),
  };

  return this.executeTask(plan.agentId, "code-generation", context, runner);
}
```

### 2.7 SSE 이벤트

| 이벤트 | 트리거 | 데이터 |
|--------|--------|--------|
| `agent.plan.created` | 계획 완료 | `{ planId, taskId, agentId, stepsCount }` |
| `agent.plan.approved` | 인간 승인 | `{ planId, approvedBy }` |
| `agent.plan.rejected` | 인간 거절 | `{ planId, reason }` |

### 2.8 AgentPlanCard (WIP 활용)

기존 `AgentPlanCard.tsx` (193 LOC) 그대로 활용. 변경은 로컬 타입 정의를 `@foundry-x/shared` import로 전환만.

---

## 3. F71: Agent Inbox 상세 설계

### 3.1 AgentInbox 서비스

```typescript
// packages/api/src/services/agent-inbox.ts

export class AgentInbox {
  constructor(private deps: { db: D1Database; sse?: SSEManager }) {}

  /** 메시지 전송 — D1 저장 + SSE 알림 */
  async send(
    fromAgentId: string,
    toAgentId: string,
    type: MessageType,
    subject: string,
    payload: Record<string, unknown>,
    parentMessageId?: string,
  ): Promise<AgentMessage> {
    const id = `msg-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await this.deps.db
      .prepare(
        `INSERT INTO agent_messages
         (id, from_agent_id, to_agent_id, type, subject, payload,
          acknowledged, parent_message_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind(id, fromAgentId, toAgentId, type, subject,
            JSON.stringify(payload), parentMessageId ?? null, now)
      .run();

    this.deps.sse?.pushEvent({
      event: "agent.message.received",
      data: { messageId: id, fromAgentId, toAgentId, type, subject },
    });

    return {
      id, fromAgentId, toAgentId, type, subject, payload,
      acknowledged: false, parentMessageId, createdAt: now,
    };
  }

  /** 수신함 조회 — 미읽음 우선, 최신순 */
  async list(
    agentId: string,
    options?: { unreadOnly?: boolean; limit?: number },
  ): Promise<AgentMessage[]> {
    const limit = options?.limit ?? 50;
    let query = "SELECT * FROM agent_messages WHERE to_agent_id = ?";
    const bindings: unknown[] = [agentId];

    if (options?.unreadOnly) {
      query += " AND acknowledged = 0";
    }
    query += " ORDER BY acknowledged ASC, created_at DESC LIMIT ?";
    bindings.push(limit);

    const { results } = await this.deps.db
      .prepare(query).bind(...bindings).all();

    return results.map(this.mapRow);
  }

  /** 읽음 처리 */
  async ack(messageId: string): Promise<boolean> {
    const result = await this.deps.db
      .prepare(
        `UPDATE agent_messages SET acknowledged = 1, acknowledged_at = ?
         WHERE id = ? AND acknowledged = 0`,
      )
      .bind(new Date().toISOString(), messageId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  /** 스레드 조회 */
  async getThread(parentMessageId: string): Promise<AgentMessage[]> {
    const { results } = await this.deps.db
      .prepare(
        `SELECT * FROM agent_messages
         WHERE parent_message_id = ? OR id = ?
         ORDER BY created_at ASC`,
      )
      .bind(parentMessageId, parentMessageId).all();
    return results.map(this.mapRow);
  }

  private mapRow(r: Record<string, unknown>): AgentMessage {
    return {
      id: r.id as string,
      fromAgentId: r.from_agent_id as string,
      toAgentId: r.to_agent_id as string,
      type: r.type as MessageType,
      subject: r.subject as string,
      payload: JSON.parse(r.payload as string),
      acknowledged: r.acknowledged === 1,
      parentMessageId: (r.parent_message_id as string) ?? undefined,
      createdAt: r.created_at as string,
      acknowledgedAt: (r.acknowledged_at as string) ?? undefined,
    };
  }
}
```

### 3.2 Shared Types

```typescript
// ─── Sprint 15: Agent Inbox Types (F71) ───

export type MessageType =
  | 'task_assign'      // Leader → Worker: 작업 할당
  | 'task_result'      // Worker → Leader: 작업 결과
  | 'task_question'    // Worker → Leader: 질문/확인 요청
  | 'task_feedback'    // Leader → Worker: 피드백/수정 지시
  | 'status_update';   // 양방향: 상태 업데이트

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: MessageType;
  subject: string;
  payload: Record<string, unknown>;
  acknowledged: boolean;
  parentMessageId?: string;
  createdAt: string;
  acknowledgedAt?: string;
}
```

### 3.3 D1 스키마

```sql
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  acknowledged INTEGER NOT NULL DEFAULT 0,
  parent_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_to_agent
  ON agent_messages(to_agent_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON agent_messages(parent_message_id);
```

### 3.4 API Endpoints (inbox.ts 라우트)

| Method | Path | 설명 | Auth |
|--------|------|------|:----:|
| POST | `/agents/inbox/send` | 메시지 전송 | ✅ |
| GET | `/agents/inbox/:agentId` | 수신함 조회 | ✅ |
| POST | `/agents/inbox/:id/ack` | 읽음 처리 | ✅ |

### 3.5 Zod 스키마

```typescript
// packages/api/src/schemas/inbox.ts

export const sendMessageSchema = z.object({
  fromAgentId: z.string().min(1),
  toAgentId: z.string().min(1),
  type: z.enum([
    "task_assign", "task_result", "task_question",
    "task_feedback", "status_update",
  ]),
  subject: z.string().min(1).max(200),
  payload: z.record(z.unknown()).default({}),
  parentMessageId: z.string().optional(),
});

export const listMessagesSchema = z.object({
  unreadOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
```

### 3.6 AgentInboxPanel UI

```
┌──────────────────────────────────────────┐
│ Agent Inbox: {agentId}                   │
│ ┌────────┬──────────┐                    │
│ │ Unread │ All      │  ← Filter tabs     │
│ └────────┴──────────┘                    │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ [task_assign] Leader → Worker-1      │ │
│ │ "F70 PlannerAgent 서비스 구현"       │ │
│ │ 2026-03-18 10:30  ○ Unread  [ACK]   │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ [task_result] Worker-1 → Leader     │ │
│ │ "planner-agent.ts 12 tests PASS"    │ │
│ │ 2026-03-18 11:15  ● Read           │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ▼ Send Message (collapsible)             │
│ ┌──────────────────────────────────────┐ │
│ │ To: [________] Type: [task_assign▾] │ │
│ │ Subject: [________________________] │ │
│ │ [Send]                              │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

## 4. F72: git worktree 격리 상세 설계

### 4.1 WorktreeManager 확장 (WIP → Production)

기존 in-memory WorktreeManager를 `execFileNoThrow` 패턴으로 git CLI 연동 + D1 영속 저장으로 확장.

```typescript
// packages/api/src/services/worktree-manager.ts

export interface WorktreeConfig {
  id: string;
  agentId: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  status: 'active' | 'completed' | 'failed' | 'cleaned';
  createdAt: string;
  cleanedAt?: string;
}

interface GitExecutor {
  (args: string[]): Promise<{ stdout: string; exitCode: number }>;
}

interface WorktreeManagerDeps {
  db?: D1Database;
  gitExecutor?: GitExecutor;
  basePath?: string;
}

export class WorktreeManager {
  private worktrees = new Map<string, WorktreeConfig>();
  private basePath: string;
  private db?: D1Database;
  private gitExecutor?: GitExecutor;

  constructor(deps: WorktreeManagerDeps = {}) {
    this.basePath = deps.basePath ?? "/tmp/foundry-x-worktrees";
    this.db = deps.db;
    this.gitExecutor = deps.gitExecutor;
  }

  /**
   * worktree 생성 — git worktree add + D1 기록
   * gitExecutor가 없으면 in-memory 전용 (Workers 환경)
   */
  async create(
    agentId: string,
    branchName: string,
    baseBranch = "master",
  ): Promise<WorktreeConfig> {
    const worktreePath = `${this.basePath}/${agentId}`;
    const id = `wt-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // git worktree add (로컬/self-hosted 환경만)
    if (this.gitExecutor) {
      await this.gitExecutor([
        "worktree", "add", "-b", branchName, worktreePath, baseBranch,
      ]);
    }

    const config: WorktreeConfig = {
      id, agentId, branchName, worktreePath, baseBranch,
      status: "active", createdAt: now,
    };
    this.worktrees.set(agentId, config);

    if (this.db) {
      await this.db.prepare(
        `INSERT INTO agent_worktrees
         (id, agent_id, branch_name, worktree_path, base_branch,
          status, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      ).bind(id, agentId, branchName, worktreePath, baseBranch, now).run();
    }

    return config;
  }

  /**
   * worktree 정리 — git worktree remove + D1 상태 갱신
   */
  async cleanup(agentId: string): Promise<boolean> {
    const config = this.worktrees.get(agentId);
    if (!config) return false;

    if (this.gitExecutor) {
      try {
        await this.gitExecutor([
          "worktree", "remove", config.worktreePath, "--force",
        ]);
      } catch { /* in-memory fallback */ }
    }

    config.status = "cleaned";
    config.cleanedAt = new Date().toISOString();

    if (this.db) {
      await this.db.prepare(
        `UPDATE agent_worktrees SET status = 'cleaned', cleaned_at = ?
         WHERE agent_id = ? AND status = 'active'`,
      ).bind(config.cleanedAt, agentId).run();
    }

    return true;
  }

  list(): WorktreeConfig[] {
    return Array.from(this.worktrees.values());
  }

  getPath(agentId: string): string | null {
    return this.worktrees.get(agentId)?.worktreePath ?? null;
  }

  async cleanupAll(): Promise<number> {
    let count = 0;
    for (const [agentId, config] of this.worktrees) {
      if (config.status === "active") {
        await this.cleanup(agentId);
        count++;
      }
    }
    return count;
  }
}
```

### 4.2 D1 스키마

```sql
CREATE TABLE IF NOT EXISTS agent_worktrees (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'master',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cleaned_at TEXT
);
```

### 4.3 AgentOrchestrator.executeTaskIsolated

```typescript
private worktreeManager?: WorktreeManager;

setWorktreeManager(manager: WorktreeManager): void {
  this.worktreeManager = manager;
}

/**
 * F72: worktree 격리 모드 실행
 * 1. create() → 독립 디렉토리 + 브랜치 생성
 * 2. executeTask() (worktree branch에서)
 * 3. cleanup() → 정리
 */
async executeTaskIsolated(
  agentId: string,
  taskType: AgentTaskType,
  context: AgentExecutionRequest["context"],
  runner: AgentRunner,
): Promise<AgentExecutionResult> {
  if (!this.worktreeManager) {
    return this.executeTask(agentId, taskType, context, runner);
  }

  const branchName = `agent/${agentId}/${Date.now()}`;
  await this.worktreeManager.create(agentId, branchName, context.branch);

  try {
    const isolatedContext = { ...context, branch: branchName };
    return await this.executeTask(agentId, taskType, isolatedContext, runner);
  } finally {
    await this.worktreeManager.cleanup(agentId);
  }
}
```

### 4.4 API Endpoint

| Method | Path | 설명 | Auth |
|--------|------|------|:----:|
| GET | `/agents/worktrees` | 활성 worktree 목록 | ✅ |

---

## 5. D1 마이그레이션 통합 (0009)

```sql
-- 0009_sprint_15_planner_inbox_worktree.sql

-- F70: 에이전트 계획
CREATE TABLE IF NOT EXISTS agent_plans (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  codebase_analysis TEXT NOT NULL DEFAULT '',
  proposed_steps TEXT NOT NULL DEFAULT '[]',
  estimated_files INTEGER DEFAULT 0,
  risks TEXT DEFAULT '[]',
  estimated_tokens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'analyzing',
  human_feedback TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  rejected_at TEXT
);

-- F71: 에이전트 메시지
CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  from_agent_id TEXT NOT NULL,
  to_agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  acknowledged INTEGER NOT NULL DEFAULT 0,
  parent_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_to_agent
  ON agent_messages(to_agent_id, acknowledged);
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON agent_messages(parent_message_id);

-- F72: 에이전트 worktree
CREATE TABLE IF NOT EXISTS agent_worktrees (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  worktree_path TEXT NOT NULL,
  base_branch TEXT NOT NULL DEFAULT 'master',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  cleaned_at TEXT
);
```

---

## 6. Implementation Order

### Phase 1 — Leader 선행
1. `packages/shared/src/agent.ts` — 6개 타입 추가
2. `packages/api/migrations/0009_sprint_15_planner_inbox_worktree.sql`
3. `packages/api/src/schemas/plan.ts`
4. `packages/api/src/schemas/inbox.ts`

### Phase 2 — Worker 병렬 실행
**W1 (PlannerAgent — F70):**
5. `packages/api/src/services/planner-agent.ts`
6. `packages/api/src/__tests__/planner-agent.test.ts` (~12건)
7. `packages/api/src/routes/agent.ts` — plan 3 endpoints 추가

**W2 (Inbox + Worktree — F71+F72):**
8. `packages/api/src/services/agent-inbox.ts`
9. `packages/api/src/routes/inbox.ts` (3 endpoints)
10. `packages/api/src/__tests__/agent-inbox.test.ts` (~10건)
11. `packages/api/src/services/worktree-manager.ts` 확장
12. `packages/api/src/__tests__/worktree-manager.test.ts` 확장 (~8건)

### Phase 3 — Leader 후행
13. `packages/api/src/services/agent-orchestrator.ts` — 3 메서드
14. `packages/api/src/services/sse-manager.ts` — 4 이벤트
15. `packages/api/src/index.ts` — inbox 라우트 등록
16. `packages/web/src/components/feature/AgentPlanCard.tsx` — shared import
17. `packages/web/src/components/feature/AgentInboxPanel.tsx` 신규
18. `packages/web/src/app/(app)/agents/page.tsx` — Plans + Inbox 탭
19. `packages/web/src/lib/api-client.ts` — 6 API 함수
20. typecheck + build + test 검증

---

## 7. Test Plan

### 7.1 F70 PlannerAgent (~12건)

| # | 테스트 | 파일 |
|---|--------|------|
| 1 | createPlan — 정상 | planner-agent.test.ts |
| 2 | createPlan — 빈 targetFiles | planner-agent.test.ts |
| 3 | createPlan — LLM 에러 핸들링 | planner-agent.test.ts |
| 4 | revisePlan — 피드백 반영 | planner-agent.test.ts |
| 5 | approvePlan — 상태 전환 | planner-agent.test.ts |
| 6 | rejectPlan — 사유 기록 | planner-agent.test.ts |
| 7 | getPlan — 존재/미존재 | planner-agent.test.ts |
| 8 | listPlans — agentId 필터 | planner-agent.test.ts |
| 9 | POST /agents/plan → 201 | agent.test.ts |
| 10 | POST /agents/plan/:id/approve → 200 | agent.test.ts |
| 11 | POST /agents/plan/:id/reject → 200 | agent.test.ts |
| 12 | createPlanAndWait + executePlan | agent-orchestrator.test.ts |

### 7.2 F71 Agent Inbox (~10건)

| # | 테스트 | 파일 |
|---|--------|------|
| 1 | send — 정상 전송 + SSE 발행 | agent-inbox.test.ts |
| 2 | send — parentMessageId 스레드 | agent-inbox.test.ts |
| 3 | list — 미읽음 필터 | agent-inbox.test.ts |
| 4 | list — 전체 조회 + limit | agent-inbox.test.ts |
| 5 | ack — 정상 읽음 처리 | agent-inbox.test.ts |
| 6 | ack — 이미 읽음 → false | agent-inbox.test.ts |
| 7 | getThread — 스레드 조회 | agent-inbox.test.ts |
| 8 | POST /agents/inbox/send → 201 | inbox.test.ts |
| 9 | GET /agents/inbox/:agentId → 200 | inbox.test.ts |
| 10 | POST /agents/inbox/:id/ack → 200 | inbox.test.ts |

### 7.3 F72 Worktree (~8건)

| # | 테스트 | 파일 |
|---|--------|------|
| 1 | create — gitExecutor 호출 검증 | worktree-manager.test.ts |
| 2 | create — D1 저장 검증 | worktree-manager.test.ts |
| 3 | cleanup — git remove + D1 갱신 | worktree-manager.test.ts |
| 4 | cleanup — gitExecutor 미설정 fallback | worktree-manager.test.ts |
| 5 | list + getPath | worktree-manager.test.ts |
| 6 | cleanupAll | worktree-manager.test.ts |
| 7 | executeTaskIsolated — worktree 생성→실행→cleanup | agent-orchestrator.test.ts |
| 8 | executeTaskIsolated — worktreeManager 미설정 시 일반 실행 | agent-orchestrator.test.ts |

### 7.4 합계

| 구분 | 건수 |
|------|:----:|
| F70 | 12 |
| F71 | 10 |
| F72 | 8 |
| **Sprint 15 신규** | **30** |
| 기존 | 429 |
| **총계** | **~459** |

---

## 8. Security Considerations

- [x] Plan/Inbox/Worktree 모든 endpoint에 authMiddleware 적용
- [x] inbox 메시지 payload는 JSON.stringify로 저장, 파싱 시 검증
- [x] worktree 경로는 basePath 하위로 제한 (경로 탈출 방지)
- [x] D1 쿼리는 전부 parameterized binding (SQL injection 방지)
- [x] LLM 프롬프트에 코드 전송 시 Workers AI 사용으로 외부 유출 방지

---

## 9. Risks

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:----:|:----:|------|
| R1 | PlannerAgent LLM 추가 토큰 비용 | 중 | 중 | estimatedTokens 상한 + MockRunner |
| R2 | git worktree가 Workers에서 실행 불가 | 높 | 중 | in-memory 모드 fallback |
| R3 | inbox 메시지 대량 누적 | 낮 | 낮 | acknowledged 인덱스 + TTL 정리 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft | Sinclair Seo |
