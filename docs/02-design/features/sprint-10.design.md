---
code: FX-DSGN-010
title: Sprint 10 (v0.10.0) — 에이전트 실연동 + NL→Spec 충돌 감지 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 0.10.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 10 Design Document

> **Summary**: Sprint 9의 오케스트레이션 데이터 모델(AgentOrchestrator, 4 D1 테이블, constraint-guard) 위에 AgentRunner 추상화 계층 + ClaudeApiRunner를 구현하고, NL→Spec 생성 시 기존 명세와 충돌을 감지하는 ConflictDetector를 추가하여 에이전트가 실제로 작업을 수행하는 플랫폼으로 전환하는 상세 설계.
>
> **Project**: Foundry-X
> **Version**: 0.10.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [sprint-10.plan.md](../../01-plan/features/sprint-10.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **AgentRunner 추상화 (F53)**: 실행 백엔드(Claude API, MCP, mock)를 교체 가능한 인터페이스로 분리
2. **ClaudeApiRunner (F53)**: Anthropic API fetch 패턴(기존 LLMService 동일)으로 코드 리뷰/생성/분석 수행
3. **MCP 어댑터 인터페이스 (F53)**: Sprint 11+ MCP 전환을 위한 인터페이스만 정의 (구현 없음)
4. **ConflictDetector (F54)**: 규칙 기반 1차 + LLM 2차 검증으로 spec 충돌 감지
5. **프로덕션 실배포 (F52)**: 운영 작업 중심 — 코드 변경 최소, secrets + D1 remote + 검증

### 1.2 현재 코드 분석

| 파일 | 현재 패턴 | 문제 | Sprint 10 변경 |
|------|----------|------|--------------|
| `services/agent-orchestrator.ts` | CRUD 전용 (checkConstraint, listAgents, createTask) | 실제 에이전트 실행 기능 없음 | executeTask() 추가 — AgentRunner 위임 |
| `routes/agent.ts` | 6 endpoints, MOCK_AGENTS fallback | 실행 관련 endpoint 없음 | 3 endpoints 추가 (execute, runners, result) |
| `services/llm.ts` | Workers AI + Claude fallback, fetch 직접 호출 | NL→Spec 전용, 에이전트 작업에 재사용 불가 | ClaudeApiRunner에서 동일 fetch 패턴 사용 |
| `routes/spec.ts` | POST /spec/generate → LLM → Zod 검증 | 기존 spec과 충돌 비교 없음 | ConflictDetector 통합, conflicts 응답 추가 |
| `schemas/spec.ts` | GeneratedSpecSchema (8필드) | 충돌 관련 스키마 없음 | SpecConflict + ResolveRequest 추가 |
| `web/spec-generator/page.tsx` | 입력→생성→결과 2컬럼 레이아웃 | 충돌 표시 UI 없음 | ConflictCard + ConflictResolver 통합 |
| `web/agents/page.tsx` | AgentCard 그리드, SSE activity 업데이트 | 작업 실행 UI 없음 | AgentExecuteModal + AgentTaskResult 추가 |

### 1.3 환경 변경

```typescript
// packages/api/src/env.ts — Sprint 10 변경 없음
// 기존 Bindings:
// - DB: D1Database
// - CACHE: KVNamespace
// - AI: any (Workers AI)
// - ANTHROPIC_API_KEY: string (Claude API)
// - GITHUB_TOKEN: string
// - JWT_SECRET: string
// - GITHUB_REPO: string

// ANTHROPIC_API_KEY는 기존 LLMService에서도 사용 중 → ClaudeApiRunner에서 재사용
```

---

## 2. F52: 프로덕션 실배포 실행

### 2.1 작업 순서

F52는 운영 작업 중심이에요. 코드 변경은 최소화하고 배포 실행에 집중해요.

```
1. Cloudflare Dashboard → Workers → foundry-x-api → Settings → Variables
   - JWT_SECRET: [랜덤 32자 문자열]
   - GITHUB_TOKEN: [PAT with repo scope]
   - WEBHOOK_SECRET: [랜덤 문자열]
   - ANTHROPIC_API_KEY: [Anthropic API key]

2. D1 migration remote 적용:
   wrangler d1 migrations apply foundry-x-db --remote
   (또는 Dashboard에서 Migration tab 사용)

3. Workers 배포:
   wrangler deploy (또는 GitHub Actions push to master)

4. Smoke test:
   bash scripts/smoke-test.sh
```

### 2.2 파일 변경 (최소)

| 파일 | 변경 유형 | 상세 |
|------|:--------:|------|
| `packages/api/wrangler.toml` | 수정 | `ENVIRONMENT = "production"` var 확인 |

> wrangler WSL hang 이슈(세션 #27) — Dashboard 또는 GitHub Actions 경유 권장

---

## 3. F53: 에이전트 실연동

### 3.1 타입 확장 (`packages/shared/src/agent.ts`)

기존 Sprint 9 타입에 실행 관련 타입을 추가해요:

```typescript
// ─── Sprint 10: Agent Execution Types ───

/** 에이전트 실행 작업 유형 */
export type AgentTaskType =
  | "code-review"
  | "code-generation"
  | "spec-analysis"
  | "test-generation";

/** 에이전트 실행 요청 */
export interface AgentExecutionRequest {
  taskId: string;
  agentId: string;
  taskType: AgentTaskType;
  context: {
    repoUrl: string;
    branch: string;
    targetFiles?: string[];
    spec?: {
      title: string;
      description: string;
      acceptanceCriteria: string[];
    };
    instructions?: string;
  };
  constraints: AgentConstraintRule[];
}

/** 에이전트 실행 결과 */
export interface AgentExecutionResult {
  status: "success" | "partial" | "failed";
  output: {
    analysis?: string;
    generatedCode?: Array<{
      path: string;
      content: string;
      action: "create" | "modify";
    }>;
    reviewComments?: Array<{
      file: string;
      line: number;
      comment: string;
      severity: "error" | "warning" | "info";
    }>;
  };
  tokensUsed: number;
  model: string;
  duration: number;
}

/** AgentRunner 타입 식별 */
export type AgentRunnerType = "claude-api" | "mcp" | "mock";

/** 사용 가능한 Runner 정보 */
export interface AgentRunnerInfo {
  type: AgentRunnerType;
  available: boolean;
  model?: string;
  description: string;
}
```

### 3.2 AgentRunner 인터페이스 (`packages/api/src/services/agent-runner.ts`)

```typescript
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentRunnerType,
} from "@foundry-x/shared";

/**
 * 에이전트 실행의 추상화 계층.
 * 다양한 실행 백엔드(Claude API, MCP, mock)를 교체 가능하게 분리.
 */
export interface AgentRunner {
  readonly type: AgentRunnerType;

  /** 에이전트 작업 실행 */
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;

  /** 실행 가능 여부 (API key 존재, 서버 연결 등) */
  isAvailable(): Promise<boolean>;

  /** 특정 taskType 지원 여부 */
  supportsTaskType(taskType: string): boolean;
}

/**
 * AgentRunner 팩토리 — 환경에 따라 적절한 Runner를 생성
 */
export function createAgentRunner(env: {
  ANTHROPIC_API_KEY?: string;
}): AgentRunner {
  if (env.ANTHROPIC_API_KEY) {
    return new ClaudeApiRunner(env.ANTHROPIC_API_KEY);
  }
  return new MockRunner();
}
```

### 3.3 ClaudeApiRunner (`packages/api/src/services/claude-api-runner.ts`)

기존 `LLMService.generateWithClaude()` 패턴(fetch 직접 호출)을 따라요:

```typescript
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "@foundry-x/shared";
import type { AgentRunner } from "./agent-runner.js";

const TASK_SYSTEM_PROMPTS: Record<AgentTaskType, string> = {
  "code-review": `You are a code review agent for the Foundry-X project.
Analyze the provided code files against the spec requirements.
Return a JSON object with "reviewComments" array.
Each comment: { "file": string, "line": number, "comment": string, "severity": "error"|"warning"|"info" }`,

  "code-generation": `You are a code generation agent for the Foundry-X project.
Generate TypeScript code based on the spec requirements.
Return a JSON object with "generatedCode" array.
Each item: { "path": string, "content": string, "action": "create"|"modify" }`,

  "spec-analysis": `You are a spec analysis agent for the Foundry-X project.
Analyze the provided spec for completeness, consistency, and feasibility.
Return a JSON object with "analysis" field containing your assessment.`,

  "test-generation": `You are a test generation agent for the Foundry-X project.
Generate vitest test cases for the provided code and spec.
Return a JSON object with "generatedCode" array containing test files.`,
};

export class ClaudeApiRunner implements AgentRunner {
  readonly type = "claude-api" as const;

  constructor(
    private apiKey: string,
    private model: string = "claude-haiku-4-5-20250714",
  ) {}

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();

    const systemPrompt = TASK_SYSTEM_PROMPTS[request.taskType];
    const userPrompt = this.buildUserPrompt(request);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      return {
        status: "failed",
        output: {
          analysis: `Claude API error: ${res.status} ${res.statusText}`,
        },
        tokensUsed: 0,
        model: this.model,
        duration: Date.now() - startTime,
      };
    }

    const data = (await res.json()) as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
    };

    const text = data.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("");

    const tokensUsed = data.usage.input_tokens + data.usage.output_tokens;

    try {
      const parsed = JSON.parse(text);
      return {
        status: "success",
        output: {
          analysis: parsed.analysis,
          generatedCode: parsed.generatedCode,
          reviewComments: parsed.reviewComments,
        },
        tokensUsed,
        model: this.model,
        duration: Date.now() - startTime,
      };
    } catch {
      return {
        status: "partial",
        output: { analysis: text },
        tokensUsed,
        model: this.model,
        duration: Date.now() - startTime,
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  supportsTaskType(taskType: string): boolean {
    return taskType in TASK_SYSTEM_PROMPTS;
  }

  private buildUserPrompt(request: AgentExecutionRequest): string {
    const parts: string[] = [];

    if (request.context.spec) {
      parts.push(
        `## Spec\nTitle: ${request.context.spec.title}\nDescription: ${request.context.spec.description}`,
      );
      if (request.context.spec.acceptanceCriteria.length > 0) {
        parts.push(
          `\nAcceptance Criteria:\n${request.context.spec.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`,
        );
      }
    }

    if (request.context.instructions) {
      parts.push(`\n## Instructions\n${request.context.instructions}`);
    }

    if (request.context.targetFiles?.length) {
      parts.push(
        `\n## Target Files\n${request.context.targetFiles.join("\n")}`,
      );
    }

    parts.push(`\n## Context\nRepo: ${request.context.repoUrl}`);
    parts.push(`Branch: ${request.context.branch}`);

    return parts.join("\n");
  }
}

/**
 * Mock Runner — 테스트/오프라인용
 */
export class MockRunner implements AgentRunner {
  readonly type = "mock" as const;

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    return {
      status: "success",
      output: {
        analysis: `[Mock] Task ${request.taskType} completed for ${request.context.targetFiles?.join(", ") ?? "no files"}`,
      },
      tokensUsed: 0,
      model: "mock",
      duration: 100,
    };
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  supportsTaskType(): boolean {
    return true;
  }
}
```

### 3.4 MCP 어댑터 인터페이스 (`packages/api/src/services/mcp-adapter.ts`)

Sprint 10에서는 인터페이스만 정의하고, 구현은 Sprint 11+:

```typescript
import type { AgentRunner } from "./agent-runner.js";

/**
 * MCP Transport 추상화 — 통신 방식 교체 가능
 * Sprint 11+에서 구현
 */
export interface McpTransport {
  type: "stdio" | "sse" | "http";
  connect(config: McpConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface McpConnectionConfig {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
}

/**
 * MCP AgentRunner 인터페이스 — AgentRunner + MCP 전용 메서드
 * Sprint 11+에서 구현
 */
export interface McpAgentRunner extends AgentRunner {
  readonly type: "mcp";
  listTools(): Promise<McpTool[]>;
  listResources(): Promise<McpResource[]>;
}
```

### 3.5 AgentOrchestrator 확장

기존 `AgentOrchestrator`에 `executeTask()` 메서드를 추가해요:

```typescript
// packages/api/src/services/agent-orchestrator.ts — 추가 메서드

import type { AgentRunner } from "./agent-runner.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "@foundry-x/shared";

// 기존 메서드 유지 + 아래 추가:

  /**
   * 에이전트 작업 실행 — Runner 위임 + 결과 기록 + SSE 전파
   */
  async executeTask(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
    runner: AgentRunner,
  ): Promise<AgentExecutionResult> {
    // 1. agent_sessions 생성 (status: active)
    const sessionId = `sess-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO agent_sessions (id, agent_name, status, started_at)
         VALUES (?, ?, 'active', ?)`,
      )
      .bind(sessionId, agentId, now)
      .run();

    // 2. agent_tasks 생성 (task_type, runner_type 포함)
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const branch = `feature/${agentId}/${taskId}`;

    await this.db
      .prepare(
        `INSERT INTO agent_tasks
         (id, agent_session_id, branch, task_type, runner_type, pr_status, sdd_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', 0, ?, ?)`,
      )
      .bind(taskId, sessionId, branch, taskType, runner.type, now, now)
      .run();

    // 3. Constraint 수집
    const { results: constraintRows } = await this.db
      .prepare("SELECT * FROM agent_constraints")
      .all<{
        id: string;
        tier: "always" | "ask" | "never";
        action: string;
        description: string;
        enforcement_mode: "block" | "warn" | "log";
      }>();

    const constraints = constraintRows.map((r) => ({
      id: r.id,
      tier: r.tier,
      action: r.action,
      description: r.description,
      enforcementMode: r.enforcement_mode,
    }));

    // 4. Runner 실행
    const request: AgentExecutionRequest = {
      taskId,
      agentId,
      taskType,
      context,
      constraints,
    };

    const result = await runner.execute(request);

    // 5. 결과 기록
    await this.db
      .prepare(
        `UPDATE agent_tasks
         SET result = ?, tokens_used = ?, duration_ms = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        JSON.stringify(result.output),
        result.tokensUsed,
        result.duration,
        new Date().toISOString(),
        taskId,
      )
      .run();

    // 6. session 상태 업데이트
    const sessionStatus = result.status === "failed" ? "failed" : "completed";
    await this.db
      .prepare(
        `UPDATE agent_sessions
         SET status = ?, completed_at = ?, tokens_used = ?
         WHERE id = ?`,
      )
      .bind(sessionStatus, new Date().toISOString(), result.tokensUsed, sessionId)
      .run();

    return result;
  }

  /**
   * 작업 실행 결과 조회
   */
  async getTaskResult(taskId: string): Promise<{
    task: AgentTask;
    result: AgentExecutionResult["output"] | null;
  } | null> {
    const row = await this.db
      .prepare("SELECT * FROM agent_tasks WHERE id = ?")
      .bind(taskId)
      .first<{
        id: string;
        agent_session_id: string;
        branch: string;
        pr_number: number | null;
        pr_status: "draft" | "open" | "merged" | "closed";
        sdd_verified: number;
        task_type: string | null;
        result: string | null;
        tokens_used: number | null;
        duration_ms: number | null;
        runner_type: string | null;
        created_at: string;
        updated_at: string;
      }>();

    if (!row) return null;

    return {
      task: {
        id: row.id,
        agentSessionId: row.agent_session_id,
        branch: row.branch,
        prNumber: row.pr_number ?? undefined,
        prStatus: row.pr_status,
        sddVerified: row.sdd_verified === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
      result: row.result ? JSON.parse(row.result) : null,
    };
  }
```

### 3.6 D1 마이그레이션 (`0005_agent_execution.sql`)

```sql
-- 0005_agent_execution.sql
-- Sprint 10: 에이전트 실행 확장

-- agent_tasks에 실행 관련 컬럼 추가
ALTER TABLE agent_tasks ADD COLUMN task_type TEXT;
ALTER TABLE agent_tasks ADD COLUMN result TEXT;
ALTER TABLE agent_tasks ADD COLUMN tokens_used INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN duration_ms INTEGER DEFAULT 0;
ALTER TABLE agent_tasks ADD COLUMN runner_type TEXT DEFAULT 'claude-api';

-- spec_conflicts 테이블 (F54: 충돌 이력)
CREATE TABLE IF NOT EXISTS spec_conflicts (
  id TEXT PRIMARY KEY,
  new_spec_title TEXT NOT NULL,
  existing_spec_id TEXT,
  conflict_type TEXT NOT NULL CHECK(conflict_type IN ('direct', 'dependency', 'priority', 'scope')),
  severity TEXT NOT NULL CHECK(severity IN ('critical', 'warning', 'info')),
  description TEXT NOT NULL,
  suggestion TEXT,
  resolution TEXT CHECK(resolution IN ('accept', 'reject', 'modify')),
  resolved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_spec_conflicts_new_title
  ON spec_conflicts(new_spec_title);
```

### 3.7 Zod 스키마 확장 (`packages/api/src/schemas/agent.ts`)

```typescript
// 기존 스키마에 추가:

export const AgentExecuteRequestSchema = z
  .object({
    taskType: z
      .enum(["code-review", "code-generation", "spec-analysis", "test-generation"])
      .describe("실행할 작업 유형"),
    context: z
      .object({
        repoUrl: z.string().default("https://github.com/KTDS-AXBD/Foundry-X"),
        branch: z.string().default("master"),
        targetFiles: z.array(z.string()).optional(),
        spec: z
          .object({
            title: z.string(),
            description: z.string(),
            acceptanceCriteria: z.array(z.string()),
          })
          .optional(),
        instructions: z.string().max(2000).optional(),
      })
      .describe("실행 컨텍스트"),
  })
  .openapi("AgentExecuteRequest");

export const AgentExecutionResultSchema = z
  .object({
    status: z.enum(["success", "partial", "failed"]),
    output: z.object({
      analysis: z.string().optional(),
      generatedCode: z
        .array(
          z.object({
            path: z.string(),
            content: z.string(),
            action: z.enum(["create", "modify"]),
          }),
        )
        .optional(),
      reviewComments: z
        .array(
          z.object({
            file: z.string(),
            line: z.number(),
            comment: z.string(),
            severity: z.enum(["error", "warning", "info"]),
          }),
        )
        .optional(),
    }),
    tokensUsed: z.number(),
    model: z.string(),
    duration: z.number(),
  })
  .openapi("AgentExecutionResult");

export const AgentRunnerInfoSchema = z
  .object({
    type: z.enum(["claude-api", "mcp", "mock"]),
    available: z.boolean(),
    model: z.string().optional(),
    description: z.string(),
  })
  .openapi("AgentRunnerInfo");
```

### 3.8 에이전트 API 확장 (`packages/api/src/routes/agent.ts`)

기존 6 endpoints + 신규 3 endpoints:

```typescript
// ─── 신규 Endpoint 1: POST /agents/{id}/execute ───

const executeAgentTask = createRoute({
  method: "post",
  path: "/agents/{id}/execute",
  tags: ["Agents"],
  summary: "에이전트 작업 실행 요청",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: AgentExecuteRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "실행 결과",
      content: { "application/json": { schema: AgentExecutionResultSchema } },
    },
    404: { description: "에이전트를 찾을 수 없음" },
    503: { description: "실행 환경 불가" },
  },
});

agentRoute.openapi(executeAgentTask, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const orchestrator = new AgentOrchestrator(c.env.DB);
  const runner = createAgentRunner({ ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY });

  if (!(await runner.isAvailable())) {
    return c.json({ error: "No agent runner available" }, 503);
  }

  const result = await orchestrator.executeTask(
    id,
    body.taskType,
    body.context,
    runner,
  );

  return c.json(result);
});

// ─── 신규 Endpoint 2: GET /agents/runners ───

const getRunners = createRoute({
  method: "get",
  path: "/agents/runners",
  tags: ["Agents"],
  summary: "사용 가능한 AgentRunner 목록",
  responses: {
    200: {
      description: "Runner 목록",
      content: {
        "application/json": {
          schema: z.array(AgentRunnerInfoSchema),
        },
      },
    },
  },
});

agentRoute.openapi(getRunners, async (c) => {
  const runners: AgentRunnerInfo[] = [
    {
      type: "claude-api",
      available: !!c.env.ANTHROPIC_API_KEY,
      model: "claude-haiku-4-5-20250714",
      description: "Anthropic Claude API — 코드 리뷰, 생성, 분석",
    },
    {
      type: "mcp",
      available: false,
      description: "MCP Protocol — Sprint 11+ 구현 예정",
    },
    {
      type: "mock",
      available: true,
      description: "Mock Runner — 테스트/데모용",
    },
  ];

  return c.json(runners);
});

// ─── 신규 Endpoint 3: GET /agents/tasks/{taskId}/result ───

const getTaskResult = createRoute({
  method: "get",
  path: "/agents/tasks/{taskId}/result",
  tags: ["Agents"],
  summary: "작업 실행 결과 조회",
  request: {
    params: z.object({ taskId: z.string() }),
  },
  responses: {
    200: { description: "작업 결과" },
    404: { description: "작업을 찾을 수 없음" },
  },
});

agentRoute.openapi(getTaskResult, async (c) => {
  const { taskId } = c.req.valid("param");
  const orchestrator = new AgentOrchestrator(c.env.DB);
  const taskResult = await orchestrator.getTaskResult(taskId);

  if (!taskResult) {
    return c.json({ error: "Task not found" }, 404);
  }

  return c.json(taskResult);
});
```

### 3.9 SSE 이벤트 확장

기존 SSEManager에 에이전트 실행 이벤트를 추가해요:

```typescript
// AgentOrchestrator.executeTask() 내에서 SSE 전파 (위치: step 4 전후)
// 이벤트 타입: agent.task.started, agent.task.completed, agent.task.failed

// SSE 이벤트 데이터 구조:
// { type: "agent.task.started", data: { taskId, agentId, taskType, branch } }
// { type: "agent.task.completed", data: { taskId, agentId, status, tokensUsed, duration } }
```

### 3.10 대시보드 UI 변경

#### AgentExecuteModal (`packages/web/src/components/feature/AgentExecuteModal.tsx`)

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface AgentExecuteModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onResult: (result: AgentExecutionResult) => void;
}

export function AgentExecuteModal({
  agentId,
  agentName,
  onClose,
  onResult,
}: AgentExecuteModalProps) {
  const [taskType, setTaskType] = useState<string>("code-review");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          taskType,
          context: {
            repoUrl: "https://github.com/KTDS-AXBD/Foundry-X",
            branch: "master",
            instructions: instructions || undefined,
          },
        }),
      });
      const result = await res.json();
      onResult(result);
    } finally {
      setLoading(false);
    }
  };

  // 렌더링: taskType 선택 (4 radio) + instructions textarea + Execute 버튼
}
```

#### AgentTaskResult (`packages/web/src/components/feature/AgentTaskResult.tsx`)

```typescript
"use client";

import { Card, CardContent } from "@/components/ui/card";

interface AgentTaskResultProps {
  result: AgentExecutionResult;
}

export function AgentTaskResult({ result }: AgentTaskResultProps) {
  // status badge (success=green, partial=yellow, failed=red)
  // output.analysis → 텍스트 블록
  // output.reviewComments → 파일별 코멘트 목록
  // output.generatedCode → 코드 블록 (path + content)
  // tokensUsed, model, duration 표시
}
```

#### agents/page.tsx 변경

```typescript
// 기존 AgentCard에 "작업 실행" 버튼 추가
// 클릭 → AgentExecuteModal 표시
// 결과 → AgentTaskResult 표시
// SSE 이벤트에 agent.task.started/completed 핸들링 추가:
// - task.started → 해당 agent activity를 "running"으로 업데이트
// - task.completed → activity를 "completed"로 + 결과 표시
```

### 3.11 F53 파일 목록

| 파일 | 변경 유형 | 상세 |
|------|:--------:|------|
| `packages/shared/src/agent.ts` | 수정 | AgentTaskType, ExecutionRequest/Result, RunnerType/Info 추가 |
| `packages/api/src/services/agent-runner.ts` | 신규 | AgentRunner interface + createAgentRunner factory |
| `packages/api/src/services/claude-api-runner.ts` | 신규 | ClaudeApiRunner + MockRunner |
| `packages/api/src/services/mcp-adapter.ts` | 신규 | MCP 인터페이스 정의 (stub) |
| `packages/api/src/services/agent-orchestrator.ts` | 수정 | executeTask(), getTaskResult() 추가 |
| `packages/api/src/routes/agent.ts` | 수정 | 3 endpoints 추가 (execute, runners, result) |
| `packages/api/src/schemas/agent.ts` | 수정 | Execute/Result/RunnerInfo Zod 스키마 |
| `packages/api/src/db/migrations/0005_agent_execution.sql` | 신규 | agent_tasks 확장 + spec_conflicts |
| `packages/web/src/components/feature/AgentExecuteModal.tsx` | 신규 | 작업 실행 모달 |
| `packages/web/src/components/feature/AgentTaskResult.tsx` | 신규 | 결과 뷰어 |
| `packages/web/src/app/(app)/agents/page.tsx` | 수정 | 실행 버튼 + 결과 표시 + SSE 이벤트 |

---

## 4. F54: NL→Spec 충돌 감지

### 4.1 충돌 타입 정의

```typescript
// packages/shared/src/web.ts — 추가

/** Spec 충돌 유형 */
export type SpecConflictType = "direct" | "dependency" | "priority" | "scope";

/** Spec 충돌 정보 */
export interface SpecConflict {
  type: SpecConflictType;
  severity: "critical" | "warning" | "info";
  existingSpec: {
    id: string;
    title: string;
    field: string;
    value: string;
  };
  newSpec: {
    field: string;
    value: string;
  };
  description: string;
  suggestion?: string;
}

/** 기존 Spec (D1 저장 또는 SPEC.md 파싱) */
export interface ExistingSpec {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  dependencies: string[];
  status: "planned" | "in_progress" | "done";
}

/** 충돌 해결 요청 */
export interface ConflictResolution {
  conflictId: string;
  resolution: "accept" | "reject" | "modify";
  modifiedValue?: string;
}
```

### 4.2 ConflictDetector (`packages/api/src/services/conflict-detector.ts`)

```typescript
import type { SpecConflict, ExistingSpec } from "@foundry-x/shared";
import type { LLMService } from "./llm.js";

interface GeneratedSpec {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  priority: string;
  category: string;
  dependencies: string[];
}

export class ConflictDetector {
  constructor(private llm?: LLMService) {}

  /**
   * 2-phase 충돌 감지:
   * Phase 1: 규칙 기반 (빠름, 무비용)
   * Phase 2: LLM 기반 (Phase 1에서 후보 발견 시)
   */
  async detect(
    newSpec: GeneratedSpec,
    existingSpecs: ExistingSpec[],
  ): Promise<SpecConflict[]> {
    const conflicts: SpecConflict[] = [];

    // Phase 1: 규칙 기반
    for (const existing of existingSpecs) {
      // 1. 제목 유사도 (키워드 기반)
      const titleSimilarity = this.calculateKeywordOverlap(
        newSpec.title,
        existing.title,
      );
      if (titleSimilarity > 0.6) {
        conflicts.push({
          type: "direct",
          severity: titleSimilarity > 0.8 ? "critical" : "warning",
          existingSpec: {
            id: existing.id,
            title: existing.title,
            field: "title",
            value: existing.title,
          },
          newSpec: { field: "title", value: newSpec.title },
          description: `기존 "${existing.title}"과 유사한 제목 (유사도 ${(titleSimilarity * 100).toFixed(0)}%)`,
          suggestion:
            existing.status === "done"
              ? "기존 항목은 완료 상태 — 확장 또는 별도 등록 권장"
              : "기존 항목과 범위를 비교한 후 병합 또는 분리 결정",
        });
      }

      // 2. 의존성 교차
      const depOverlap = newSpec.dependencies.filter((d) =>
        existing.dependencies.some(
          (ed) => ed.toLowerCase() === d.toLowerCase(),
        ),
      );
      if (depOverlap.length > 0) {
        conflicts.push({
          type: "dependency",
          severity: "info",
          existingSpec: {
            id: existing.id,
            title: existing.title,
            field: "dependencies",
            value: existing.dependencies.join(", "),
          },
          newSpec: {
            field: "dependencies",
            value: newSpec.dependencies.join(", "),
          },
          description: `공통 의존성: ${depOverlap.join(", ")}`,
          suggestion: "동일 모듈을 변경하므로 구현 순서 조정 권장",
        });
      }

      // 3. 동일 카테고리 + 동일 우선순위 (P0 충돌)
      if (
        existing.category === newSpec.category &&
        existing.priority === "P0" &&
        newSpec.priority === "P0" &&
        existing.status === "in_progress"
      ) {
        conflicts.push({
          type: "priority",
          severity: "warning",
          existingSpec: {
            id: existing.id,
            title: existing.title,
            field: "priority",
            value: existing.priority,
          },
          newSpec: { field: "priority", value: newSpec.priority },
          description: `기존 P0 항목 "${existing.title}"이 진행 중 — 동일 카테고리에서 P0 중복`,
          suggestion: "우선순위 조정 또는 순차 구현 권장",
        });
      }
    }

    // Phase 2: LLM 기반 (후보가 있을 때만)
    if (conflicts.length > 0 && this.llm) {
      const enriched = await this.enrichWithLLM(newSpec, conflicts);
      return enriched;
    }

    return conflicts;
  }

  /**
   * 키워드 기반 유사도 계산
   */
  private calculateKeywordOverlap(a: string, b: string): number {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 1);

    const wordsA = new Set(normalize(a));
    const wordsB = new Set(normalize(b));

    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    const intersection = [...wordsA].filter((w) => wordsB.has(w));
    return (2 * intersection.length) / (wordsA.size + wordsB.size);
  }

  /**
   * LLM으로 충돌 심각도 재평가 + 구체적 제안 생성
   */
  private async enrichWithLLM(
    newSpec: GeneratedSpec,
    conflicts: SpecConflict[],
  ): Promise<SpecConflict[]> {
    if (!this.llm) return conflicts;

    try {
      const response = await this.llm.generate(
        `You are a spec conflict analyzer. Given a new spec and detected conflicts, evaluate each conflict's severity and provide specific suggestions. Return JSON array matching input structure with updated severity and suggestion fields.`,
        JSON.stringify({ newSpec, conflicts }),
      );

      const enriched = JSON.parse(response.content) as SpecConflict[];
      return enriched.length > 0 ? enriched : conflicts;
    } catch {
      // LLM 실패 시 규칙 기반 결과 유지
      return conflicts;
    }
  }
}
```

### 4.3 기존 Spec 조회 서비스

```typescript
// packages/api/src/services/conflict-detector.ts 내 또는 별도 모듈

/**
 * D1 requirements 테이블 + specs 테이블에서 기존 spec을 조회
 */
async function getExistingSpecs(db: D1Database): Promise<ExistingSpec[]> {
  const { results } = await db
    .prepare(
      `SELECT id, title, description, category, priority, status
       FROM requirements
       WHERE status NOT IN ('rejected', 'archived')
       ORDER BY created_at DESC
       LIMIT 50`,
    )
    .all<{
      id: string;
      title: string;
      description: string;
      category: string;
      priority: string;
      status: string;
    }>();

  return results.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    category: r.category ?? "feature",
    priority: r.priority ?? "P2",
    dependencies: [],
    status: r.status === "done" ? "done" : r.status === "in_progress" ? "in_progress" : "planned",
  }));
}
```

### 4.4 Spec Route 확장 (`packages/api/src/routes/spec.ts`)

```typescript
// 기존 POST /spec/generate 응답에 conflicts 추가:

import { ConflictDetector } from "../services/conflict-detector.js";

// SpecGenerateResponseSchema 확장:
// 기존 { spec, markdown, confidence, model } +
// conflicts: SpecConflict[] (새 필드)

specRoute.openapi(generateSpecRoute, async (c) => {
  const { text, context, language } = c.req.valid("json");
  const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);

  // 기존 LLM 생성 로직 유지...
  // (response → JSON.parse → Zod 검증 → markdown 생성)

  // ─── Sprint 10 추가: 충돌 감지 ───
  let conflicts: SpecConflict[] = [];
  try {
    const existingSpecs = await getExistingSpecs(c.env.DB);
    const detector = new ConflictDetector(llm);
    conflicts = await detector.detect(result.data, existingSpecs);
  } catch {
    // 충돌 감지 실패 시 빈 배열 — 생성 자체는 방해하지 않음
    conflicts = [];
  }

  return c.json({
    spec: result.data,
    markdown,
    confidence: 0.85,
    model: response.model,
    conflicts, // ← 신규 필드
  });
});

// ─── 신규 Endpoint: POST /spec/conflicts/resolve ───

const resolveConflictRoute = createRoute({
  method: "post",
  path: "/spec/conflicts/resolve",
  tags: ["Spec"],
  summary: "Spec 충돌 해결 기록",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            conflictId: z.string(),
            resolution: z.enum(["accept", "reject", "modify"]),
            modifiedValue: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: "해결 기록 완료" },
  },
});

specRoute.openapi(resolveConflictRoute, async (c) => {
  const { conflictId, resolution, modifiedValue } = c.req.valid("json");

  await c.env.DB
    .prepare(
      `UPDATE spec_conflicts
       SET resolution = ?, resolved_at = ?, resolved_by = ?
       WHERE id = ?`,
    )
    .bind(resolution, new Date().toISOString(), c.get("userId") ?? "anonymous", conflictId)
    .run();

  return c.json({ ok: true });
});

// ─── 신규 Endpoint: GET /spec/existing ───

const getExistingSpecsRoute = createRoute({
  method: "get",
  path: "/spec/existing",
  tags: ["Spec"],
  summary: "기존 Spec 목록 조회",
  responses: {
    200: { description: "기존 Spec 목록" },
  },
});

specRoute.openapi(getExistingSpecsRoute, async (c) => {
  const specs = await getExistingSpecs(c.env.DB);
  return c.json(specs);
});
```

### 4.5 Spec 스키마 확장 (`packages/api/src/schemas/spec.ts`)

```typescript
// 기존 스키마에 추가:

export const SpecConflictSchema = z
  .object({
    type: z.enum(["direct", "dependency", "priority", "scope"]),
    severity: z.enum(["critical", "warning", "info"]),
    existingSpec: z.object({
      id: z.string(),
      title: z.string(),
      field: z.string(),
      value: z.string(),
    }),
    newSpec: z.object({
      field: z.string(),
      value: z.string(),
    }),
    description: z.string(),
    suggestion: z.string().optional(),
  })
  .openapi("SpecConflict");

// SpecGenerateResponseSchema 확장:
export const SpecGenerateResponseSchema = z
  .object({
    spec: GeneratedSpecSchema,
    markdown: z.string().describe("Markdown 포맷 명세 문서"),
    confidence: z.number().min(0).max(1).describe("LLM 변환 신뢰도"),
    model: z.string().describe("사용된 LLM 모델명"),
    conflicts: z.array(SpecConflictSchema).default([]).describe("기존 명세와의 충돌 목록"),
  })
  .openapi("SpecGenerateResponse");
```

### 4.6 Spec Generator UI 확장

#### ConflictCard (`packages/web/src/components/feature/ConflictCard.tsx`)

```typescript
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ConflictCardProps {
  conflict: SpecConflict;
  index: number;
  onResolve: (resolution: "accept" | "reject" | "modify") => void;
}

export function ConflictCard({ conflict, index, onResolve }: ConflictCardProps) {
  const severityColor = {
    critical: "border-destructive bg-destructive/10",
    warning: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
    info: "border-blue-500 bg-blue-50 dark:bg-blue-950",
  }[conflict.severity];

  return (
    <Card className={`border-l-4 ${severityColor}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Conflict #{index + 1} ({conflict.severity})
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs">
            {conflict.type}
          </span>
        </div>

        <p className="text-sm">{conflict.description}</p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted p-2">
            <span className="font-medium">기존:</span>{" "}
            {conflict.existingSpec.value}
          </div>
          <div className="rounded bg-muted p-2">
            <span className="font-medium">신규:</span>{" "}
            {conflict.newSpec.value}
          </div>
        </div>

        {conflict.suggestion && (
          <p className="text-xs text-muted-foreground">
            💡 {conflict.suggestion}
          </p>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={() => onResolve("accept")}>수락</Button>
          <Button size="sm" variant="outline" onClick={() => onResolve("reject")}>거절</Button>
          <Button size="sm" variant="ghost" onClick={() => onResolve("modify")}>수정</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### spec-generator/page.tsx 변경

```typescript
// 기존 코드에 추가:
// 1. result.conflicts가 있으면 충돌 섹션 표시
// 2. 각 충돌에 ConflictCard 렌더링
// 3. 모든 충돌 해결 전까지 "최종 확정" 버튼 비활성화
// 4. 충돌 해결 시 POST /spec/conflicts/resolve 호출

// conflicts state:
const [resolvedConflicts, setResolvedConflicts] = useState<Set<number>>(new Set());

// 결과 영역에 충돌 섹션 추가:
{result?.conflicts && result.conflicts.length > 0 && (
  <Card className="lg:col-span-2">
    <CardContent className="p-6">
      <h2 className="mb-4 text-lg font-semibold">
        ⚠️ {result.conflicts.length}건의 충돌이 감지되었습니다
      </h2>
      <div className="space-y-4">
        {result.conflicts.map((conflict, i) => (
          <ConflictCard
            key={i}
            conflict={conflict}
            index={i}
            onResolve={(resolution) => handleResolve(i, resolution)}
          />
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

### 4.7 F54 파일 목록

| 파일 | 변경 유형 | 상세 |
|------|:--------:|------|
| `packages/shared/src/web.ts` | 수정 | SpecConflict, ExistingSpec, ConflictResolution 타입 추가 |
| `packages/api/src/services/conflict-detector.ts` | 신규 | ConflictDetector (2-phase) + getExistingSpecs |
| `packages/api/src/routes/spec.ts` | 수정 | generate에 conflicts 추가, 2 endpoints (resolve, existing) |
| `packages/api/src/schemas/spec.ts` | 수정 | SpecConflictSchema, SpecGenerateResponseSchema 확장 |
| `packages/web/src/components/feature/ConflictCard.tsx` | 신규 | 충돌 카드 컴포넌트 |
| `packages/web/src/app/(app)/spec-generator/page.tsx` | 수정 | 충돌 섹션 + 해결 UI |
| `packages/web/src/lib/api-client.ts` | 수정 | resolveConflict, getExistingSpecs 함수 추가 |

---

## 5. 테스트 전략

### 5.1 테스트 추가 예상

| 카테고리 | 파일 | 테스트 수 |
|---------|------|:--------:|
| ClaudeApiRunner 단위 | `services/claude-api-runner.test.ts` | ~6 |
| MockRunner 단위 | `services/claude-api-runner.test.ts` | ~2 |
| AgentOrchestrator.executeTask | `services/agent-orchestrator.test.ts` | ~5 |
| Agent Route (execute, runners, result) | `agent.test.ts` | ~5 |
| ConflictDetector 단위 | `services/conflict-detector.test.ts` | ~7 |
| Spec Route (conflicts, resolve, existing) | `spec-route.test.ts` | ~5 |
| **합계** | | **~30** |

**Sprint 10 완료 후 예상**: 241 (기존) + ~30 = **~271 tests**

### 5.2 Mock 전략

| 대상 | Mock 방식 |
|------|----------|
| D1 | better-sqlite3 MockD1Database (기존 패턴) |
| Anthropic API | fetch mock — 고정 JSON 응답 반환 |
| LLMService (ConflictDetector) | 직접 mock 주입 — `new ConflictDetector(mockLlm)` |
| AgentRunner | MockRunner 직접 사용 |

### 5.3 핵심 테스트 케이스

```typescript
// ClaudeApiRunner
- execute() → Anthropic API 호출 → 성공 결과 파싱
- execute() → API 에러 → failed 상태 반환
- execute() → 비정상 JSON 응답 → partial 상태 + analysis에 raw text
- isAvailable() → apiKey 존재 → true
- supportsTaskType("code-review") → true
- supportsTaskType("unknown") → false

// AgentOrchestrator.executeTask()
- 정상 실행 → agent_sessions INSERT + agent_tasks INSERT + result UPDATE
- runner 실행 실패 → session status = "failed"
- getTaskResult() → 존재하는 task → task + parsed result
- getTaskResult() → 존재하지 않는 task → null

// ConflictDetector
- detect() → 유사 제목 spec 존재 → direct conflict 반환
- detect() → 의존성 교차 → dependency conflict 반환
- detect() → P0 중복 → priority conflict 반환
- detect() → 충돌 없음 → 빈 배열
- detect() → LLM 사용 가능 → enriched result
- detect() → LLM 실패 → 규칙 기반 결과 유지
- calculateKeywordOverlap() → 정확한 유사도 계산

// Spec Route
- POST /spec/generate → conflicts 포함 응답
- POST /spec/conflicts/resolve → 해결 기록
- GET /spec/existing → 기존 spec 목록
```

---

## 6. 구현 순서 + Agent Teams 위임

### 6.1 Phase 순서

```
Phase A: 프로덕션 실배포 (F52) — 선결과제 ★ Leader 직접
  A1. Cloudflare Dashboard에서 secrets 4개 설정
  A2. D1 migration remote 적용 (0001~0004)
  A3. Workers deploy + smoke test 검증

Phase B: 에이전트 실연동 (F53) — 핵심 ★ W1 위임 가능 (API 계층)
  B1. shared/agent.ts 실행 타입 추가
  B2. agent-runner.ts 인터페이스 + factory
  B3. claude-api-runner.ts + MockRunner 구현
  B4. mcp-adapter.ts 인터페이스 (stub)
  B5. 0005 D1 마이그레이션
  B6. agent-orchestrator.ts executeTask() + getTaskResult()
  B7. schemas/agent.ts Execute/Result Zod 스키마
  B8. routes/agent.ts 3 endpoints 추가
  B9. 테스트: runner + orchestrator + route (~18)

Phase C: NL→Spec 충돌 감지 (F54) — ★ W2 위임 가능
  C1. shared/web.ts 충돌 타입 추가
  C2. conflict-detector.ts 구현
  C3. schemas/spec.ts SpecConflict + Response 확장
  C4. routes/spec.ts 확장 (conflicts + 2 endpoints)
  C5. 테스트: detector + route (~12)

Phase D: 대시보드 UI (F53+F54) — ★ Leader 직접
  D1. AgentExecuteModal.tsx
  D2. AgentTaskResult.tsx
  D3. agents/page.tsx 변경
  D4. ConflictCard.tsx
  D5. spec-generator/page.tsx 변경
  D6. api-client.ts 확장
```

### 6.2 Agent Teams 위임 전략

| Worker | Phase | 범위 | 금지 파일 |
|--------|-------|------|----------|
| **W1** | B (Agent Runner) | `agent-runner.ts`, `claude-api-runner.ts`, `mcp-adapter.ts`, `agent-orchestrator.ts` (executeTask만), `routes/agent.ts`, `schemas/agent.ts`, 관련 테스트 | `packages/web/`, `packages/cli/`, `SPEC.md`, `CLAUDE.md`, `conflict-detector.ts`, `routes/spec.ts` |
| **W2** | C (Conflict Detector) | `conflict-detector.ts`, `schemas/spec.ts`, `routes/spec.ts`, 관련 테스트 | `packages/web/`, `packages/cli/`, `SPEC.md`, `agent-runner.ts`, `routes/agent.ts` |
| **Leader** | A (배포) + D (UI) | secrets, deploy, 대시보드 UI 4파일, `shared/agent.ts`, `shared/web.ts`, api-client.ts, SPEC 관리 | — |

> **shared 파일 규칙**: `shared/agent.ts`, `shared/web.ts`는 Leader만 수정. Worker는 이 파일에서 타입을 import만 함.

---

## 7. 완료 기준 (Success Criteria)

| 항목 | 기준 |
|------|------|
| **F52 배포** | Workers API 프로덕션 URL에서 health OK + auth flow + D1 데이터 조회 정상 |
| **F53 에이전트** | POST /agents/{id}/execute → ClaudeApiRunner로 code-review 실행 → agent_tasks 결과 기록 → SSE 이벤트. GET /agents/runners 3개 반환. GET /agents/tasks/{id}/result 결과 조회. MCP 인터페이스 파일 존재 |
| **F54 충돌 감지** | POST /spec/generate 응답에 conflicts 포함. 유사 제목 spec 입력 시 direct conflict 감지. POST /spec/conflicts/resolve 해결 기록. Spec Generator UI에 ConflictCard 표시 |
| **전체** | typecheck ✅, build ✅, ~271 tests ✅, PDCA Match Rate ≥ 90% |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F52~F54 상세 설계 | Sinclair Seo |
