---
code: FX-DSGN-013
title: Sprint 12 Stabilization Design — MCP 실 구현 + v1.0.0 릴리스 + 테스트 보강
version: 0.1
status: Draft
category: DSGN
system-version: 0.12.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
references:
  - "[[FX-PLAN-013]]"
  - "[[FX-DSGN-012]]"
---

# Sprint 12 Stabilization Design Document

> **Reference**: [[FX-PLAN-013]] Sprint 12 Stabilization Plan
> **Prerequisite Design**: [[FX-DSGN-012]] MCP 프로토콜 연동 설계 (Sprint 11)

---

## 1. F61: MCP 실 구현 — 상세 설계

### 1.1 Transport Layer

#### 1.1.1 McpTransport 인터페이스 (기존, mcp-adapter.ts)

```typescript
// 기존 정의 — 변경 없음, 구현체만 추가
export interface McpTransport {
  readonly type: 'stdio' | 'sse' | 'http';
  connect?(): Promise<void>;
  send(message: McpMessage): Promise<McpResponse>;
  disconnect?(): Promise<void>;
}

export interface McpMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
```

#### 1.1.2 SseTransport 구현

```typescript
// packages/api/src/services/mcp-transport.ts (신규)

interface SseTransportConfig {
  serverUrl: string;      // MCP 서버 SSE 엔드포인트 (GET, SSE 스트림)
  messageUrl: string;     // MCP 서버 메시지 엔드포인트 (POST, JSON-RPC)
  apiKey?: string;        // Bearer 인증
  timeoutMs?: number;     // 요청 타임아웃 (기본 25000, Workers 30초 제한 고려)
}

export class SseTransport implements McpTransport {
  readonly type = 'sse' as const;
  private sessionId: string | null = null;
  private connected = false;

  constructor(private config: SseTransportConfig) {}

  /**
   * SSE 엔드포인트에 연결하여 세션 ID를 획득.
   * Workers에서는 EventSource 미지원 → fetch + ReadableStream으로 구현.
   *
   * 흐름:
   * 1. GET serverUrl → SSE 스트림 시작
   * 2. 첫 번째 이벤트에서 endpoint URL 추출 (MCP 1.0 규약)
   * 3. endpoint URL에서 세션 ID 추출 → messageUrl에 사용
   */
  async connect(): Promise<void> {
    const response = await fetch(this.config.serverUrl, {
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 25000),
    });

    if (!response.ok) {
      throw new McpTransportError(`SSE connect failed: ${response.status}`);
    }

    // SSE 스트림에서 endpoint 이벤트 파싱
    const reader = response.body?.getReader();
    if (!reader) throw new McpTransportError('No response body');

    const { sessionId } = await this.parseEndpointEvent(reader);
    this.sessionId = sessionId;
    this.connected = true;

    // 스트림 리더 해제 (Workers에서 장시간 유지 불가)
    reader.cancel();
  }

  /**
   * JSON-RPC 메시지 전송.
   * POST messageUrl + sessionId 쿼리 파라미터.
   */
  async send(message: McpMessage): Promise<McpResponse> {
    if (!this.connected || !this.sessionId) {
      await this.connect(); // 자동 재연결
    }

    const url = `${this.config.messageUrl}?sessionId=${this.sessionId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...this.buildHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 25000),
    });

    if (!response.ok) {
      throw new McpTransportError(`MCP send failed: ${response.status}`);
    }

    return response.json() as Promise<McpResponse>;
  }

  async disconnect(): Promise<void> {
    this.sessionId = null;
    this.connected = false;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'text/event-stream' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  /**
   * SSE 스트림에서 endpoint 이벤트를 파싱하여 세션 ID 추출.
   * MCP 1.0 규약: 첫 이벤트가 "endpoint" 타입이고 URL을 포함.
   */
  private async parseEndpointEvent(
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<{ sessionId: string }> {
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new McpTransportError('SSE stream ended before endpoint event');

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          try {
            const parsed = JSON.parse(data);
            if (parsed.endpoint) {
              const url = new URL(parsed.endpoint, this.config.serverUrl);
              const sessionId = url.searchParams.get('sessionId');
              if (sessionId) return { sessionId };
            }
          } catch { /* not JSON yet, continue */ }
        }
      }
    }
  }
}

export class McpTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpTransportError';
  }
}
```

#### 1.1.3 HttpTransport 구현

```typescript
// packages/api/src/services/mcp-transport.ts (동일 파일)

interface HttpTransportConfig {
  serverUrl: string;     // MCP 서버 HTTP 엔드포인트
  apiKey?: string;
  timeoutMs?: number;
}

export class HttpTransport implements McpTransport {
  readonly type = 'http' as const;

  constructor(private config: HttpTransportConfig) {}

  /**
   * 단순 POST 요청-응답.
   * SSE 세션 없이 매 요청이 독립적.
   */
  async send(message: McpMessage): Promise<McpResponse> {
    const response = await fetch(this.config.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 25000),
    });

    if (!response.ok) {
      throw new McpTransportError(`HTTP send failed: ${response.status}`);
    }

    return response.json() as Promise<McpResponse>;
  }
}
```

#### 1.1.4 TransportFactory

```typescript
// packages/api/src/services/mcp-transport.ts (동일 파일)

export function createTransport(
  type: 'sse' | 'http',
  config: { serverUrl: string; apiKey?: string }
): McpTransport {
  if (type === 'sse') {
    // MCP 규약: SSE 서버는 GET endpoint + POST message endpoint
    return new SseTransport({
      serverUrl: config.serverUrl,
      messageUrl: config.serverUrl,  // 동일 URL, MCP 서버가 GET/POST 분기
      apiKey: config.apiKey,
    });
  }
  return new HttpTransport(config);
}
```

---

### 1.2 McpRunner (McpAgentRunner 구현)

```typescript
// packages/api/src/services/mcp-runner.ts (신규)

import type { McpAgentRunner, McpTool, McpResource, McpTransport } from './mcp-adapter';
import type { AgentExecutionRequest, AgentExecutionResult } from '../../shared/src/agent';
import { TASK_TYPE_TO_MCP_TOOL } from './mcp-adapter';

export class McpRunner implements McpAgentRunner {
  readonly type = 'mcp' as const;

  constructor(
    private transport: McpTransport,
    private serverName: string
  ) {}

  /**
   * AgentRunner.execute() 구현.
   * AgentExecutionRequest → MCP tools/call → AgentExecutionResult 변환.
   */
  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const toolName = TASK_TYPE_TO_MCP_TOOL[request.taskType];

    if (!toolName) {
      return {
        status: 'failed',
        output: { analysis: `Unknown task type: ${request.taskType}` },
        tokensUsed: 0,
        model: `mcp:${this.serverName}`,
        duration: Date.now() - startTime,
      };
    }

    try {
      // MCP tools/call 요청
      const response = await this.transport.send({
        jsonrpc: '2.0',
        id: request.taskId ?? crypto.randomUUID(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: this.buildToolArguments(request),
        },
      });

      if (response.error) {
        return {
          status: 'failed',
          output: { analysis: `MCP error: ${response.error.message}` },
          tokensUsed: 0,
          model: `mcp:${this.serverName}`,
          duration: Date.now() - startTime,
        };
      }

      // MCP 응답 → AgentExecutionResult 변환
      return this.parseToolResult(response.result, request, startTime);
    } catch (error) {
      return {
        status: 'failed',
        output: {
          analysis: `MCP transport error: ${error instanceof Error ? error.message : 'unknown'}`,
        },
        tokensUsed: 0,
        model: `mcp:${this.serverName}`,
        duration: Date.now() - startTime,
      };
    }
  }

  async listTools(): Promise<McpTool[]> {
    const response = await this.transport.send({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/list',
    });

    if (response.error) return [];
    const result = response.result as { tools?: McpTool[] };
    return result?.tools ?? [];
  }

  async listResources(): Promise<McpResource[]> {
    const response = await this.transport.send({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'resources/list',
    });

    if (response.error) return [];
    const result = response.result as { resources?: McpResource[] };
    return result?.resources ?? [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      const tools = await this.listTools();
      return tools.length > 0;
    } catch {
      return false;
    }
  }

  supportsCapability(cap: string): boolean {
    // MCP runner는 모든 taskType 지원 (tool 매핑이 있는 한)
    return cap in TASK_TYPE_TO_MCP_TOOL;
  }

  /**
   * AgentExecutionRequest.context → MCP tool arguments 변환.
   * 각 taskType별로 다른 argument 구조 생성.
   */
  private buildToolArguments(
    request: AgentExecutionRequest
  ): Record<string, unknown> {
    const base = {
      repository: request.context.repository,
      branch: request.context.branch,
    };

    switch (request.taskType) {
      case 'code-review':
        return { ...base, files: request.context.files, spec: request.context.spec };
      case 'code-generation':
        return { ...base, spec: request.context.spec, instructions: request.context.instructions };
      case 'spec-analysis':
        return { ...base, newSpec: request.context.newSpec, existing: request.context.existing };
      case 'test-generation':
        return { ...base, files: request.context.files, spec: request.context.spec };
      default:
        return base;
    }
  }

  /**
   * MCP tool 응답 → AgentExecutionResult 변환.
   * MCP content 배열을 Foundry-X output 구조로 매핑.
   */
  private parseToolResult(
    result: unknown,
    request: AgentExecutionRequest,
    startTime: number
  ): AgentExecutionResult {
    const mcpResult = result as {
      content?: Array<{ type: string; text?: string }>;
      isError?: boolean;
    };

    if (mcpResult?.isError) {
      const errorText = mcpResult.content?.map(c => c.text).join('\n') ?? 'Unknown MCP error';
      return {
        status: 'failed',
        output: { analysis: errorText },
        tokensUsed: 0,
        model: `mcp:${this.serverName}`,
        duration: Date.now() - startTime,
      };
    }

    // MCP content → analysis 텍스트로 결합
    const textContent = mcpResult?.content
      ?.filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n') ?? '';

    return {
      status: 'success',
      output: { analysis: textContent },
      tokensUsed: 0, // MCP는 토큰 사용량을 보고하지 않음
      model: `mcp:${this.serverName}`,
      duration: Date.now() - startTime,
    };
  }
}
```

---

### 1.3 McpServerRegistry (D1 CRUD + 연결 관리)

#### 1.3.1 D1 Migration

```sql
-- migrations/0006_mcp_servers.sql
CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  server_url TEXT NOT NULL,
  transport_type TEXT NOT NULL DEFAULT 'sse' CHECK (transport_type IN ('sse', 'http')),
  api_key_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
  last_connected_at TEXT,
  error_message TEXT,
  tools_cache TEXT,          -- JSON: 캐시된 도구 목록
  tools_cached_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_mcp_servers_status ON mcp_servers(status);
```

#### 1.3.2 Registry 서비스

```typescript
// packages/api/src/services/mcp-registry.ts (신규)

export interface McpServerRecord {
  id: string;
  name: string;
  serverUrl: string;
  transportType: 'sse' | 'http';
  apiKeyEncrypted: string | null;
  status: 'active' | 'inactive' | 'error';
  lastConnectedAt: string | null;
  errorMessage: string | null;
  toolsCache: string | null;
  toolsCachedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class McpServerRegistry {
  constructor(private db: D1Database) {}

  async listServers(): Promise<McpServerRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM mcp_servers ORDER BY created_at DESC')
      .all<McpServerRecord>();
    return result.results ?? [];
  }

  async getServer(id: string): Promise<McpServerRecord | null> {
    return this.db
      .prepare('SELECT * FROM mcp_servers WHERE id = ?')
      .bind(id)
      .first<McpServerRecord>();
  }

  async createServer(params: {
    name: string;
    serverUrl: string;
    transportType: 'sse' | 'http';
    apiKey?: string;
  }): Promise<McpServerRecord> {
    const id = crypto.randomUUID().replace(/-/g, '');
    const encrypted = params.apiKey ? await this.encryptApiKey(params.apiKey) : null;

    await this.db
      .prepare(`INSERT INTO mcp_servers (id, name, server_url, transport_type, api_key_encrypted)
                VALUES (?, ?, ?, ?, ?)`)
      .bind(id, params.name, params.serverUrl, params.transportType, encrypted)
      .run();

    return this.getServer(id) as Promise<McpServerRecord>;
  }

  async deleteServer(id: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM mcp_servers WHERE id = ?')
      .bind(id)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async updateStatus(
    id: string,
    status: 'active' | 'inactive' | 'error',
    errorMessage?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`UPDATE mcp_servers
                SET status = ?, error_message = ?, last_connected_at = ?, updated_at = ?
                WHERE id = ?`)
      .bind(status, errorMessage ?? null, status === 'active' ? now : null, now, id)
      .run();
  }

  async cacheTools(id: string, tools: unknown[]): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`UPDATE mcp_servers SET tools_cache = ?, tools_cached_at = ?, updated_at = ?
                WHERE id = ?`)
      .bind(JSON.stringify(tools), now, now, id)
      .run();
  }

  /**
   * 활성 MCP 서버 중 특정 tool을 지원하는 서버 찾기.
   * selectRunner()에서 사용.
   */
  async findServerForTool(toolName: string): Promise<McpServerRecord | null> {
    const servers = await this.db
      .prepare("SELECT * FROM mcp_servers WHERE status = 'active' AND tools_cache IS NOT NULL")
      .all<McpServerRecord>();

    for (const server of servers.results ?? []) {
      const tools = JSON.parse(server.toolsCache ?? '[]') as Array<{ name: string }>;
      if (tools.some(t => t.name === toolName)) return server;
    }
    return null;
  }

  // API Key 암호화 — Workers 환경에서는 env.ENCRYPTION_KEY 사용
  private async encryptApiKey(apiKey: string): Promise<string> {
    // 간단 구현: Base64 인코딩 (프로덕션에서는 Web Crypto AES-GCM 사용)
    return btoa(apiKey);
  }

  async decryptApiKey(encrypted: string): Promise<string> {
    return atob(encrypted);
  }
}
```

---

### 1.4 MCP API Routes

```typescript
// packages/api/src/routes/mcp.ts (신규)

import { Hono } from 'hono';
import { McpServerRegistry } from '../services/mcp-registry';
import { McpRunner } from '../services/mcp-runner';
import { createTransport } from '../services/mcp-transport';
import { z } from 'zod';

// Zod 스키마
const createServerSchema = z.object({
  name: z.string().min(1).max(100),
  serverUrl: z.string().url(),
  transportType: z.enum(['sse', 'http']).default('sse'),
  apiKey: z.string().optional(),
});

const app = new Hono<{ Bindings: { DB: D1Database } }>();

// GET /mcp/servers — 서버 목록
app.get('/servers', async (c) => {
  const registry = new McpServerRegistry(c.env.DB);
  const servers = await registry.listServers();
  // apiKeyEncrypted 필드 제외하여 반환
  return c.json(servers.map(s => ({ ...s, apiKeyEncrypted: undefined })));
});

// POST /mcp/servers — 서버 등록
app.post('/servers', async (c) => {
  const body = createServerSchema.parse(await c.req.json());
  const registry = new McpServerRegistry(c.env.DB);
  const server = await registry.createServer(body);
  return c.json(server, 201);
});

// DELETE /mcp/servers/:id — 서버 삭제
app.delete('/servers/:id', async (c) => {
  const registry = new McpServerRegistry(c.env.DB);
  const deleted = await registry.deleteServer(c.req.param('id'));
  if (!deleted) return c.json({ error: 'Server not found' }, 404);
  return c.json({ ok: true });
});

// POST /mcp/servers/:id/test — 연결 테스트
app.post('/servers/:id/test', async (c) => {
  const registry = new McpServerRegistry(c.env.DB);
  const server = await registry.getServer(c.req.param('id'));
  if (!server) return c.json({ error: 'Server not found' }, 404);

  try {
    const apiKey = server.apiKeyEncrypted
      ? await registry.decryptApiKey(server.apiKeyEncrypted)
      : undefined;
    const transport = createTransport(
      server.transportType as 'sse' | 'http',
      { serverUrl: server.serverUrl, apiKey }
    );
    const runner = new McpRunner(transport, server.name);
    const tools = await runner.listTools();

    await registry.updateStatus(server.id, 'active');
    await registry.cacheTools(server.id, tools);

    return c.json({ status: 'connected', tools, toolCount: tools.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await registry.updateStatus(server.id, 'error', message);
    return c.json({ status: 'error', error: message }, 502);
  }
});

// GET /mcp/servers/:id/tools — 도구 목록 (캐시 우선)
app.get('/servers/:id/tools', async (c) => {
  const registry = new McpServerRegistry(c.env.DB);
  const server = await registry.getServer(c.req.param('id'));
  if (!server) return c.json({ error: 'Server not found' }, 404);

  // 캐시가 5분 이내면 캐시 반환
  if (server.toolsCache && server.toolsCachedAt) {
    const cacheAge = Date.now() - new Date(server.toolsCachedAt).getTime();
    if (cacheAge < 5 * 60 * 1000) {
      return c.json({ tools: JSON.parse(server.toolsCache), cached: true });
    }
  }

  // 캐시 만료 → 실시간 조회
  try {
    const apiKey = server.apiKeyEncrypted
      ? await registry.decryptApiKey(server.apiKeyEncrypted)
      : undefined;
    const transport = createTransport(
      server.transportType as 'sse' | 'http',
      { serverUrl: server.serverUrl, apiKey }
    );
    const runner = new McpRunner(transport, server.name);
    const tools = await runner.listTools();
    await registry.cacheTools(server.id, tools);
    return c.json({ tools, cached: false });
  } catch (error) {
    // 실시간 실패 시 만료된 캐시라도 반환
    if (server.toolsCache) {
      return c.json({ tools: JSON.parse(server.toolsCache), cached: true, stale: true });
    }
    return c.json({ error: 'Failed to fetch tools' }, 502);
  }
});

export default app;
```

---

### 1.5 AgentOrchestrator 확장 — selectRunner()

```typescript
// packages/api/src/services/agent-orchestrator.ts — 수정 부분

import { McpServerRegistry } from './mcp-registry';
import { McpRunner } from './mcp-runner';
import { createTransport } from './mcp-transport';
import { TASK_TYPE_TO_MCP_TOOL } from './mcp-adapter';

export class AgentOrchestrator {
  constructor(
    private db: D1Database,
    private sse?: SSEManager,
    private mcpRegistry?: McpServerRegistry  // F61 신규
  ) {}

  /**
   * F61: runner 자동 선택.
   * 1. MCP 서버가 해당 tool을 지원하면 McpRunner
   * 2. 아니면 기존 runner 매개변수 사용 (ClaudeApiRunner/MockRunner)
   */
  async selectRunner(
    taskType: AgentTaskType,
    fallbackRunner: AgentRunner
  ): Promise<AgentRunner> {
    if (!this.mcpRegistry) return fallbackRunner;

    const toolName = TASK_TYPE_TO_MCP_TOOL[taskType];
    if (!toolName) return fallbackRunner;

    const server = await this.mcpRegistry.findServerForTool(toolName);
    if (!server) return fallbackRunner;

    try {
      const apiKey = server.apiKeyEncrypted
        ? await this.mcpRegistry.decryptApiKey(server.apiKeyEncrypted)
        : undefined;
      const transport = createTransport(
        server.transportType as 'sse' | 'http',
        { serverUrl: server.serverUrl, apiKey }
      );
      return new McpRunner(transport, server.name);
    } catch {
      return fallbackRunner; // MCP 실패 시 기존 runner로 fallback
    }
  }

  // 기존 executeTask() 수정:
  // 기존: runner 매개변수를 직접 사용
  // 변경: selectRunner()로 MCP 서버 확인 후 자동 선택
  async executeTask(
    agentId: string,
    taskType: AgentTaskType,
    context: Record<string, unknown>,
    runner: AgentRunner  // fallback으로 사용
  ): Promise<AgentExecutionResult> {
    const selectedRunner = await this.selectRunner(taskType, runner);
    // ... 이후 기존 8-step 흐름 동일 (selectedRunner 사용)
  }
}
```

---

### 1.6 Shared Types 추가

```typescript
// packages/shared/src/agent.ts — 추가 부분

export interface McpServerInfo {
  id: string;
  name: string;
  serverUrl: string;
  transportType: 'sse' | 'http';
  status: 'active' | 'inactive' | 'error';
  lastConnectedAt: string | null;
  errorMessage: string | null;
  toolCount: number;
  createdAt: string;
}

export interface McpTestResult {
  status: 'connected' | 'error';
  tools?: Array<{ name: string; description?: string }>;
  toolCount?: number;
  error?: string;
}
```

---

### 1.7 Dashboard UI — workspace MCP 설정

```typescript
// packages/web/src/components/feature/McpServerCard.tsx (신규)

interface McpServerCardProps {
  server: McpServerInfo;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
}

// UI 구조:
// ┌─────────────────────────────────────────┐
// │  [서버명]            [SSE] [active ●]    │
// │  https://mcp.example.com                │
// │  도구: 4개  |  마지막 연결: 2분 전        │
// │                    [테스트] [삭제]        │
// └─────────────────────────────────────────┘
```

```typescript
// packages/web/src/app/(app)/workspace/page.tsx — 수정

// 기존 workspace 페이지에 "MCP Servers" 섹션 추가
// 위치: Settings 탭 하단 또는 별도 "Integrations" 탭

// 구성:
// 1. 서버 목록 (McpServerCard 반복)
// 2. "서버 추가" 버튼 → 모달/폼
//    - Name (텍스트)
//    - Server URL (URL 입력)
//    - Transport Type (SSE/HTTP 선택)
//    - API Key (비밀번호 입력, 선택)
// 3. 각 서버: 테스트/삭제 액션
```

---

### 1.8 API Client 함수

```typescript
// packages/web/src/lib/api-client.ts — 추가 부분

export async function listMcpServers(): Promise<McpServerInfo[]> {
  const res = await apiFetch('/mcp/servers');
  return res.json();
}

export async function createMcpServer(params: {
  name: string;
  serverUrl: string;
  transportType: 'sse' | 'http';
  apiKey?: string;
}): Promise<McpServerInfo> {
  const res = await apiFetch('/mcp/servers', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function deleteMcpServer(id: string): Promise<void> {
  await apiFetch(`/mcp/servers/${id}`, { method: 'DELETE' });
}

export async function testMcpServer(id: string): Promise<McpTestResult> {
  const res = await apiFetch(`/mcp/servers/${id}/test`, { method: 'POST' });
  return res.json();
}

export async function getMcpServerTools(
  id: string
): Promise<{ tools: Array<{ name: string; description?: string }>; cached: boolean }> {
  const res = await apiFetch(`/mcp/servers/${id}/tools`);
  return res.json();
}
```

---

### 1.9 Index Route 등록

```typescript
// packages/api/src/index.ts — 수정

import mcpRoutes from './routes/mcp';
// 기존 라우트 등록 패턴에 따라:
app.route('/mcp', mcpRoutes);
```

---

## 2. F62: v1.0.0 릴리스 준비 — 상세 설계

### 2.1 버전 범프 전략

```
현재: 0.11.0 (SPEC system-version), 0.5.0 (npm foundry-x)

Sprint 12 완료 후:
  1. 전체 패키지 version → 1.0.0
  2. SPEC.md system-version → 1.0.0
  3. git tag v1.0.0
  4. npm publish foundry-x@1.0.0
  5. GitHub Release (CHANGELOG에서 추출)
```

### 2.2 CHANGELOG v0.12.0 + v1.0.0 구조

```markdown
## [1.0.0] - 2026-03-XX

### Highlights
- Phase 2 완료: API Server (28+ endpoints) + Web Dashboard (9 pages)
- MCP 프로토콜 연동으로 외부 AI 에이전트 지원
- Ambiguity Score + Generative UI로 UX 혁신
- 346+ tests, 22+ E2E specs

### Breaking Changes
- (없음 — v0.x에서 첫 안정 버전)

## [0.12.0] - 2026-03-XX

### Added
- F59: ouroboros 패턴 — Ambiguity Score + Socratic 질문 + 3-stage Evaluation
- F60: Generative UI — Widget Renderer + Decision Matrix
- F61: MCP 실 구현 — McpAgentRunner + SseTransport + 서버 관리
- F62: v1.0.0 릴리스 준비
- F63: 테스트 커버리지 강화

### Changed
- AgentOrchestrator: selectRunner() MCP 자동 선택
- AgentTaskResult: DynamicRenderer 통합 (하위 호환)
```

### 2.3 배포 체크리스트 (순서 중요)

```
Pre-deploy:
  1. turbo build — 빌드 확인
  2. turbo typecheck — 타입 에러 0
  3. turbo test — 전체 테스트 green
  4. pnpm playwright test — E2E green

Deploy:
  5. wrangler d1 migrations apply DB --remote — 0006 migration
  6. wrangler deploy — API (Workers)
  7. wrangler pages deploy — Web (Pages)
  8. scripts/smoke-test.sh — 프로덕션 검증

Release:
  9. version bump: package.json 전체 → 1.0.0
  10. CHANGELOG + README 최종 갱신
  11. git add + commit "chore: v1.0.0 release"
  12. git tag v1.0.0
  13. npm publish (foundry-x@1.0.0)
  14. gh release create v1.0.0 --notes-from-tag
  15. SPEC.md system-version → 1.0.0
```

---

## 3. F63: 테스트 커버리지 강화 — 상세 설계

### 3.1 SSE 이벤트 대기 헬퍼

```typescript
// packages/web/e2e/helpers/sse-helpers.ts (신규)

import type { Page } from '@playwright/test';

/**
 * SSE 이벤트를 안정적으로 대기하는 헬퍼.
 * 페이지 내 window.__sseEvents 배열을 폴링하여 이벤트 도착 확인.
 */
export async function waitForSSEEvent(
  page: Page,
  eventType: string,
  options?: { timeout?: number; pollInterval?: number }
): Promise<unknown> {
  const { timeout = 10000, pollInterval = 200 } = options ?? {};
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const event = await page.evaluate((type) => {
      const events = (window as any).__sseEvents ?? [];
      return events.find((e: any) => e.type === type);
    }, eventType);

    if (event) return event;
    await page.waitForTimeout(pollInterval);
  }

  throw new Error(`SSE event "${eventType}" not received within ${timeout}ms`);
}

/**
 * SSE 이벤트 수집을 시작하는 스크립트를 페이지에 주입.
 * beforeEach에서 호출.
 */
export async function injectSSECollector(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).__sseEvents = [];
    const originalEventSource = window.EventSource;
    window.EventSource = class extends originalEventSource {
      constructor(url: string | URL, init?: EventSourceInit) {
        super(url, init);
        this.addEventListener('message', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            (window as any).__sseEvents.push(data);
          } catch { /* ignore non-JSON */ }
        });
      }
    } as any;
  });
}
```

### 3.2 MCP E2E 테스트

```typescript
// packages/web/e2e/mcp-runner.spec.ts (신규)

test('MCP 서버 등록 후 에이전트 실행 시 MCP runner 사용', async ({ page }) => {
  // 1. workspace → MCP Servers 섹션
  // 2. 서버 추가 (Mock MCP 서버 URL)
  // 3. 연결 테스트 → "connected" 확인
  // 4. agents 페이지 → 에이전트 실행
  // 5. 결과에 "mcp:" 모델 표시 확인
});

test('MCP 서버 연결 실패 시 ClaudeApiRunner fallback', async ({ page }) => {
  // 1. 잘못된 URL로 MCP 서버 등록
  // 2. 에이전트 실행
  // 3. 결과에 "claude-" 모델 표시 확인 (fallback)
});
```

### 3.3 MCP API 통합 테스트

```typescript
// packages/api/src/__tests__/mcp-integration.test.ts (신규)

describe('MCP Integration', () => {
  // Mock MCP 서버 (MSW 또는 직접 fetch mock)
  it('McpRunner.execute() — tool.call 성공 → AgentExecutionResult 변환');
  it('McpRunner.execute() — MCP 에러 응답 → failed 상태');
  it('McpRunner.listTools() — 도구 목록 반환');
  it('selectRunner() — MCP 서버 active + tool 매칭 → McpRunner 선택');
  it('selectRunner() — MCP 서버 없음 → fallback runner 반환');
});
```

### 3.4 서비스 통합 테스트

```typescript
// packages/api/src/__tests__/service-integration.test.ts (신규)

describe('Service Integration', () => {
  it('MCP server CRUD → registry 동작 확인');
  it('MCP test-connection → status 업데이트 확인');
  it('executeTask with MCP → SSE 이벤트 전파 확인');
});
```

---

## 4. 파일 변경 총괄

### 4.1 신규 파일 (10개)

| # | 파일 | 설명 | 테스트 |
|---|------|------|:------:|
| 1 | `packages/api/src/services/mcp-transport.ts` | SseTransport + HttpTransport + factory | 8 |
| 2 | `packages/api/src/services/mcp-runner.ts` | McpRunner (McpAgentRunner 구현) | 5 |
| 3 | `packages/api/src/services/mcp-registry.ts` | McpServerRegistry (D1 CRUD) | 2 |
| 4 | `packages/api/src/routes/mcp.ts` | MCP 라우트 5 endpoints | 5 |
| 5 | `packages/api/src/schemas/mcp.ts` | MCP Zod 스키마 | — |
| 6 | `packages/web/src/components/feature/McpServerCard.tsx` | MCP 서버 카드 UI | — |
| 7 | `migrations/0006_mcp_servers.sql` | mcp_servers 테이블 | — |
| 8 | `packages/web/e2e/helpers/sse-helpers.ts` | SSE 테스트 헬퍼 | 3 |
| 9 | `packages/web/e2e/mcp-runner.spec.ts` | MCP E2E 2건 | 2 |
| 10 | `packages/api/src/__tests__/mcp-integration.test.ts` | MCP 통합 5건 | 5 |

### 4.2 수정 파일 (11개)

| # | 파일 | 변경 내용 |
|---|------|----------|
| 1 | `packages/api/src/services/agent-orchestrator.ts` | mcpRegistry 주입 + selectRunner() |
| 2 | `packages/api/src/services/mcp-adapter.ts` | re-export 정리 (기존 타입 유지) |
| 3 | `packages/api/src/index.ts` | MCP 라우트 등록 |
| 4 | `packages/shared/src/agent.ts` | McpServerInfo, McpTestResult 타입 |
| 5 | `packages/web/src/lib/api-client.ts` | MCP API 함수 5개 |
| 6 | `packages/web/src/app/(app)/workspace/page.tsx` | MCP Servers 섹션 |
| 7 | `packages/web/e2e/agent-execute.spec.ts` | SSE 헬퍼 적용 (flaky 해결) |
| 8 | `docs/CHANGELOG.md` | v0.12.0 + v1.0.0 |
| 9 | `README.md` | Phase 2 반영 |
| 10 | `package.json` (전체) | version → 1.0.0 |
| 11 | `SPEC.md` | F61~F63 상태 갱신 + system-version |

### 4.3 테스트 수량

| 카테고리 | 단위 | 통합 | E2E | 합계 |
|---------|:----:|:----:|:---:|:----:|
| F61 Transport | 8 | — | — | 8 |
| F61 Runner | 5 | — | — | 5 |
| F61 Registry+Routes | 2 | 5 | — | 7 |
| F63 SSE 헬퍼 | 3 | — | — | 3 |
| F63 MCP E2E | — | — | 2 | 2 |
| F63 서비스 통합 | — | 3 | — | 3 |
| F63 기존 E2E 안정화 | — | — | (수정) | 0 |
| **합계** | **18** | **8** | **2** | **28** |

---

## 5. 구현 순서 (Build Sequence)

```
Step 1: shared 타입 (30분)
  → agent.ts에 McpServerInfo, McpTestResult 추가

Step 2: D1 migration (15분)
  → 0006_mcp_servers.sql 작성 + 로컬 적용

Step 3: Transport 계층 (2시간)
  → mcp-transport.ts (SseTransport + HttpTransport + factory)
  → 단위 테스트 8건

Step 4: McpRunner (1.5시간)
  → mcp-runner.ts
  → 단위 테스트 5건

Step 5: Registry + Routes (1.5시간)
  → mcp-registry.ts + routes/mcp.ts + schemas/mcp.ts
  → index.ts 라우트 등록
  → 통합 테스트 7건

Step 6: Orchestrator 통합 (30분)
  → agent-orchestrator.ts selectRunner() 추가

Step 7: Dashboard UI (1시간)
  → api-client.ts MCP 함수
  → McpServerCard.tsx
  → workspace/page.tsx MCP 섹션

Step 8: 테스트 보강 (1시간)
  → sse-helpers.ts
  → agent-execute.spec.ts 리팩토링
  → mcp-runner.spec.ts E2E
  → mcp-integration.test.ts

Step 9: v1.0.0 릴리스 (1시간)
  → CHANGELOG + README
  → version bump
  → 프로덕션 배포
  → npm publish + git tag + GitHub Release
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F61/F62/F63 상세 설계 | Sinclair Seo |
