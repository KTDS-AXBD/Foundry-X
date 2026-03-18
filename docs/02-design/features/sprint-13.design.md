---
code: FX-DSGN-014
title: Sprint 13 (v1.1.0) — MCP Sampling/Prompts + 에이전트 자동 PR 파이프라인 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 1.1.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 13 Design Document

> **Summary**: MCP 1.0 Sampling(서버→클라이언트 LLM 위임)과 Prompts(프롬프트 템플릿 발견/실행)를 기존 McpRunner + LLMService 위에 구현하고, GitHubService를 Branch/PR/Merge API로 확장하여 PrPipelineService + ReviewerAgent 기반의 전체 자동화 PR 파이프라인을 구축한다.
>
> **Project**: Foundry-X
> **Version**: 1.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [sprint-13.plan.md](../../01-plan/features/sprint-13.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **MCP Sampling Handler (F64)**: MCP 서버의 `sampling/createMessage` 요청을 LLMService로 위임 + 보안 게이트(모델 화이트리스트, 토큰 한도, rate limit)
2. **MCP Prompts Client (F64)**: `prompts/list` + `prompts/get` — McpRunner 확장으로 기존 transport 재활용
3. **PR Pipeline Service (F65)**: branch 생성 → 코드 적용 → commit → PR 생성 → 리뷰 → merge 전체 오케스트레이션
4. **Reviewer Agent (F65)**: LLM 기반 PR diff 분석 + SDD Score 정량 계산 + 보안 체크
5. **Auto-Merge (F65)**: CI + SDD Score + Security 다중 게이트 기반 자동 merge 판정
6. **v1.1.0 릴리스 (F66)**: D1 0007 migration + 프로덕션 배포 + E2E 5건

### 1.2 현재 코드 분석

| 파일 | 현재 패턴 | Sprint 13 변경 |
|------|----------|--------------|
| `services/mcp-runner.ts` (190줄) | tools/call 단방향, listTools/listResources | listPrompts/getPrompt 추가, sampling delegate |
| `services/mcp-transport.ts` (269줄) | SSE/HTTP 2종, send(McpMessage) | 변경 없음 — 기존 send() 재활용 |
| `services/mcp-adapter.ts` (83줄) | McpAgentRunner 인터페이스, TASK_TYPE_TO_MCP_TOOL | McpPrompt/McpSamplingRequest 타입 추가 |
| `services/mcp-registry.ts` (154줄) | CRUD + findServerForTool + 도구 캐시 | 변경 없음 |
| `services/github.ts` (106줄) | getFileContent, getCommits, createOrUpdateFile | createBranch, createPR, mergePR, getPrDiff, addLabels, getCheckRuns 추가 |
| `services/agent-orchestrator.ts` (443줄) | executeTask 10-step, selectRunner | createPrFromResult() 옵셔널 후속 호출 추가 |
| `services/sse-manager.ts` (180줄) | 5 이벤트 타입, pushEvent, dedup | agent.pr.* 4 이벤트 추가 |
| `services/llm.ts` (112줄) | Workers AI + Claude fallback | 변경 없음 — Sampling handler가 호출 |
| `routes/mcp.ts` (264줄) | 5 endpoints (CRUD + test + tools) | 4 endpoints 추가 (prompts 2 + sampling 2) |
| `routes/agent.ts` | execute, runners, result | PR 관련 4 endpoints 추가 |
| `schemas/mcp.ts` (34줄) | CreateMcpServer, McpTestResult | McpPrompt, McpSamplingRequest/Response 추가 |
| `schemas/agent.ts` (190줄) | AgentExecuteRequest, ExecutionResult | AgentPr, PrReviewResult 스키마 추가 |
| `shared/agent.ts` (260줄) | 실행/UI/MCP 타입 | McpPrompt, McpSamplingLog, AgentPr, PrReviewResult 타입 추가 |

### 1.3 환경 변경

```typescript
// packages/api/src/env.ts — Sprint 13 변경 없음
// 기존 Bindings 그대로 사용:
// DB, CACHE, AI, ANTHROPIC_API_KEY, GITHUB_TOKEN, JWT_SECRET, GITHUB_REPO
// GITHUB_TOKEN은 이미 Workers secrets에 설정됨 — PR 생성/merge에 필요한 권한 확인 필요
```

**GitHub Token 권한 요구사항**:
- `repo` (full control) — branch 생성, PR 생성/merge, 파일 쓰기
- `workflow` (optional) — CI status 확인

---

## 2. F64: MCP Sampling + Prompts — 상세 설계

### 2.1 MCP Sampling Handler

**파일**: `packages/api/src/services/mcp-sampling.ts` (신규, ~120줄 예상)

MCP Sampling은 MCP 서버가 클라이언트(Foundry-X)에 LLM 호출을 위임하는 역방향 패턴이에요. 기존 `LLMService.generate()`를 재활용해요.

```typescript
import { LLMService, LLMResponse } from './llm';

// ─── 타입 (shared/agent.ts에도 미러) ───

export interface McpSamplingRequest {
  method: 'sampling/createMessage';
  params: {
    messages: McpSamplingMessage[];
    modelPreferences?: {
      hints?: Array<{ name?: string }>;
      costPriority?: number;      // 0-1
      speedPriority?: number;     // 0-1
      intelligencePriority?: number; // 0-1
    };
    systemPrompt?: string;
    includeContext?: 'none' | 'thisServer' | 'allServers';
    maxTokens: number;
  };
}

export interface McpSamplingMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string };
}

export interface McpSamplingResponse {
  role: 'assistant';
  content: { type: 'text'; text: string };
  model: string;
  stopReason?: 'endTurn' | 'stopSequence' | 'maxTokens';
}

// ─── 보안 설정 ───

export interface SamplingSecurityConfig {
  allowedModels: string[];        // 허용 모델 화이트리스트
  maxTokensPerRequest: number;    // 단일 요청 최대 토큰 (기본: 4096)
  maxRequestsPerMinute: number;   // 서버당 분당 제한 (기본: 10)
  maxTotalTokensPerHour: number;  // 서버당 시간당 토큰 (기본: 100000)
}

const DEFAULT_SECURITY: SamplingSecurityConfig = {
  allowedModels: ['claude-haiku-4-5-20250714', '@cf/meta/llama-3.1-8b-instruct'],
  maxTokensPerRequest: 4096,
  maxRequestsPerMinute: 10,
  maxTotalTokensPerHour: 100000,
};

// ─── Handler ───

export class McpSamplingHandler {
  private requestCounts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private llmService: LLMService,
    private db: D1Database,
    private config: SamplingSecurityConfig = DEFAULT_SECURITY
  ) {}

  async handleSamplingRequest(
    serverId: string,
    request: McpSamplingRequest
  ): Promise<McpSamplingResponse> {
    // 1. 보안 검증
    this.validateRequest(serverId, request);
    this.checkRateLimit(serverId);

    // 2. 메시지 변환: McpSamplingMessage[] → LLMService 형식
    const systemPrompt = request.params.systemPrompt || 'You are a helpful assistant.';
    const userPrompt = this.messagesToPrompt(request.params.messages);

    // 3. LLMService 호출 (기존 Workers AI + Claude fallback)
    const startTime = Date.now();
    const llmResponse = await this.llmService.generate(systemPrompt, userPrompt);
    const durationMs = Date.now() - startTime;

    // 4. 이력 기록 (D1)
    await this.logSamplingRequest(serverId, request, llmResponse, durationMs);

    // 5. MCP 응답 형식으로 변환
    return {
      role: 'assistant',
      content: { type: 'text', text: llmResponse.content },
      model: llmResponse.model,
      stopReason: 'endTurn',
    };
  }

  private validateRequest(serverId: string, request: McpSamplingRequest): void {
    const { maxTokens } = request.params;
    if (maxTokens > this.config.maxTokensPerRequest) {
      throw new Error(`maxTokens ${maxTokens} exceeds limit ${this.config.maxTokensPerRequest}`);
    }
    // 텍스트 메시지만 허용 (이미지는 Phase 3+)
    for (const msg of request.params.messages) {
      if (typeof msg.content === 'object' && msg.content.type === 'image') {
        throw new Error('Image sampling is not supported yet');
      }
    }
  }

  private checkRateLimit(serverId: string): void {
    const now = Date.now();
    const entry = this.requestCounts.get(serverId);
    if (entry && now < entry.resetAt) {
      if (entry.count >= this.config.maxRequestsPerMinute) {
        throw new Error(`Rate limit exceeded for server ${serverId}`);
      }
      entry.count++;
    } else {
      this.requestCounts.set(serverId, { count: 1, resetAt: now + 60000 });
    }
  }

  private messagesToPrompt(messages: McpSamplingMessage[]): string {
    return messages
      .map(m => {
        const text = typeof m.content === 'string'
          ? m.content
          : m.content.type === 'text' ? m.content.text : '[image]';
        return `${m.role}: ${text}`;
      })
      .join('\n');
  }

  private async logSamplingRequest(
    serverId: string,
    request: McpSamplingRequest,
    response: LLMResponse,
    durationMs: number
  ): Promise<void> {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.db.prepare(
      `INSERT INTO mcp_sampling_log (id, server_id, model, max_tokens, tokens_used, duration_ms, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'completed', datetime('now'))`
    ).bind(id, serverId, response.model, request.params.maxTokens, response.tokensUsed, durationMs).run();
  }
}
```

**설계 결정 근거**:
- `LLMService`를 직접 재활용하여 Workers AI + Claude fallback을 그대로 활용
- Rate limit은 인메모리 Map (Workers 인스턴스 수명 = 요청 단위이므로, D1 기반으로 전환 필요 시 Phase 3+)
- 이미지 Sampling은 Phase 3+로 이관 (현재 LLMService가 텍스트만 지원)

### 2.2 MCP Prompts Client

**파일**: `packages/api/src/services/mcp-runner.ts` (기존 190줄 → ~250줄)

McpRunner를 확장하여 `prompts/list`와 `prompts/get`을 지원해요. 기존 `send()` 메서드를 재활용:

```typescript
// ─── 타입 (shared/agent.ts + mcp-adapter.ts에 추가) ───

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string } | { type: 'resource'; resource: { uri: string; text: string; mimeType?: string } };
}

// ─── McpRunner 확장 (기존 클래스에 메서드 추가) ───

class McpRunner implements McpAgentRunner {
  // 기존 메서드 유지: execute, listTools, listResources, isAvailable, supportsTaskType

  // 신규: 프롬프트 목록 조회
  async listPrompts(): Promise<McpPrompt[]> {
    const response = await this.transport.send({
      jsonrpc: '2.0',
      method: 'prompts/list',
      id: `prompts-list-${Date.now()}`,
    });
    if (response.error) {
      throw new Error(`MCP prompts/list failed: ${response.error.message}`);
    }
    const result = response.result as { prompts: McpPrompt[] };
    return result.prompts ?? [];
  }

  // 신규: 프롬프트 실행 (인자 전달 → 메시지 배열 반환)
  async getPrompt(name: string, args?: Record<string, string>): Promise<McpPromptMessage[]> {
    const response = await this.transport.send({
      jsonrpc: '2.0',
      method: 'prompts/get',
      params: { name, arguments: args },
      id: `prompts-get-${Date.now()}`,
    });
    if (response.error) {
      throw new Error(`MCP prompts/get failed: ${response.error.message}`);
    }
    const result = response.result as { messages: McpPromptMessage[] };
    return result.messages ?? [];
  }
}
```

**설계 결정 근거**:
- 별도 `McpPromptsClient` 클래스를 만들지 않고 **기존 McpRunner에 메서드 추가** — transport 인스턴스를 공유하므로 연결 관리가 단순
- `McpAgentRunner` 인터페이스도 확장: `listPrompts()`, `getPrompt()` 옵셔널 메서드 추가

### 2.3 MCP Adapter 타입 확장

**파일**: `packages/api/src/services/mcp-adapter.ts` (현재 83줄 → ~110줄)

```typescript
// 기존 McpAgentRunner에 옵셔널 메서드 추가
export interface McpAgentRunner extends AgentRunner {
  readonly type: 'mcp';
  listTools(): Promise<McpTool[]>;
  listResources(): Promise<McpResource[]>;
  // Sprint 13 신규
  listPrompts?(): Promise<McpPrompt[]>;
  getPrompt?(name: string, args?: Record<string, string>): Promise<McpPromptMessage[]>;
}
```

### 2.4 MCP API Routes 확장

**파일**: `packages/api/src/routes/mcp.ts` (현재 264줄 → ~370줄)

4개 endpoint 추가:

```typescript
// GET /mcp/servers/:id/prompts — 서버의 프롬프트 목록
const listPromptsRoute = createRoute({
  method: 'get',
  path: '/mcp/servers/{id}/prompts',
  tags: ['MCP'],
  summary: 'List prompts from MCP server',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({
        prompts: z.array(McpPromptSchema),
        count: z.number(),
      })}},
    },
    404: { description: 'Server not found' },
  },
});

// POST /mcp/servers/:id/prompts/:name — 프롬프트 실행
const getPromptRoute = createRoute({
  method: 'post',
  path: '/mcp/servers/{id}/prompts/{name}',
  tags: ['MCP'],
  summary: 'Execute prompt from MCP server',
  request: {
    params: z.object({ id: z.string(), name: z.string() }),
    body: { content: { 'application/json': { schema: z.object({
      arguments: z.record(z.string()).optional(),
    })}}},
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({
        messages: z.array(McpPromptMessageSchema),
      })}},
    },
  },
});

// POST /mcp/servers/:id/sampling — Sampling 요청 처리 (외부에서 호출)
const samplingRoute = createRoute({
  method: 'post',
  path: '/mcp/servers/{id}/sampling',
  tags: ['MCP'],
  summary: 'Handle MCP sampling request',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: McpSamplingRequestSchema }}},
  },
  responses: {
    200: {
      content: { 'application/json': { schema: McpSamplingResponseSchema }},
    },
    429: { description: 'Rate limit exceeded' },
  },
});

// GET /mcp/sampling/log — Sampling 이력 조회
const samplingLogRoute = createRoute({
  method: 'get',
  path: '/mcp/sampling/log',
  tags: ['MCP'],
  summary: 'Get sampling request history',
  request: {
    query: z.object({
      serverId: z.string().optional(),
      limit: z.coerce.number().default(20),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({
        logs: z.array(McpSamplingLogSchema),
        total: z.number(),
      })}},
    },
  },
});
```

### 2.5 MCP Schemas 확장

**파일**: `packages/api/src/schemas/mcp.ts` (현재 34줄 → ~80줄)

```typescript
// 신규 스키마
export const McpPromptSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  arguments: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
});

export const McpPromptMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.object({ type: z.literal('text'), text: z.string() }),
    z.object({ type: z.literal('resource'), resource: z.object({
      uri: z.string(),
      text: z.string(),
      mimeType: z.string().optional(),
    })}),
  ]),
});

export const McpSamplingRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.union([
      z.object({ type: z.literal('text'), text: z.string() }),
      z.object({ type: z.literal('image'), data: z.string(), mimeType: z.string() }),
    ]),
  })),
  modelPreferences: z.object({
    hints: z.array(z.object({ name: z.string().optional() })).optional(),
    costPriority: z.number().min(0).max(1).optional(),
    speedPriority: z.number().min(0).max(1).optional(),
    intelligencePriority: z.number().min(0).max(1).optional(),
  }).optional(),
  systemPrompt: z.string().optional(),
  maxTokens: z.number().int().min(1).max(8192),
});

export const McpSamplingResponseSchema = z.object({
  role: z.literal('assistant'),
  content: z.object({ type: z.literal('text'), text: z.string() }),
  model: z.string(),
  stopReason: z.enum(['endTurn', 'stopSequence', 'maxTokens']).optional(),
});

export const McpSamplingLogSchema = z.object({
  id: z.string(),
  serverId: z.string(),
  model: z.string(),
  maxTokens: z.number(),
  tokensUsed: z.number().nullable(),
  durationMs: z.number().nullable(),
  status: z.string(),
  createdAt: z.string(),
});
```

### 2.6 MCP UI — Prompts 브라우저

**파일**: `packages/web/src/components/feature/McpPromptsPanel.tsx` (신규, ~100줄)

```typescript
// McpPromptsPanel: workspace/page.tsx의 MCP Servers 탭 내부에 삽입
// 선택된 서버의 프롬프트 목록을 표시하고, 클릭하면 인자 폼 + 실행 결과 표시

interface McpPromptsPanelProps {
  serverId: string;
  serverName: string;
}

// 구조:
// ┌─ Prompts 헤더 ──────────────────────────────────┐
// │ [prompt-name-1]  description...   [Run] 버튼     │
// │ [prompt-name-2]  description...   [Run] 버튼     │
// ├─ 실행 폼 (선택 시 표시) ─────────────────────────┤
// │ arg1: [input]                                    │
// │ arg2: [input]                                    │
// │          [Execute]  [Cancel]                     │
// ├─ 실행 결과 ──────────────────────────────────────┤
// │ role: user/assistant                             │
// │ content: ...                                     │
// └──────────────────────────────────────────────────┘
```

**파일**: `packages/web/src/app/(app)/workspace/page.tsx` (확장)

기존 MCP Servers 탭에 서버 선택 시 하위 탭 추가:
- **Info** (기존): 서버 정보 + 연결 테스트
- **Tools** (기존): 도구 목록
- **Prompts** (신규): McpPromptsPanel
- **Sampling Log** (신규): 해당 서버의 Sampling 이력 테이블

### 2.7 F64 테스트 설계

| 테스트 파일 | 범위 | 건수 |
|------------|------|:----:|
| `mcp-sampling.test.ts` | SamplingHandler — 정상 요청, 보안 검증, rate limit, 이력 기록 | 6 |
| `mcp-prompts.test.ts` | McpRunner.listPrompts/getPrompt — 정상, 에러, 인자 전달 | 5 |
| `mcp-routes-prompts.test.ts` | MCP prompts/sampling endpoints — 4 routes | 4 |
| `McpPromptsPanel.test.tsx` | UI — 프롬프트 목록 렌더, 실행 폼, 결과 표시 | 3 |
| **소계** | | **18** |

---

## 3. F65: 에이전트 자동 PR 파이프라인 — 상세 설계

### 3.1 GitHubService 확장

**파일**: `packages/api/src/services/github.ts` (현재 106줄 → ~250줄)

현재 5개 메서드(getFileContent, getCommits, createOrUpdateFile, getRateLimit, fileExists)에 PR 파이프라인용 6개 메서드를 추가해요:

```typescript
class GitHubService {
  // ─── 기존 메서드 유지 ───

  // ─── Sprint 13 신규: Branch 관리 ───

  /** 기존 브랜치에서 새 브랜치 생성 */
  async createBranch(branchName: string, fromBranch: string = 'master'): Promise<string> {
    // 1. GET /repos/:repo/git/ref/heads/:fromBranch → sha 획득
    // 2. POST /repos/:repo/git/refs → ref: refs/heads/:branchName, sha
    // Returns: commit SHA
  }

  /** 브랜치 삭제 */
  async deleteBranch(branchName: string): Promise<boolean> {
    // DELETE /repos/:repo/git/refs/heads/:branchName
  }

  // ─── Sprint 13 신규: 파일 일괄 커밋 ───

  /** 여러 파일을 한 커밋으로 (Tree API 사용) */
  async createCommitWithFiles(
    branch: string,
    files: Array<{ path: string; content: string; action: 'create' | 'modify' }>,
    message: string
  ): Promise<{ sha: string; url: string }> {
    // 1. GET /repos/:repo/git/ref/heads/:branch → 현재 commit SHA
    // 2. GET /repos/:repo/git/commits/:sha → tree SHA
    // 3. POST /repos/:repo/git/trees → 파일별 blob 생성, base_tree 참조
    // 4. POST /repos/:repo/git/commits → tree + parent commit
    // 5. PATCH /repos/:repo/git/refs/heads/:branch → 새 commit SHA로 업데이트
  }

  // ─── Sprint 13 신규: PR 관리 ───

  /** PR 생성 */
  async createPullRequest(params: {
    title: string;
    body: string;
    head: string;      // source branch
    base: string;      // target branch (기본: master)
    labels?: string[];
  }): Promise<{ number: number; url: string; htmlUrl: string }> {
    // POST /repos/:repo/pulls
    // 이후 labels가 있으면 POST /repos/:repo/issues/:number/labels
  }

  /** PR diff 조회 */
  async getPrDiff(prNumber: number): Promise<string> {
    // GET /repos/:repo/pulls/:number
    // Accept: application/vnd.github.v3.diff
  }

  /** PR merge (squash) */
  async mergePullRequest(prNumber: number, params?: {
    mergeMethod?: 'squash' | 'merge' | 'rebase';
    commitTitle?: string;
    commitMessage?: string;
  }): Promise<{ sha: string; merged: boolean }> {
    // PUT /repos/:repo/pulls/:number/merge
    // merge_method: squash (기본)
  }

  /** PR review 생성 (에이전트 리뷰) */
  async createPrReview(prNumber: number, params: {
    body: string;
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    comments?: Array<{ path: string; position: number; body: string }>;
  }): Promise<{ id: number }> {
    // POST /repos/:repo/pulls/:number/reviews
  }

  /** PR의 CI check 상태 조회 */
  async getCheckRuns(ref: string): Promise<{
    total: number;
    conclusion: 'success' | 'failure' | 'pending' | 'neutral';
    checks: Array<{ name: string; status: string; conclusion: string }>;
  }> {
    // GET /repos/:repo/commits/:ref/check-runs
  }
}
```

**설계 결정 근거**:
- `createOrUpdateFile()`은 단일 파일용 (기존) → `createCommitWithFiles()`는 여러 파일을 **한 커밋**으로 묶음 (Git Tree API 사용)
- PR merge는 squash가 기본 (프로젝트 Git Workflow 설정과 일치)
- PR review API를 통해 에이전트가 GitHub에 리뷰를 직접 남김

### 3.2 PrPipelineService

**파일**: `packages/api/src/services/pr-pipeline.ts` (신규, ~200줄)

```typescript
// ─── 설정 타입 ───

export interface PrPipelineConfig {
  autoMerge: boolean;            // auto-merge 활성화 (기본: true)
  requireHumanApproval: boolean; // 사람 승인 필수 (기본: false)
  maxAutoMergePerDay: number;    // 일일 auto-merge 한도 (기본: 10)
  branchPrefix: string;          // 브랜치 접두사 (기본: 'agent/')
  mergeStrategy: 'squash' | 'merge' | 'rebase'; // 기본: 'squash'
  sddScoreThreshold: number;     // SDD Score 최소 (기본: 80)
  qualityScoreThreshold: number; // Quality Score 최소 (기본: 70)
}

const DEFAULT_CONFIG: PrPipelineConfig = {
  autoMerge: true,
  requireHumanApproval: false,
  maxAutoMergePerDay: 10,
  branchPrefix: 'agent/',
  mergeStrategy: 'squash',
  sddScoreThreshold: 80,
  qualityScoreThreshold: 70,
};

// ─── 결과 타입 ───

export interface AgentPrResult {
  id: string;          // agent_prs.id
  prNumber: number;
  prUrl: string;
  branch: string;
  status: AgentPrStatus;
  reviewResult?: PrReviewResult;
  merged: boolean;
}

export type AgentPrStatus =
  | 'creating'     // branch + commit 진행 중
  | 'open'         // PR 생성 완료
  | 'reviewing'    // ReviewerAgent 리뷰 중
  | 'approved'     // 리뷰 승인
  | 'merged'       // merge 완료
  | 'closed'       // 닫힘 (거부/취소)
  | 'needs_human'; // 사람 리뷰 필요

// ─── 핵심 서비스 ───

export class PrPipelineService {
  constructor(
    private github: GitHubService,
    private reviewer: ReviewerAgent,
    private db: D1Database,
    private sse?: SSEManager,
    private config: PrPipelineConfig = DEFAULT_CONFIG
  ) {}

  /**
   * 전체 PR 파이프라인 실행
   * AgentOrchestrator.executeTask() 완료 후 호출
   */
  async createAgentPr(
    agentId: string,
    taskId: string,
    taskResult: AgentExecutionResult
  ): Promise<AgentPrResult> {
    // 0. generatedCode가 없으면 PR 불필요
    if (!taskResult.output.generatedCode?.length) {
      throw new Error('No generated code to create PR');
    }

    // 1. D1에 agent_prs 레코드 생성 (status: creating)
    const prRecord = await this.createPrRecord(agentId, taskId);

    // 2. Branch 생성
    const branch = `${this.config.branchPrefix}${agentId}/${taskResult.output.generatedCode[0]?.path?.split('/')[0] ?? 'task'}-${Date.now()}`;
    await this.github.createBranch(branch);
    await this.updatePrRecord(prRecord.id, { branch });

    // 3. 코드 적용 + Commit (Tree API로 한 커밋)
    const commitResult = await this.github.createCommitWithFiles(
      branch,
      taskResult.output.generatedCode.map(f => ({
        path: f.path,
        content: f.content,
        action: f.action,
      })),
      `[Agent] ${agentId}: ${taskResult.output.analysis?.substring(0, 72) ?? 'auto-generated code'}`
    );

    // 4. PR 생성
    const pr = await this.github.createPullRequest({
      title: `[Agent] ${agentId}: auto-generated changes`,
      body: this.buildPrBody(agentId, taskId, taskResult),
      head: branch,
      base: 'master',
      labels: ['agent-generated'],
    });
    await this.updatePrRecord(prRecord.id, {
      prNumber: pr.number,
      prUrl: pr.htmlUrl,
      status: 'open',
    });

    // 5. SSE: agent.pr.created
    this.sse?.pushEvent({
      event: 'agent.pr.created' as any,
      data: { prNumber: pr.number, branch, agentId, taskId },
    });

    // 6. Cross-Agent Review
    await this.updatePrRecord(prRecord.id, { status: 'reviewing' });
    const diff = await this.github.getPrDiff(pr.number);
    const reviewResult = await this.reviewer.reviewPullRequest(diff, {
      agentId,
      taskId,
      taskType: 'code-review', // ReviewerAgent always does code-review
      prNumber: pr.number,
    });
    await this.updatePrRecord(prRecord.id, {
      reviewDecision: reviewResult.decision,
      sddScore: reviewResult.sddScore,
      qualityScore: reviewResult.qualityScore,
      securityIssues: JSON.stringify(reviewResult.securityIssues),
      reviewAgentId: 'reviewer-agent',
    });

    // 7. GitHub에 리뷰 코멘트 게시
    await this.github.createPrReview(pr.number, {
      body: reviewResult.summary,
      event: reviewResult.decision === 'approve' ? 'APPROVE'
        : reviewResult.decision === 'request_changes' ? 'REQUEST_CHANGES'
        : 'COMMENT',
      comments: reviewResult.comments.map(c => ({
        path: c.file,
        position: c.line,
        body: `[${c.severity}] ${c.comment}`,
      })),
    });

    // 8. SSE: agent.pr.reviewed
    this.sse?.pushEvent({
      event: 'agent.pr.reviewed' as any,
      data: { prNumber: pr.number, decision: reviewResult.decision, sddScore: reviewResult.sddScore },
    });

    // 9. Auto-Merge 판정
    const mergeResult = await this.checkAndMerge(prRecord.id, pr.number, reviewResult);

    return {
      id: prRecord.id,
      prNumber: pr.number,
      prUrl: pr.htmlUrl,
      branch,
      status: mergeResult.merged ? 'merged' : mergeResult.needsHuman ? 'needs_human' : 'approved',
      reviewResult,
      merged: mergeResult.merged,
    };
  }

  /**
   * Auto-merge 판정 + 실행
   */
  async checkAndMerge(
    prRecordId: string,
    prNumber: number,
    reviewResult: PrReviewResult
  ): Promise<{ merged: boolean; needsHuman: boolean; reason?: string }> {
    // 게이트 1: ReviewerAgent 승인 여부
    if (reviewResult.decision !== 'approve') {
      await this.updatePrRecord(prRecordId, { status: 'needs_human' });
      this.sse?.pushEvent({
        event: 'agent.pr.review_needed' as any,
        data: { prNumber, reason: `Review decision: ${reviewResult.decision}`, blockers: reviewResult.securityIssues },
      });
      return { merged: false, needsHuman: true, reason: 'Review not approved' };
    }

    // 게이트 2: SDD Score
    if (reviewResult.sddScore < this.config.sddScoreThreshold) {
      await this.updatePrRecord(prRecordId, { status: 'needs_human' });
      return { merged: false, needsHuman: true, reason: `SDD Score ${reviewResult.sddScore} < ${this.config.sddScoreThreshold}` };
    }

    // 게이트 3: Quality Score
    if (reviewResult.qualityScore < this.config.qualityScoreThreshold) {
      await this.updatePrRecord(prRecordId, { status: 'needs_human' });
      return { merged: false, needsHuman: true, reason: `Quality Score ${reviewResult.qualityScore} < ${this.config.qualityScoreThreshold}` };
    }

    // 게이트 4: Security Issues (critical/high = 0)
    const criticalIssues = reviewResult.securityIssues.filter(i => i.includes('critical') || i.includes('high'));
    if (criticalIssues.length > 0) {
      await this.updatePrRecord(prRecordId, { status: 'needs_human' });
      return { merged: false, needsHuman: true, reason: `${criticalIssues.length} critical/high security issues` };
    }

    // 게이트 5: CI 상태 확인
    const checks = await this.github.getCheckRuns(`pull/${prNumber}/head`);
    if (checks.conclusion !== 'success' && checks.conclusion !== 'neutral') {
      await this.updatePrRecord(prRecordId, { status: 'needs_human' });
      return { merged: false, needsHuman: true, reason: `CI checks: ${checks.conclusion}` };
    }

    // 게이트 6: 일일 한도
    const todayMergeCount = await this.getTodayMergeCount();
    if (todayMergeCount >= this.config.maxAutoMergePerDay) {
      await this.updatePrRecord(prRecordId, { status: 'needs_human' });
      return { merged: false, needsHuman: true, reason: 'Daily auto-merge limit reached' };
    }

    // 게이트 7: 사람 승인 필수 여부
    if (this.config.requireHumanApproval) {
      await this.updatePrRecord(prRecordId, { status: 'approved' });
      return { merged: false, needsHuman: true, reason: 'Human approval required' };
    }

    // 모든 게이트 통과 → Merge
    const mergeResult = await this.github.mergePullRequest(prNumber, {
      mergeMethod: this.config.mergeStrategy,
      commitTitle: `[Auto-merge] PR #${prNumber}`,
    });

    if (mergeResult.merged) {
      await this.updatePrRecord(prRecordId, {
        status: 'merged',
        commitSha: mergeResult.sha,
        mergedAt: new Date().toISOString(),
      });
      // Branch 자동 삭제
      await this.github.deleteBranch(prRecordId).catch(() => {}); // 실패해도 무시
      // SSE
      this.sse?.pushEvent({
        event: 'agent.pr.merged' as any,
        data: { prNumber, mergedAt: new Date().toISOString(), commitSha: mergeResult.sha },
      });
    }

    return { merged: mergeResult.merged, needsHuman: false };
  }

  // ─── 헬퍼 메서드 ───

  private buildPrBody(agentId: string, taskId: string, result: AgentExecutionResult): string {
    const files = result.output.generatedCode?.map(f => `- \`${f.path}\` (${f.action})`).join('\n') ?? 'No files';
    return `## Agent-Generated PR

**Agent**: ${agentId}
**Task**: ${taskId}
**Status**: ${result.status}
**Model**: ${result.model}
**Tokens**: ${result.tokensUsed}

### Changed Files
${files}

### Analysis
${result.output.analysis?.substring(0, 500) ?? 'N/A'}

---
🤖 This PR was automatically generated by Foundry-X Agent Pipeline.
`;
  }

  private async createPrRecord(agentId: string, taskId: string): Promise<{ id: string }> {
    const id = crypto.randomUUID().replace(/-/g, '');
    const repo = this.github['repo']; // access private for record
    await this.db.prepare(
      `INSERT INTO agent_prs (id, agent_id, task_id, repo, branch, status, merge_strategy, created_at, updated_at)
       VALUES (?, ?, ?, ?, '', 'creating', ?, datetime('now'), datetime('now'))`
    ).bind(id, agentId, taskId, repo, this.config.mergeStrategy).run();
    return { id };
  }

  private async updatePrRecord(id: string, updates: Record<string, any>): Promise<void> {
    const sets = Object.keys(updates).map(k => `${this.toSnakeCase(k)} = ?`).join(', ');
    const values = Object.values(updates);
    await this.db.prepare(
      `UPDATE agent_prs SET ${sets}, updated_at = datetime('now') WHERE id = ?`
    ).bind(...values, id).run();
  }

  private toSnakeCase(s: string): string {
    return s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
  }

  private async getTodayMergeCount(): Promise<number> {
    const result = await this.db.prepare(
      `SELECT COUNT(*) as count FROM agent_prs WHERE status = 'merged' AND merged_at >= date('now')`
    ).first<{ count: number }>();
    return result?.count ?? 0;
  }
}
```

### 3.3 ReviewerAgent

**파일**: `packages/api/src/services/reviewer-agent.ts` (신규, ~150줄)

```typescript
import { LLMService } from './llm';

export interface PrReviewContext {
  agentId: string;
  taskId: string;
  taskType: string;
  prNumber: number;
}

export interface PrReviewResult {
  decision: 'approve' | 'request_changes' | 'comment';
  summary: string;
  comments: PrReviewComment[];
  sddScore: number;        // 0-100: Spec↔Code↔Test 정합성
  qualityScore: number;    // 0-100: 코드 품질
  securityIssues: string[];
}

export interface PrReviewComment {
  file: string;
  line: number;
  comment: string;
  severity: 'error' | 'warning' | 'info';
}

const REVIEW_SYSTEM_PROMPT = `You are a senior code reviewer for the Foundry-X project.
Review the given PR diff and provide a structured analysis.

Return JSON with this exact structure:
{
  "decision": "approve" | "request_changes" | "comment",
  "summary": "1-3 sentence review summary",
  "comments": [
    { "file": "path/to/file.ts", "line": 10, "comment": "Issue description", "severity": "error|warning|info" }
  ],
  "sddScore": 0-100,
  "qualityScore": 0-100,
  "securityIssues": ["issue description if any"]
}

SDD Score criteria (Spec ↔ Code ↔ Test triangle):
- 90-100: Code matches spec, tests cover core paths
- 70-89: Minor drift between spec and code
- 50-69: Significant gaps
- 0-49: Major disconnect

Quality Score criteria:
- 90-100: Clean, well-structured, proper error handling
- 70-89: Minor style/naming issues
- 50-69: Missing error handling or unclear logic
- 0-49: Significant quality issues

Security check:
- SQL injection, XSS, command injection, hardcoded secrets
- Report severity as "critical:...", "high:...", "medium:...", "low:..."`;

export class ReviewerAgent {
  constructor(private llmService: LLMService) {}

  async reviewPullRequest(
    diff: string,
    context: PrReviewContext
  ): Promise<PrReviewResult> {
    const userPrompt = `Review this PR diff for agent ${context.agentId} (task: ${context.taskType}, PR #${context.prNumber}):

\`\`\`diff
${diff.substring(0, 15000)}
\`\`\`

${diff.length > 15000 ? `(diff truncated: ${diff.length} chars total)` : ''}`;

    const response = await this.llmService.generate(REVIEW_SYSTEM_PROMPT, userPrompt);

    try {
      const result = JSON.parse(response.content) as PrReviewResult;
      // 값 범위 보정
      result.sddScore = Math.max(0, Math.min(100, result.sddScore ?? 50));
      result.qualityScore = Math.max(0, Math.min(100, result.qualityScore ?? 50));
      result.securityIssues = result.securityIssues ?? [];
      result.comments = result.comments ?? [];
      result.decision = result.decision ?? 'comment';
      result.summary = result.summary ?? 'Review completed';
      return result;
    } catch {
      // JSON 파싱 실패 시 기본 결과
      return {
        decision: 'comment',
        summary: 'Review could not be parsed: ' + response.content.substring(0, 200),
        comments: [],
        sddScore: 50,
        qualityScore: 50,
        securityIssues: [],
      };
    }
  }
}
```

**설계 결정 근거**:
- `LLMService`를 재활용하여 Workers AI + Claude fallback 그대로 활용
- diff가 15000자를 초과하면 truncate — LLM 컨텍스트 한계 대응
- JSON 파싱 실패 시 안전한 기본값 반환 (파이프라인 중단 방지)

### 3.4 Agent Routes 확장

**파일**: `packages/api/src/routes/agent.ts` (확장, +4 endpoints)

```typescript
// POST /agent/pr — 에이전트 PR 생성 요청
const createAgentPrRoute = createRoute({
  method: 'post',
  path: '/agent/pr',
  tags: ['Agent'],
  summary: 'Create agent PR from task result',
  request: {
    body: { content: { 'application/json': { schema: z.object({
      agentId: z.string(),
      taskId: z.string(),
      config: PrPipelineConfigSchema.optional(),
    })}}},
  },
  responses: {
    201: { content: { 'application/json': { schema: AgentPrResultSchema }}},
    400: { description: 'No generated code in task result' },
    404: { description: 'Task not found' },
  },
});

// GET /agent/pr/:id — PR 상태 조회
const getAgentPrRoute = createRoute({
  method: 'get',
  path: '/agent/pr/{id}',
  tags: ['Agent'],
  summary: 'Get agent PR status',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: AgentPrRecordSchema }}},
    404: { description: 'PR not found' },
  },
});

// POST /agent/pr/:id/review — cross-agent 리뷰 실행 (재실행용)
const reviewAgentPrRoute = createRoute({
  method: 'post',
  path: '/agent/pr/{id}/review',
  tags: ['Agent'],
  summary: 'Run cross-agent review on PR',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: PrReviewResultSchema }}},
    404: { description: 'PR not found' },
  },
});

// POST /agent/pr/:id/merge — auto-merge 실행 (수동 트리거)
const mergeAgentPrRoute = createRoute({
  method: 'post',
  path: '/agent/pr/{id}/merge',
  tags: ['Agent'],
  summary: 'Merge agent PR (manual trigger)',
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: z.object({
      merged: z.boolean(),
      sha: z.string().optional(),
      reason: z.string().optional(),
    })}}},
    404: { description: 'PR not found' },
  },
});
```

### 3.5 SSE 이벤트 확장

**파일**: `packages/api/src/services/sse-manager.ts` (180줄 → ~210줄)

기존 5개 이벤트에 4개 추가:

```typescript
// ─── 신규 이벤트 데이터 타입 ───

export interface PrCreatedData {
  prNumber: number;
  branch: string;
  agentId: string;
  taskId: string;
}

export interface PrReviewedData {
  prNumber: number;
  decision: 'approve' | 'request_changes' | 'comment';
  sddScore: number;
  reviewerAgentId: string;
}

export interface PrMergedData {
  prNumber: number;
  mergedAt: string;
  commitSha: string;
}

export interface PrReviewNeededData {
  prNumber: number;
  reason: string;
  blockers: string[];
}

// ─── SSEEvent 유니온 확장 ───
type SSEEvent =
  | { event: 'activity'; data: AgentActivityData }
  | { event: 'status'; data: AgentStatusData }
  | { event: 'error'; data: AgentErrorData }
  | { event: 'agent.task.started'; data: TaskStartedData }
  | { event: 'agent.task.completed'; data: TaskCompletedData }
  | { event: 'agent.pr.created'; data: PrCreatedData }       // Sprint 13
  | { event: 'agent.pr.reviewed'; data: PrReviewedData }     // Sprint 13
  | { event: 'agent.pr.merged'; data: PrMergedData }         // Sprint 13
  | { event: 'agent.pr.review_needed'; data: PrReviewNeededData } // Sprint 13
```

### 3.6 AgentOrchestrator 확장

**파일**: `packages/api/src/services/agent-orchestrator.ts` (443줄 → ~480줄)

`executeTask()`에 옵셔널 PR 파이프라인 연결:

```typescript
class AgentOrchestrator {
  // 기존 constructor에 prPipeline 추가
  constructor(
    private db: D1Database,
    private sse?: SSEManager,
    private mcpRegistry?: McpServerRegistry,
    private prPipeline?: PrPipelineService  // Sprint 13 신규 (옵셔널)
  ) {}

  // executeTask()의 기존 흐름은 변경 없음
  // 신규 메서드 추가:

  /**
   * 작업 실행 + PR 생성 (전체 파이프라인)
   * executeTask() 완료 후 generatedCode가 있으면 자동으로 PR 생성
   */
  async executeTaskWithPr(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionContext,
    runner: AgentRunner,
    prConfig?: Partial<PrPipelineConfig>
  ): Promise<{ result: AgentExecutionResult; pr?: AgentPrResult }> {
    // 1. 기존 executeTask() 실행
    const result = await this.executeTask(agentId, taskType, context, runner);

    // 2. generatedCode가 있고, prPipeline이 설정되어 있으면 PR 생성
    if (result.output.generatedCode?.length && this.prPipeline) {
      try {
        const pr = await this.prPipeline.createAgentPr(agentId, result.output.generatedCode[0]?.path ?? 'unknown', result);
        return { result, pr };
      } catch (error) {
        // PR 생성 실패해도 작업 결과는 반환
        return { result };
      }
    }

    return { result };
  }
}
```

### 3.7 대시보드 UI

#### AgentPrCard.tsx (신규, ~80줄)

```typescript
// packages/web/src/components/feature/AgentPrCard.tsx
interface AgentPrCardProps {
  pr: {
    id: string;
    prNumber: number;
    prUrl: string;
    branch: string;
    status: AgentPrStatus;
    sddScore?: number;
    qualityScore?: number;
    securityIssues?: string[];
    reviewDecision?: string;
    mergedAt?: string;
    createdAt: string;
  };
  onMerge?: (id: string) => void;
  onReview?: (id: string) => void;
}

// 구조:
// ┌─ PR #123 ─────────────────────────────────────┐
// │ agent/claude-1/code-gen-1234567890              │
// │                                                 │
// │ Status: [merged ✅ | reviewing 🔄 | needs_human ⚠️] │
// │ SDD: 85/100  Quality: 90/100  Security: 0 issues│
// │                                                 │
// │ [View on GitHub]  [Re-review]  [Merge]         │
// └─────────────────────────────────────────────────┘
```

#### PrReviewPanel.tsx (신규, ~70줄)

```typescript
// 리뷰 상세 패널 — AgentPrCard 확장 시 표시
// ┌─ Review Result ──────────────────────────────┐
// │ Decision: approve ✅                          │
// │ Summary: "Code follows existing patterns..." │
// │                                               │
// │ Comments (3):                                 │
// │ ├─ [error] mcp-runner.ts:45 — ...            │
// │ ├─ [warning] github.ts:120 — ...             │
// │ └─ [info] agent.ts:30 — ...                  │
// │                                               │
// │ Security Issues: None                         │
// └───────────────────────────────────────────────┘
```

#### AutoMergeSettings.tsx (신규, ~60줄)

```typescript
// agents/page.tsx 상단에 설정 토글
// ┌─ Auto-Merge Settings ──────────────────────┐
// │ [✓] Enable auto-merge                       │
// │ [✗] Require human approval                  │
// │ Max daily merges: [10]                       │
// │ SDD threshold: [80]                          │
// │ Quality threshold: [70]                      │
// │                    [Save Settings]           │
// └──────────────────────────────────────────────┘
```

### 3.8 F65 테스트 설계

| 테스트 파일 | 범위 | 건수 |
|------------|------|:----:|
| `pr-pipeline.test.ts` | PrPipelineService — 파이프라인 전체, 게이트 판정, 에러 | 8 |
| `reviewer-agent.test.ts` | ReviewerAgent — 리뷰 실행, JSON 파싱, 점수 보정 | 6 |
| `github-pr.test.ts` | GitHubService 확장 — createBranch, createPR, merge, diff | 4 |
| `agent-pr-routes.test.ts` | PR 관련 4 endpoints | 4 |
| `AgentPrCard.test.tsx` | UI — 상태 표시, 버튼 동작 | 3 |
| **소계** | | **25** |

---

## 4. D1 Migration — 0007

**파일**: `packages/api/migrations/0007_agent_pr_and_sampling.sql`

```sql
-- Sprint 13: agent_prs + mcp_sampling_log

-- 에이전트 PR 추적 테이블
CREATE TABLE IF NOT EXISTS agent_prs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_id TEXT REFERENCES agent_tasks(id),
  repo TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT '',
  pr_number INTEGER,
  pr_url TEXT,
  status TEXT NOT NULL DEFAULT 'creating',
  review_agent_id TEXT,
  review_decision TEXT,
  sdd_score INTEGER,
  quality_score INTEGER,
  security_issues TEXT,
  merge_strategy TEXT DEFAULT 'squash',
  merged_at TEXT,
  commit_sha TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_prs_status ON agent_prs(status);
CREATE INDEX IF NOT EXISTS idx_agent_prs_agent ON agent_prs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_prs_merged_at ON agent_prs(merged_at);

-- MCP Sampling 이력 테이블
CREATE TABLE IF NOT EXISTS mcp_sampling_log (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL REFERENCES mcp_servers(id),
  model TEXT NOT NULL,
  max_tokens INTEGER NOT NULL,
  tokens_used INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sampling_log_server ON mcp_sampling_log(server_id);
CREATE INDEX IF NOT EXISTS idx_sampling_log_created ON mcp_sampling_log(created_at);
```

**총 테이블**: 11 (기존) + 2 = **13개**

---

## 5. Shared Types 확장

**파일**: `packages/shared/src/agent.ts` (260줄 → ~330줄)

```typescript
// ─── F64: MCP Sampling/Prompts ───

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpSamplingLog {
  id: string;
  serverId: string;
  model: string;
  maxTokens: number;
  tokensUsed: number | null;
  durationMs: number | null;
  status: string;
  createdAt: string;
}

// ─── F65: Agent PR ───

export type AgentPrStatus =
  | 'creating' | 'open' | 'reviewing' | 'approved'
  | 'merged' | 'closed' | 'needs_human';

export interface AgentPr {
  id: string;
  agentId: string;
  taskId: string;
  repo: string;
  branch: string;
  prNumber: number | null;
  prUrl: string | null;
  status: AgentPrStatus;
  reviewAgentId: string | null;
  reviewDecision: string | null;
  sddScore: number | null;
  qualityScore: number | null;
  securityIssues: string[];
  mergeStrategy: string;
  mergedAt: string | null;
  commitSha: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrReviewResult {
  decision: 'approve' | 'request_changes' | 'comment';
  summary: string;
  comments: PrReviewComment[];
  sddScore: number;
  qualityScore: number;
  securityIssues: string[];
}

export interface PrReviewComment {
  file: string;
  line: number;
  comment: string;
  severity: 'error' | 'warning' | 'info';
}
```

---

## 6. Implementation Order

```
Phase A: MCP Sampling + Prompts (F64) — 독립 구현 가능
  A1. shared/agent.ts — McpPrompt, McpSamplingLog 타입 추가
  A2. mcp-adapter.ts — McpAgentRunner에 listPrompts/getPrompt 옵셔널 추가
  A3. mcp-runner.ts — listPrompts(), getPrompt() 메서드 구현
  A4. mcp-sampling.ts — McpSamplingHandler 신규 (LLMService 연동)
  A5. schemas/mcp.ts — McpPrompt, Sampling 스키마 추가
  A6. routes/mcp.ts — 4 endpoints (prompts 2 + sampling 2)
  A7. D1 migration 0007 — mcp_sampling_log 테이블
  A8. McpPromptsPanel.tsx — Prompts 브라우저 UI
  A9. workspace/page.tsx — Prompts 탭 + Sampling 이력
  A10. api-client.ts — MCP prompts/sampling API 함수
  A11. 테스트: 18건

Phase B: 에이전트 자동 PR (F65) — A와 병렬 가능
  B1. shared/agent.ts — AgentPr, PrReviewResult 타입 추가 (A1과 같은 파일이지만 섹션 분리)
  B2. github.ts — createBranch, createCommitWithFiles, createPR, mergePR, getPrDiff, createPrReview, getCheckRuns, deleteBranch 추가
  B3. reviewer-agent.ts — ReviewerAgent 신규 (LLMService 연동)
  B4. pr-pipeline.ts — PrPipelineService 신규
  B5. schemas/agent.ts — AgentPr, PrReview 스키마 추가
  B6. routes/agent.ts — PR 관련 4 endpoints
  B7. sse-manager.ts — agent.pr.* 이벤트 4종
  B8. agent-orchestrator.ts — prPipeline 주입 + executeTaskWithPr()
  B9. D1 migration 0007 — agent_prs 테이블 (A7과 합쳐서 하나의 migration)
  B10. AgentPrCard.tsx, PrReviewPanel.tsx, AutoMergeSettings.tsx
  B11. agents/page.tsx — PR 상태 + SSE agent.pr.* 핸들링
  B12. api-client.ts — PR API 함수
  B13. 테스트: 25건

Phase C: 릴리스 + 안정화 (F66) — A+B 완료 후
  C1. CHANGELOG v1.1.0
  C2. version bump (root, api, web)
  C3. D1 migration 0007 remote 적용
  C4. Workers + Pages 배포
  C5. Smoke test
  C6. E2E — agent-pr.spec.ts (3건), mcp-prompts.spec.ts (2건)
  C7. SPEC.md + CLAUDE.md 갱신
  C8. git tag v1.1.0

Phase A와 B는 병렬 가능:
- 공유 파일: shared/agent.ts (섹션 분리), D1 migration (하나로 통합)
- 완전 분리: MCP 서비스 vs PR 서비스 (경로 충돌 없음)
```

---

## 7. Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| W1 (MCP) | `mcp-sampling.ts`, `mcp-runner.ts` 확장, `routes/mcp.ts` 확장, `schemas/mcp.ts`, `McpPromptsPanel.tsx`, `mcp-*.test.ts` | `pr-pipeline.ts`, `reviewer-agent.ts`, `routes/agent.ts`, `AgentPrCard.tsx` |
| W2 (PR) | `pr-pipeline.ts`, `reviewer-agent.ts`, `github.ts` 확장, `routes/agent.ts` PR endpoints, `schemas/agent.ts` PR 스키마, `AgentPrCard.tsx`, `PrReviewPanel.tsx`, `pr-*.test.ts`, `reviewer-*.test.ts`, `github-pr.test.ts` | `mcp-sampling.ts`, `mcp-prompts.ts`, `routes/mcp.ts`, `McpPromptsPanel.tsx` |
| Leader | `shared/agent.ts` 타입 (양쪽 타입 통합), D1 migration 0007, `sse-manager.ts` 이벤트, `agent-orchestrator.ts` 확장, `AutoMergeSettings.tsx`, `agents/page.tsx` 통합, `workspace/page.tsx` 탭, `api-client.ts`, SPEC/CLAUDE.md, 릴리스, E2E, 통합 검증 | — |

---

## 8. 전체 산출물 요약

| 카테고리 | 신규 파일 | 수정 파일 | 테스트 |
|---------|:--------:|:--------:|:------:|
| F64 MCP Sampling/Prompts | 2 (mcp-sampling.ts, McpPromptsPanel.tsx) | 6 (mcp-runner.ts, mcp-adapter.ts, routes/mcp.ts, schemas/mcp.ts, workspace/page.tsx, api-client.ts) | 18 |
| F65 PR Pipeline | 4 (pr-pipeline.ts, reviewer-agent.ts, AgentPrCard.tsx, PrReviewPanel.tsx) | 8 (github.ts, routes/agent.ts, schemas/agent.ts, agent-orchestrator.ts, sse-manager.ts, agents/page.tsx, AutoMergeSettings.tsx, api-client.ts) | 25 |
| F66 릴리스 | 2 (E2E specs) | 5 (CHANGELOG, package.json ×3, SPEC.md, CLAUDE.md) | 10 |
| 공유 | 1 (D1 migration 0007) | 1 (shared/agent.ts) | — |
| **합계** | **9** | **20** | **53** |

**Sprint 13 완료 후**:
- Tests: 354 + 53 = **~407**
- E2E: 20 + 5 = **25 specs**
- API endpoints: 33 + 8 = **41개**
- API services: 14 + 3 = **17개** (McpSamplingHandler, PrPipelineService, ReviewerAgent)
- D1 tables: 11 + 2 = **13개**

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F64~F66 상세 설계 (MCP Sampling/Prompts + PR Pipeline + v1.1.0) | Sinclair Seo |
