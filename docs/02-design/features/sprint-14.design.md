---
code: FX-DSGN-015
title: Sprint 14 (v1.2.0) — MCP Resources + 멀티 에이전트 동시 PR + Phase 3 기반 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 1.2.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 14 (v1.2.0) Design Document

> **Summary**: MCP Resources(리소스 발견·읽기·구독), 멀티 에이전트 동시 PR(Merge Queue + 충돌 감지), Phase 3 기반(멀티테넌시 설계) 상세 설계.
>
> **Project**: Foundry-X
> **Version**: 1.2.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [[FX-PLAN-015]] (`docs/01-plan/features/sprint-14.plan.md`)

---

## 1. Overview

### 1.1 Design Goals

1. MCP 1.0 프로토콜 4대 기능(Tools✅, Sampling✅, Prompts✅, **Resources**) 완전 통합
2. 멀티 에이전트 병렬 실행 → 동시 PR → 파일 충돌 감지 → 순차 merge 자동화
3. Phase 3 전환을 위한 멀티테넌시 데이터 모델 설계

### 1.2 현재 코드 분석

#### MCP 서비스 현황

| 서비스 | 메서드 | 상태 |
|--------|--------|:----:|
| McpRunner | `execute()`, `listTools()`, `listPrompts()`, `getPrompt()` | ✅ |
| McpRunner | `listResources()` | 스텁 (빈 배열 반환) |
| McpRunner | `readResource()`, `subscribeResource()` | ❌ 미존재 |
| McpRunner | `onNotification()` | ❌ 미존재 |
| McpTransport | `connect()`, `send()`, `disconnect()` | ✅ |
| McpTransport | notification 수신 | ❌ 미존재 |

#### 에이전트 서비스 현황

| 서비스 | 메서드 | 상태 |
|--------|--------|:----:|
| AgentOrchestrator | `executeTask()`, `executeTaskWithPr()` | ✅ 순차만 |
| AgentOrchestrator | `executeParallel()` | ❌ 미존재 |
| PrPipelineService | `createAgentPr()`, `checkAndMerge()` | ✅ 단일 PR |
| MergeQueueService | 전체 | ❌ 미존재 |
| GitHubService | `createBranch()`, `createPR()`, `mergePR()`, `getPrDiff()` | ✅ |
| GitHubService | `getModifiedFiles()`, `updateBranch()`, `getPrStatuses()` | ❌ 미존재 |

### 1.3 환경 변경

| 항목 | 변경 |
|------|------|
| D1 테이블 | 13 → 15 (+merge_queue, +parallel_executions) |
| API endpoints | 41 → 50 (+MCP 4, +Agent 5) |
| SSE 이벤트 | 8종 → 13종 (+queue 4, +mcp.resource 1) |

---

## 2. F67: MCP Resources + Notifications 상세 설계

### 2.1 McpResourcesClient

기존 `McpRunner.listResources()` 스텁을 실제 구현으로 전환하고, `readResource`와 `subscribeResource`를 추가해요.

#### 2.1.1 타입 정의 (packages/shared/src/agent.ts 추가)

```typescript
// === MCP Resources Types ===

interface McpResource {
  uri: string;           // "file:///config.json", "db://users/123"
  name: string;
  description?: string;
  mimeType?: string;
}

interface McpResourceTemplate {
  uriTemplate: string;   // "db://users/{id}"
  name: string;
  description?: string;
  mimeType?: string;
}

interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;         // 텍스트 리소스
  blob?: string;         // base64 바이너리
}

interface McpResourceSubscription {
  serverId: string;
  uri: string;
  subscribedAt: string;
  lastUpdated?: string;
}
```

#### 2.1.2 McpRunner 확장 (packages/api/src/services/mcp-runner.ts)

```typescript
class McpRunner implements McpAgentRunner {
  // 기존 메서드 유지...

  // listResources() — 기존 스텁을 실제 구현으로 전환
  async listResources(): Promise<McpResource[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "resources/list",
      params: {},
    });
    return (response.result?.resources as McpResource[]) ?? [];
  }

  // 신규: 리소스 템플릿 목록
  async listResourceTemplates(): Promise<McpResourceTemplate[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "resources/templates/list",
      params: {},
    });
    return (response.result?.resourceTemplates as McpResourceTemplate[]) ?? [];
  }

  // 신규: 리소스 읽기
  async readResource(uri: string): Promise<McpResourceContent[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "resources/read",
      params: { uri },
    });
    return (response.result?.contents as McpResourceContent[]) ?? [];
  }

  // 신규: 리소스 구독
  async subscribeResource(uri: string): Promise<void> {
    await this.transport.send({
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "resources/subscribe",
      params: { uri },
    });
    this.subscriptions.add(uri);
  }

  // 신규: 구독 해제
  async unsubscribeResource(uri: string): Promise<void> {
    await this.transport.send({
      jsonrpc: "2.0",
      id: this.nextId(),
      method: "resources/unsubscribe",
      params: { uri },
    });
    this.subscriptions.delete(uri);
  }

  // 신규: notification 핸들러 등록
  onNotification(
    method: string,
    handler: (params: unknown) => void
  ): void {
    this.notificationHandlers.set(method, handler);
  }

  // 내부: notification 디스패치
  private handleNotification(method: string, params: unknown): void {
    const handler = this.notificationHandlers.get(method);
    if (handler) handler(params);
  }

  // 새 필드
  private subscriptions = new Set<string>();
  private notificationHandlers = new Map<string, (params: unknown) => void>();
}
```

#### 2.1.3 McpTransport notification 수신 (packages/api/src/services/mcp-transport.ts)

SseTransport의 SSE 스트림에서 notification 메시지를 감지하여 콜백을 호출해요:

```typescript
class SseTransport implements McpTransport {
  // 기존 필드...
  private notificationCallback?: (method: string, params: unknown) => void;

  // 신규: notification 콜백 설정
  setNotificationHandler(callback: (method: string, params: unknown) => void): void {
    this.notificationCallback = callback;
  }

  // connect() 내부의 SSE 파싱 로직 확장
  async connect(config: McpConnectionConfig): Promise<void> {
    // 기존 연결 로직...

    // SSE 메시지 파싱 시 notification 감지 추가
    // JSON-RPC notification = id가 없는 메시지
    // { jsonrpc: "2.0", method: "notifications/resources/updated", params: { uri: "..." } }
  }

  // processMessage 확장
  private processMessage(data: string): void {
    const msg = JSON.parse(data);
    if (!msg.id && msg.method && this.notificationCallback) {
      // id 없음 = notification
      this.notificationCallback(msg.method, msg.params);
    }
    // 기존 response 처리...
  }
}
```

**핵심 포인트**: JSON-RPC notification은 `id` 필드가 없는 메시지예요. 기존 `send()` 응답 처리와 구분하기 위해 `id` 존재 여부로 분기해요.

#### 2.1.4 McpResourcesClient 서비스 (packages/api/src/services/mcp-resources.ts — 신규)

McpRunner를 래핑하여 서버 ID 기반으로 Resources 작업을 수행하는 상위 서비스:

```typescript
import type { McpServerRegistry } from "./mcp-registry";
import type { McpRunner } from "./mcp-runner";
import type { SSEManager } from "./sse-manager";
import { createTransport } from "./mcp-transport";

class McpResourcesClient {
  constructor(
    private registry: McpServerRegistry,
    private sse?: SSEManager,
  ) {}

  // 서버 ID로 McpRunner 인스턴스 생성
  private async getRunner(serverId: string): Promise<McpRunner> {
    const server = await this.registry.getServer(serverId);
    if (!server) throw new Error(`MCP server not found: ${serverId}`);

    const transport = createTransport(
      server.transportType as "sse" | "http",
      {
        serverUrl: server.serverUrl,
        apiKey: server.apiKeyEncrypted
          ? this.registry.decryptApiKey(server.apiKeyEncrypted)
          : undefined,
      },
    );

    const runner = new McpRunner(transport, server.name);

    // notification 핸들러 — resources/updated → SSE 전파
    runner.onNotification(
      "notifications/resources/updated",
      (params) => {
        const { uri } = params as { uri: string };
        this.sse?.pushEvent({
          event: "mcp.resource.updated",
          data: { serverId, uri, timestamp: new Date().toISOString() },
        });
      },
    );

    return runner;
  }

  async listResources(serverId: string): Promise<McpResource[]> {
    const runner = await this.getRunner(serverId);
    return runner.listResources();
  }

  async listResourceTemplates(serverId: string): Promise<McpResourceTemplate[]> {
    const runner = await this.getRunner(serverId);
    return runner.listResourceTemplates();
  }

  async readResource(serverId: string, uri: string): Promise<McpResourceContent[]> {
    const runner = await this.getRunner(serverId);
    return runner.readResource(uri);
  }

  async subscribeResource(serverId: string, uri: string): Promise<void> {
    const runner = await this.getRunner(serverId);
    await runner.subscribeResource(uri);
  }

  async unsubscribeResource(serverId: string, uri: string): Promise<void> {
    const runner = await this.getRunner(serverId);
    await runner.unsubscribeResource(uri);
  }
}
```

### 2.2 MCP Resources API (packages/api/src/routes/mcp.ts 확장)

#### 2.2.1 Zod 스키마 (packages/api/src/schemas/mcp.ts 추가)

```typescript
// === Resources Schemas ===

const McpResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

const McpResourceTemplateSchema = z.object({
  uriTemplate: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

const McpResourceContentSchema = z.object({
  uri: z.string(),
  mimeType: z.string().optional(),
  text: z.string().optional(),
  blob: z.string().optional(),
});

const ReadResourceRequestSchema = z.object({
  uri: z.string().min(1),
});

const SubscribeResourceRequestSchema = z.object({
  uri: z.string().min(1),
});
```

#### 2.2.2 Endpoints (4건 추가)

| Method | Path | 설명 | 인증 |
|--------|------|------|:----:|
| GET | `/mcp/servers/:id/resources` | 서버의 리소스 목록 조회 | ✅ |
| GET | `/mcp/servers/:id/resources/templates` | 리소스 템플릿 목록 조회 | ✅ |
| POST | `/mcp/servers/:id/resources/read` | 리소스 읽기 (body: `{ uri }`) | ✅ |
| POST | `/mcp/servers/:id/resources/subscribe` | 리소스 구독 (body: `{ uri }`) | ✅ |

#### 2.2.3 Route 구현 패턴

```typescript
// GET /mcp/servers/:id/resources
const listResources = createRoute({
  method: "get",
  path: "/mcp/servers/{id}/resources",
  tags: ["MCP"],
  summary: "List resources from MCP server",
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ resources: z.array(McpResourceSchema) }),
        },
      },
    },
    404: { description: "Server not found" },
  },
});

// POST /mcp/servers/:id/resources/read
const readResource = createRoute({
  method: "post",
  path: "/mcp/servers/{id}/resources/read",
  tags: ["MCP"],
  summary: "Read a specific resource",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: ReadResourceRequestSchema } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ contents: z.array(McpResourceContentSchema) }),
        },
      },
    },
  },
});
```

### 2.3 MCP Resources UI

#### 2.3.1 McpResourcesPanel.tsx (신규)

workspace/page.tsx의 MCP Servers 탭에 추가되는 Resources 브라우저:

```
┌─────────────────────────────────────────────────────────┐
│  MCP Server: code-analysis-server              [Active] │
├──────────┬──────────────────────────────────────────────┤
│ Tools    │  Resources (3)                    Templates  │
├──────────┼──────────────────────────────────────────────┤
│          │  📄 config.json       application/json  [🔔] │
│          │  📊 metrics.csv       text/csv               │
│          │  📁 schema.sql        text/plain        [🔔] │
│          │                                              │
│          │  ─── Templates ───                           │
│          │  🔗 db://users/{id}   application/json       │
│          │     └─ [id: ________] [Read]                 │
│          │                                              │
│          │  ──────────────────────────────────────────  │
│          │  Selected: config.json                       │
│          │  ┌──────────────────────────────────────┐   │
│          │  │ {                                    │   │
│          │  │   "model": "claude-3-opus",          │   │
│          │  │   "maxTokens": 4096,                 │   │
│          │  │   "temperature": 0.7                 │   │
│          │  │ }                                    │   │
│          │  └──────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────┘
```

**컴포넌트 구조**:

```typescript
// McpResourcesPanel.tsx — Props
interface McpResourcesPanelProps {
  serverId: string;
  serverName: string;
}

// 내부 상태
// - resources: McpResource[] (API에서 로드)
// - templates: McpResourceTemplate[] (API에서 로드)
// - selectedResource: McpResource | null
// - resourceContent: McpResourceContent | null (선택 시 로드)
// - subscriptions: Set<string> (구독 중인 URI)
```

#### 2.3.2 ResourceViewer.tsx (신규)

리소스 내용을 표시하는 뷰어:

```typescript
interface ResourceViewerProps {
  content: McpResourceContent;
}

// mimeType 기반 렌더링:
// - application/json → JSON 하이라이팅 (pre + 들여쓰기)
// - text/* → 일반 텍스트 (pre)
// - image/* → base64 blob → <img> 태그
// - 기타 → base64 다운로드 링크
```

#### 2.3.3 api-client.ts 추가 (packages/web/src/lib/api-client.ts)

```typescript
// MCP Resources API
export async function listMcpResources(serverId: string): Promise<McpResource[]>;
export async function listMcpResourceTemplates(serverId: string): Promise<McpResourceTemplate[]>;
export async function readMcpResource(serverId: string, uri: string): Promise<McpResourceContent[]>;
export async function subscribeMcpResource(serverId: string, uri: string): Promise<void>;
```

### 2.4 SSE 이벤트 확장 (packages/api/src/services/sse-manager.ts)

```typescript
// SSEEvent union에 추가
| { event: "mcp.resource.updated"; data: McpResourceUpdatedData }

interface McpResourceUpdatedData {
  serverId: string;
  uri: string;
  timestamp: string;
}
```

### 2.5 F67 테스트 설계 (~20건)

| 파일 | 테스트 | 건수 |
|------|--------|:----:|
| `mcp-resources.test.ts` | McpResourcesClient — listResources, readResource, subscribeResource, unsubscribeResource, listResourceTemplates, getRunner 에러 핸들링, notification 전파, 빈 결과 | 8 |
| `mcp-runner.test.ts` 추가 | listResources 실제 구현, readResource, listResourceTemplates, subscribeResource, onNotification | 4 |
| `mcp-routes-resources.test.ts` | GET resources, GET templates, POST read, POST subscribe | 4 |
| `McpResourcesPanel.test.tsx` | 리소스 목록 렌더링, 선택→내용 표시, 구독 토글, 템플릿 인자 입력 | 4 |

---

## 3. F68: 멀티 에이전트 동시 PR + 충돌 해결 상세 설계

### 3.1 MergeQueueService (packages/api/src/services/merge-queue.ts — 신규)

#### 3.1.1 타입 정의 (packages/shared/src/agent.ts 추가)

```typescript
// === Merge Queue Types ===

type MergeQueueStatus = "queued" | "merging" | "merged" | "conflict" | "failed";

interface MergeQueueEntry {
  id: string;
  prRecordId: string;
  prNumber: number;
  agentId: string;
  priority: number;        // 0 = 최우선
  position: number;
  modifiedFiles: string[];
  status: MergeQueueStatus;
  conflictsWith: string[]; // 충돌하는 다른 queue entry ID
  rebaseAttempted: boolean;
  rebaseSucceeded: boolean;
  createdAt: string;
  mergedAt: string | null;
}

interface ConflictReport {
  conflicting: ConflictPair[];
  suggestedOrder: string[]; // queue entry ID 순서
  autoResolvable: boolean;
}

interface ConflictPair {
  entryA: string;       // queue entry ID
  entryB: string;
  files: string[];      // 충돌 파일 목록
}

// 병렬 실행
type ParallelExecutionStatus = "running" | "completed" | "partially_failed";

interface ParallelExecution {
  id: string;
  taskIds: string[];
  agentIds: string[];
  status: ParallelExecutionStatus;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

interface ParallelExecutionResult {
  executionId: string;
  results: Array<{
    agentId: string;
    taskId: string;
    status: "success" | "failed";
    result?: AgentExecutionResult;
    error?: string;
  }>;
  durationMs: number;
}

interface ParallelPrResult extends ParallelExecutionResult {
  prs: Array<{
    agentId: string;
    prNumber: number | null;
    prUrl: string | null;
    queuePosition: number;
  }>;
  conflicts: ConflictReport;
}

// SSE Queue 이벤트
interface QueueUpdatedData {
  queue: Array<{ id: string; prNumber: number; agentId: string; position: number; status: string }>;
  totalPrs: number;
}

interface QueueConflictData {
  conflicts: ConflictReport;
}

interface QueueMergedData {
  entryId: string;
  prNumber: number;
  position: number;
  commitSha: string;
}

interface QueueRebaseData {
  prNumber: number;
  success: boolean;
  files: string[];
}
```

#### 3.1.2 서비스 구현

```typescript
class MergeQueueService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
    private sse?: SSEManager,
  ) {}

  // PR을 merge queue에 추가
  async enqueue(
    prRecordId: string,
    prNumber: number,
    agentId: string,
    priority: number = 1,
  ): Promise<MergeQueueEntry> {
    // 1. GitHub API로 수정 파일 목록 조회
    const modifiedFiles = await this.github.getModifiedFiles(prNumber);

    // 2. 현재 queue에서 최대 position 조회
    const maxPos = await this.getMaxPosition();

    // 3. D1 insert
    const id = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO merge_queue (id, pr_record_id, pr_number, agent_id, priority, position, modified_files, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`,
      )
      .bind(id, prRecordId, prNumber, agentId, priority, maxPos + 1, JSON.stringify(modifiedFiles))
      .run();

    // 4. 충돌 감지 + SSE 이벤트
    const conflicts = await this.detectConflicts();
    if (conflicts.conflicting.length > 0) {
      // 충돌하는 entry에 conflictsWith 업데이트
      await this.updateConflictRelations(conflicts);
      this.sse?.pushEvent({ event: "agent.queue.conflict", data: { conflicts } });
    }

    this.sse?.pushEvent({
      event: "agent.queue.updated",
      data: { queue: await this.getQueueSummary(), totalPrs: maxPos + 2 },
    });

    return this.getEntry(id);
  }

  // 충돌 감지 — queue 내 모든 queued PR 간 파일 교집합 분석
  async detectConflicts(): Promise<ConflictReport> {
    const entries = await this.getQueuedEntries();
    const conflicting: ConflictPair[] = [];

    // O(n²) 비교 — queue 크기 제한 (일반적으로 <10)이므로 문제 없음
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const filesA = new Set(entries[i].modifiedFiles);
        const overlap = entries[j].modifiedFiles.filter((f) => filesA.has(f));
        if (overlap.length > 0) {
          conflicting.push({
            entryA: entries[i].id,
            entryB: entries[j].id,
            files: overlap,
          });
        }
      }
    }

    // 권장 순서: 충돌 없는 PR 먼저 → priority 높은 순 → 생성 시간 순
    const suggestedOrder = this.calculateMergeOrder(entries, conflicting);

    return {
      conflicting,
      suggestedOrder,
      autoResolvable: conflicting.every((c) => c.files.length <= 3), // heuristic
    };
  }

  // Merge 순서 결정 (greedy 알고리즘)
  private calculateMergeOrder(
    entries: MergeQueueEntry[],
    conflicts: ConflictPair[],
  ): string[] {
    // 1단계: 충돌 없는 PR 수집
    const conflictingIds = new Set(
      conflicts.flatMap((c) => [c.entryA, c.entryB]),
    );
    const nonConflicting = entries
      .filter((e) => !conflictingIds.has(e.id))
      .sort((a, b) => a.priority - b.priority || a.position - b.position);

    // 2단계: 충돌 있는 PR — priority 순 (같으면 먼저 생성된 순)
    const conflictingEntries = entries
      .filter((e) => conflictingIds.has(e.id))
      .sort((a, b) => a.priority - b.priority || a.position - b.position);

    return [
      ...nonConflicting.map((e) => e.id),
      ...conflictingEntries.map((e) => e.id),
    ];
  }

  // Queue에서 다음 PR merge 실행
  async processNext(): Promise<{
    merged: boolean;
    entryId: string;
    rebaseAttempted?: boolean;
    conflictResolved?: boolean;
  }> {
    const conflicts = await this.detectConflicts();
    const nextId = conflicts.suggestedOrder[0];
    if (!nextId) return { merged: false, entryId: "" };

    const entry = await this.getEntry(nextId);
    await this.updateEntryStatus(nextId, "merging");

    try {
      // 1. PR이 mergeable인지 확인
      const prStatuses = await this.github.getPrStatuses([entry.prNumber]);
      const prStatus = prStatuses[0];

      if (!prStatus?.mergeable) {
        // 2. rebase 시도
        await this.updateEntry(nextId, { rebase_attempted: 1 });
        const rebaseResult = await this.github.updateBranch(entry.prNumber);

        this.sse?.pushEvent({
          event: "agent.queue.rebase",
          data: { prNumber: entry.prNumber, success: rebaseResult.updated, files: entry.modifiedFiles },
        });

        if (!rebaseResult.updated) {
          await this.updateEntryStatus(nextId, "conflict");
          return { merged: false, entryId: nextId, rebaseAttempted: true, conflictResolved: false };
        }

        await this.updateEntry(nextId, { rebase_succeeded: 1 });
      }

      // 3. merge 실행
      const mergeResult = await this.github.mergePullRequest(entry.prNumber, {
        mergeMethod: "squash",
      });

      if (mergeResult.merged) {
        await this.updateEntryStatus(nextId, "merged");
        await this.updateEntry(nextId, { merged_at: new Date().toISOString() });

        // 4. queue position 재계산
        await this.reorderQueue();

        this.sse?.pushEvent({
          event: "agent.queue.merged",
          data: { entryId: nextId, prNumber: entry.prNumber, position: entry.position, commitSha: mergeResult.sha },
        });

        return { merged: true, entryId: nextId, rebaseAttempted: false };
      }

      await this.updateEntryStatus(nextId, "failed");
      return { merged: false, entryId: nextId };
    } catch {
      await this.updateEntryStatus(nextId, "failed");
      return { merged: false, entryId: nextId };
    }
  }

  // Queue 상태 조회
  async getQueueStatus(): Promise<MergeQueueEntry[]> {
    const result = await this.db
      .prepare("SELECT * FROM merge_queue WHERE status IN ('queued', 'merging') ORDER BY position")
      .all();
    return result.results.map(this.mapEntry);
  }

  // 우선순위 변경
  async updatePriority(entryId: string, newPriority: number): Promise<void> {
    await this.db
      .prepare("UPDATE merge_queue SET priority = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newPriority, entryId)
      .run();
    await this.reorderQueue();
  }

  // === private helpers ===
  private async getQueuedEntries(): Promise<MergeQueueEntry[]> { /* ... */ }
  private async getEntry(id: string): Promise<MergeQueueEntry> { /* ... */ }
  private async getMaxPosition(): Promise<number> { /* ... */ }
  private async updateEntryStatus(id: string, status: MergeQueueStatus): Promise<void> { /* ... */ }
  private async updateEntry(id: string, fields: Record<string, unknown>): Promise<void> { /* ... */ }
  private async updateConflictRelations(report: ConflictReport): Promise<void> { /* ... */ }
  private async reorderQueue(): Promise<void> { /* ... */ }
  private async getQueueSummary(): Promise<QueueUpdatedData["queue"]> { /* ... */ }
  private mapEntry(row: Record<string, unknown>): MergeQueueEntry { /* JSON 파싱 */ }
}
```

### 3.2 GitHubService 확장 (packages/api/src/services/github.ts)

```typescript
class GitHubService {
  // 기존 메서드 유지...

  // 신규: PR의 수정 파일 목록 조회
  async getModifiedFiles(prNumber: number): Promise<string[]> {
    const response = await this.octokit.rest.pulls.listFiles({
      ...this.repoParams,
      pull_number: prNumber,
      per_page: 100,
    });
    return response.data.map((f) => f.filename);
  }

  // 신규: PR 브랜치를 base 기준으로 업데이트 (rebase 효과)
  async updateBranch(
    prNumber: number,
    expectedHeadSha?: string,
  ): Promise<{ updated: boolean; sha?: string }> {
    try {
      const response = await this.octokit.rest.pulls.updateBranch({
        ...this.repoParams,
        pull_number: prNumber,
        expected_head_sha: expectedHeadSha,
      });
      return { updated: true, sha: response.data.sha };
    } catch {
      return { updated: false };
    }
  }

  // 신규: 다수 PR 상태 일괄 조회
  async getPrStatuses(
    prNumbers: number[],
  ): Promise<Array<{ number: number; mergeable: boolean | null; state: string }>> {
    const results = await Promise.all(
      prNumbers.map(async (num) => {
        const { data } = await this.octokit.rest.pulls.get({
          ...this.repoParams,
          pull_number: num,
        });
        return { number: num, mergeable: data.mergeable, state: data.state };
      }),
    );
    return results;
  }
}
```

### 3.3 AgentOrchestrator 병렬 실행 (packages/api/src/services/agent-orchestrator.ts 확장)

```typescript
class AgentOrchestrator {
  // 기존 메서드 유지...
  private mergeQueue?: MergeQueueService;

  setMergeQueue(queue: MergeQueueService): void {
    this.mergeQueue = queue;
  }

  // 신규: 병렬 실행
  async executeParallel(
    tasks: Array<{
      agentId: string;
      taskType: AgentTaskType;
      context: AgentExecutionRequest["context"];
      runner: AgentRunner;
    }>,
  ): Promise<ParallelExecutionResult> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    // D1에 parallel_executions 레코드 생성
    await this.db
      .prepare(
        `INSERT INTO parallel_executions (id, task_ids, agent_ids, status, total_tasks)
         VALUES (?, '[]', ?, 'running', ?)`,
      )
      .bind(executionId, JSON.stringify(tasks.map((t) => t.agentId)), tasks.length)
      .run();

    // Promise.allSettled로 모든 작업 병렬 실행
    const settled = await Promise.allSettled(
      tasks.map(async (task) => {
        const result = await this.executeTask(
          task.agentId,
          task.taskType,
          task.context,
          task.runner,
        );
        return { agentId: task.agentId, result };
      }),
    );

    // 결과 집계
    const results = settled.map((s, i) => {
      if (s.status === "fulfilled") {
        return {
          agentId: tasks[i].agentId,
          taskId: s.value.result.taskId ?? "",
          status: "success" as const,
          result: s.value.result,
        };
      }
      return {
        agentId: tasks[i].agentId,
        taskId: "",
        status: "failed" as const,
        error: s.reason?.message ?? "Unknown error",
      };
    });

    const completed = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const durationMs = Date.now() - startTime;

    // D1 업데이트
    const finalStatus = failed === 0 ? "completed" : failed === tasks.length ? "partially_failed" : "partially_failed";
    await this.db
      .prepare(
        `UPDATE parallel_executions
         SET status = ?, completed_tasks = ?, failed_tasks = ?, duration_ms = ?,
             task_ids = ?, completed_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(finalStatus, completed, failed, durationMs, JSON.stringify(results.map((r) => r.taskId)), executionId)
      .run();

    return { executionId, results, durationMs };
  }

  // 신규: 병렬 실행 + 자동 PR + Merge Queue
  async executeParallelWithPr(
    tasks: Array<{
      agentId: string;
      taskType: AgentTaskType;
      context: AgentExecutionRequest["context"];
      runner: AgentRunner;
    }>,
  ): Promise<ParallelPrResult> {
    // 1. 병렬 실행
    const execResult = await this.executeParallel(tasks);

    // 2. 성공한 작업에 대해 PR 생성
    const prs: ParallelPrResult["prs"] = [];
    for (const result of execResult.results) {
      if (result.status === "success" && result.result?.output?.generatedCode?.length) {
        if (this.prPipeline) {
          const prResult = await this.prPipeline.createAgentPr(
            result.agentId,
            result.taskId,
            result.result,
          );
          prs.push({
            agentId: result.agentId,
            prNumber: prResult.prNumber,
            prUrl: prResult.prUrl,
            queuePosition: -1, // enqueue 후 업데이트
          });

          // 3. Merge Queue에 등록
          if (this.mergeQueue && prResult.prNumber) {
            const entry = await this.mergeQueue.enqueue(
              prResult.id,
              prResult.prNumber,
              result.agentId,
              tasks.find((t) => t.agentId === result.agentId)?.taskType === "code-review" ? 0 : 1,
            );
            const prItem = prs.find((p) => p.agentId === result.agentId);
            if (prItem) prItem.queuePosition = entry.position;
          }
        }
      }
    }

    // 4. 충돌 감지
    const conflicts = this.mergeQueue
      ? await this.mergeQueue.detectConflicts()
      : { conflicting: [], suggestedOrder: [], autoResolvable: true };

    return { ...execResult, prs, conflicts };
  }
}
```

### 3.4 Agent API 확장 (packages/api/src/routes/agent.ts)

#### 3.4.1 Zod 스키마 (packages/api/src/schemas/agent.ts 추가)

```typescript
// === Merge Queue Schemas ===

const MergeQueueEntrySchema = z.object({
  id: z.string(),
  prRecordId: z.string(),
  prNumber: z.number(),
  agentId: z.string(),
  priority: z.number(),
  position: z.number(),
  modifiedFiles: z.array(z.string()),
  status: z.enum(["queued", "merging", "merged", "conflict", "failed"]),
  conflictsWith: z.array(z.string()),
  rebaseAttempted: z.boolean(),
  rebaseSucceeded: z.boolean(),
  createdAt: z.string(),
  mergedAt: z.string().nullable(),
});

const ConflictPairSchema = z.object({
  entryA: z.string(),
  entryB: z.string(),
  files: z.array(z.string()),
});

const ConflictReportSchema = z.object({
  conflicting: z.array(ConflictPairSchema),
  suggestedOrder: z.array(z.string()),
  autoResolvable: z.boolean(),
});

// === Parallel Execution Schemas ===

const ParallelTaskSchema = z.object({
  agentId: z.string(),
  taskType: z.enum(["code-review", "code-generation", "spec-analysis", "test-generation"]),
  context: AgentExecuteRequestSchema.shape.context,
});

const ParallelExecuteRequestSchema = z.object({
  tasks: z.array(ParallelTaskSchema).min(2).max(5),
  createPrs: z.boolean().default(false),
});

const UpdatePriorityRequestSchema = z.object({
  priority: z.number().int().min(0).max(10),
});
```

#### 3.4.2 Endpoints (5건 추가)

| Method | Path | 설명 | 인증 |
|--------|------|------|:----:|
| POST | `/agents/parallel` | 멀티 에이전트 병렬 실행 | ✅ |
| GET | `/agents/parallel/:id` | 병렬 실행 상태 조회 | ✅ |
| GET | `/agents/queue` | Merge Queue 상태 조회 | ✅ |
| PATCH | `/agents/queue/:id/priority` | Queue entry 우선순위 변경 | ✅ |
| POST | `/agents/queue/process` | 다음 PR merge 실행 | ✅ |

#### 3.4.3 Route 핸들러 패턴

```typescript
// POST /agents/parallel
app.openapi(parallelExecute, async (c) => {
  const { tasks, createPrs } = c.req.valid("json");
  const env = c.env as Env;

  const orchestrator = new AgentOrchestrator(env.DB, sseManager, new McpServerRegistry(env.DB));

  // Runner 선택 (각 task별 자동 선택)
  const tasksWithRunners = await Promise.all(
    tasks.map(async (task) => ({
      ...task,
      runner: await orchestrator.selectRunner(task.taskType, createMockRunner()),
    })),
  );

  if (createPrs) {
    const pipeline = createPrPipeline(env, sseManager);
    orchestrator.setPrPipeline(pipeline);
    const mergeQueue = new MergeQueueService(
      new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO),
      env.DB,
      sseManager,
    );
    orchestrator.setMergeQueue(mergeQueue);
    const result = await orchestrator.executeParallelWithPr(tasksWithRunners);
    return c.json(result);
  }

  const result = await orchestrator.executeParallel(tasksWithRunners);
  return c.json(result);
});

// GET /agents/queue
app.openapi(getQueue, async (c) => {
  const env = c.env as Env;
  const queue = new MergeQueueService(
    new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO),
    env.DB,
    sseManager,
  );
  const entries = await queue.getQueueStatus();
  const conflicts = await queue.detectConflicts();
  return c.json({ entries, conflicts });
});

// POST /agents/queue/process
app.openapi(processQueue, async (c) => {
  const env = c.env as Env;
  const queue = new MergeQueueService(
    new GitHubService(env.GITHUB_TOKEN, env.GITHUB_REPO),
    env.DB,
    sseManager,
  );
  const result = await queue.processNext();
  return c.json(result);
});
```

### 3.5 SSE 이벤트 확장 (packages/api/src/services/sse-manager.ts)

```typescript
// SSEEvent union에 추가
| { event: "agent.queue.updated"; data: QueueUpdatedData }
| { event: "agent.queue.conflict"; data: QueueConflictData }
| { event: "agent.queue.merged"; data: QueueMergedData }
| { event: "agent.queue.rebase"; data: QueueRebaseData }
```

### 3.6 대시보드 UI

#### 3.6.1 MergeQueuePanel.tsx (신규)

```
┌─────────────────────────────────────────────────────────┐
│  Merge Queue                              [Process Next] │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  #1 ● PR #105  agent-a  code-generation    P0  [queued] │
│     └─ 수정: auth.ts, middleware.ts                      │
│                                                          │
│  #2 ● PR #107  agent-c  test-generation    P1  [queued] │
│     └─ 수정: auth.test.ts                               │
│     └─ ⚠️ 충돌: auth.ts ↔ PR #105                       │
│                                                          │
│  #3 ● PR #106  agent-b  spec-analysis     P1  [queued] │
│     └─ 수정: spec.ts, README.md                         │
│     └─ ✅ 충돌 없음                                      │
│                                                          │
│  ─── 완료 ───                                            │
│  ✅ PR #103  agent-d  code-review    merged 2m ago       │
│  ✅ PR #101  agent-a  code-gen       merged 5m ago       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**컴포넌트 구조**:

```typescript
interface MergeQueuePanelProps {
  // SSE로 실시간 업데이트
}

// SSE 이벤트 핸들링:
// agent.queue.updated → entries 갱신
// agent.queue.conflict → 충돌 표시 갱신
// agent.queue.merged → 완료 목록으로 이동
// agent.queue.rebase → rebase 결과 표시
```

#### 3.6.2 ConflictDiagram.tsx (신규)

충돌하는 PR 간 파일 겹침을 시각적으로 표시:

```
  PR #105 ──── auth.ts ──── PR #107
              middleware.ts

  PR #106 (충돌 없음)
```

간단한 HTML/CSS 기반 다이어그램 (라이브러리 추가 없음):

```typescript
interface ConflictDiagramProps {
  conflicts: ConflictReport;
  entries: MergeQueueEntry[];
}
```

#### 3.6.3 ParallelExecutionForm.tsx (신규)

여러 에이전트에 동시 작업 요청하는 폼:

```typescript
interface ParallelExecutionFormProps {
  agents: AgentRegistration[];
  onSubmit: (tasks: ParallelTaskSchema[], createPrs: boolean) => void;
}

// UI: 에이전트 선택(체크박스) → taskType 선택 → context 입력 → createPrs 토글 → 실행
```

#### 3.6.4 agents/page.tsx 통합

기존 agents/page.tsx에 탭 추가:

```
[Agents] [Execute] [PRs] [Merge Queue] [Parallel]
                          ^^^^^^^^^^^   ^^^^^^^^
                          F68 신규       F68 신규
```

### 3.7 F68 테스트 설계 (~28건)

| 파일 | 테스트 | 건수 |
|------|--------|:----:|
| `merge-queue.test.ts` | enqueue, detectConflicts(충돌 있음/없음), calculateMergeOrder, processNext(성공/rebase/실패), getQueueStatus, updatePriority, reorderQueue, SSE 이벤트 | 10 |
| `agent-orchestrator-parallel.test.ts` | executeParallel(전체 성공/부분 실패), executeParallelWithPr, PR+Queue 연동, D1 레코드 생성 | 6 |
| `github-extended.test.ts` | getModifiedFiles, updateBranch(성공/실패), getPrStatuses | 4 |
| `agent-routes-queue.test.ts` | POST /parallel, GET /parallel/:id, GET /queue, PATCH /queue/:id/priority, POST /queue/process | 5 |
| `MergeQueuePanel.test.tsx` | 큐 렌더링, 충돌 표시, Process Next 버튼, SSE 업데이트 | 3 |

---

## 4. D1 Migration 0008 (packages/api/migrations/0008_merge_queue.sql)

```sql
-- Sprint 14: Merge Queue + Parallel Executions
-- F68: 멀티 에이전트 동시 PR 충돌 해결

CREATE TABLE merge_queue (
  id TEXT PRIMARY KEY,
  pr_record_id TEXT NOT NULL REFERENCES agent_prs(id),
  pr_number INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL,
  modified_files TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'queued',
  conflicts_with TEXT DEFAULT '[]',
  rebase_attempted INTEGER DEFAULT 0,
  rebase_succeeded INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  merged_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_merge_queue_status ON merge_queue(status);
CREATE INDEX idx_merge_queue_position ON merge_queue(position);
CREATE INDEX idx_merge_queue_pr ON merge_queue(pr_number);

CREATE TABLE parallel_executions (
  id TEXT PRIMARY KEY,
  task_ids TEXT NOT NULL DEFAULT '[]',
  agent_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'running',
  total_tasks INTEGER NOT NULL,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX idx_parallel_status ON parallel_executions(status);
```

**총 D1 테이블**: 13 (기존) + 2 = **15개**

---

## 5. Shared Types 확장 요약 (packages/shared/src/agent.ts)

Sprint 14에서 추가되는 타입:

| 카테고리 | 타입명 | 용도 |
|---------|--------|------|
| MCP Resources | `McpResource` | 리소스 메타데이터 |
| MCP Resources | `McpResourceTemplate` | 동적 리소스 템플릿 |
| MCP Resources | `McpResourceContent` | 리소스 내용 (text/blob) |
| MCP Resources | `McpResourceSubscription` | 구독 정보 |
| Merge Queue | `MergeQueueEntry` | Queue entry |
| Merge Queue | `MergeQueueStatus` | Queue 상태 enum |
| Merge Queue | `ConflictReport` | 충돌 분석 결과 |
| Merge Queue | `ConflictPair` | 충돌 PR 쌍 |
| Parallel | `ParallelExecution` | 병렬 실행 레코드 |
| Parallel | `ParallelExecutionResult` | 병렬 실행 결과 |
| Parallel | `ParallelPrResult` | 병렬 + PR 결과 |
| SSE | `QueueUpdatedData` | Queue 변경 이벤트 |
| SSE | `QueueConflictData` | 충돌 감지 이벤트 |
| SSE | `QueueMergedData` | Merge 완료 이벤트 |
| SSE | `QueueRebaseData` | Rebase 결과 이벤트 |
| SSE | `McpResourceUpdatedData` | 리소스 변경 이벤트 |

---

## 6. Implementation Order

```
Phase A: MCP Resources + Notifications (F67) — W1 담당
  A1. shared/agent.ts — McpResource, McpResourceContent, McpResourceTemplate 타입 추가
  A2. McpRunner — listResources 실제 구현 + readResource + listResourceTemplates
  A3. McpRunner — subscribeResource + unsubscribeResource + onNotification
  A4. McpTransport — SseTransport.processMessage notification 분기
  A5. mcp-resources.ts (신규) — McpResourcesClient 전체
  A6. schemas/mcp.ts — Resource 관련 Zod 스키마 4개
  A7. routes/mcp.ts — 4 endpoints (resources, templates, read, subscribe)
  A8. SSEManager — mcp.resource.updated 이벤트 추가
  A9. McpResourcesPanel.tsx + ResourceViewer.tsx (신규)
  A10. workspace/page.tsx — Resources 탭 추가
  A11. api-client.ts — 4 API 함수 추가
  A12. 테스트 — mcp-resources + mcp-runner + routes + UI (20건)

Phase B: 멀티 에이전트 동시 PR (F68) — W2 담당
  B1. shared/agent.ts — MergeQueue + Parallel + SSE 타입 추가
  B2. GitHubService — getModifiedFiles + updateBranch + getPrStatuses
  B3. merge-queue.ts (신규) — MergeQueueService 전체
  B4. AgentOrchestrator — setMergeQueue + executeParallel + executeParallelWithPr
  B5. PrPipelineService — merge queue 연동 (enqueue 호출)
  B6. schemas/agent.ts — MergeQueue + Parallel + UpdatePriority 스키마
  B7. routes/agent.ts — 5 endpoints (parallel, queue)
  B8. SSEManager — agent.queue.* 이벤트 4종 추가
  B9. D1 migration 0008 — merge_queue + parallel_executions
  B10. MergeQueuePanel.tsx + ConflictDiagram.tsx + ParallelExecutionForm.tsx (신규)
  B11. agents/page.tsx — Merge Queue 탭 + Parallel 탭 추가
  B12. api-client.ts — queue + parallel 관련 API 함수 추가
  B13. 테스트 — merge-queue + orchestrator + github + routes + UI (28건)

Phase C: 릴리스 + Phase 3 기반 (F69) — Leader 담당
  C1. Sprint 13 미완료 D1 migration 0007 remote 적용
  C2. D1 migration 0008 remote 적용
  C3. CHANGELOG v1.2.0 작성
  C4. package.json version bump (root, api, web)
  C5. Workers + Pages 프로덕션 배포
  C6. Smoke test
  C7. multitenancy.design.md 작성 (Phase 3 설계)
  C8. phase-3-roadmap.md 작성
  C9. SPEC.md + CLAUDE.md 갱신
  C10. E2E 테스트 — merge-queue + mcp-resources (5건)
  C11. API 통합 테스트 (5건)
  C12. git tag v1.2.0
```

---

## 7. Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 |
|--------|------|----------|
| **W1** (MCP Resources) | `mcp-resources.ts`, `mcp-runner.ts` Resources 메서드, `mcp-transport.ts` notification, `routes/mcp.ts` Resources endpoints, `schemas/mcp.ts` Resources 스키마, `McpResourcesPanel.tsx`, `ResourceViewer.tsx`, `workspace/page.tsx` Resources 탭, 관련 테스트 | `merge-queue.ts`, `routes/agent.ts` parallel/queue, `agents/page.tsx`, `MergeQueuePanel.tsx`, `ConflictDiagram.tsx`, `ParallelExecutionForm.tsx` |
| **W2** (Merge Queue) | `merge-queue.ts`, `agent-orchestrator.ts` parallel 메서드, `github.ts` 3개 신규 메서드, `pr-pipeline.ts` queue 연동, `routes/agent.ts` queue/parallel endpoints, `schemas/agent.ts` Queue/Parallel 스키마, `MergeQueuePanel.tsx`, `ConflictDiagram.tsx`, `ParallelExecutionForm.tsx`, `agents/page.tsx` Queue/Parallel 탭, 관련 테스트 | `mcp-*.ts`, `routes/mcp.ts`, `workspace/page.tsx`, `McpResourcesPanel.tsx`, `ResourceViewer.tsx` |
| **Leader** | D1 migration 0008, `shared/agent.ts` 전체 타입, `sse-manager.ts` 이벤트 5종, `api-client.ts` 전체 함수, SPEC/CLAUDE.md, CHANGELOG, multitenancy.design.md, phase-3-roadmap.md, 통합 검증, E2E/통합 테스트, 릴리스 | — |

---

## 8. Deliverables Summary

### 8.1 파일 변경 총합

| 카테고리 | 신규 | 수정 |
|---------|:----:|:----:|
| API 서비스 | 2 (mcp-resources.ts, merge-queue.ts) | 5 (mcp-runner, mcp-transport, github, agent-orchestrator, pr-pipeline) |
| API 라우트 | 0 | 2 (mcp.ts, agent.ts) |
| API 스키마 | 0 | 2 (mcp.ts, agent.ts) |
| API 기타 | 1 (migration 0008) | 1 (sse-manager.ts) |
| Shared | 0 | 1 (agent.ts) |
| Web 컴포넌트 | 5 (McpResourcesPanel, ResourceViewer, MergeQueuePanel, ConflictDiagram, ParallelExecutionForm) | 0 |
| Web 페이지 | 0 | 2 (workspace/page.tsx, agents/page.tsx) |
| Web 기타 | 0 | 1 (api-client.ts) |
| 문서 | 2 (multitenancy.design.md, phase-3-roadmap.md) | 3 (CHANGELOG, SPEC.md, CLAUDE.md) |
| **합계** | **10** | **17** |

### 8.2 테스트 예상

| F# | 단위 | 통합 | E2E | 합계 |
|----|:----:|:----:|:---:|:----:|
| F67 MCP Resources | 12 | 4 | 2 | 18 |
| F68 Merge Queue | 16 | 5 | 3 | 24 |
| F69 릴리스 | 0 | 5 | 2 | 7 |
| **합계** | **28** | **14** | **7** | **49** |

### 8.3 최종 수치 (Sprint 14 완료 후)

| 항목 | 현재 (v1.1.0) | 예상 (v1.2.0) |
|------|:------------:|:------------:|
| 전체 테스트 | 388 | ~437 |
| E2E specs | 20 | 27 |
| API endpoints | 41 | 50 |
| API 서비스 | 17 | 19 |
| D1 테이블 | 13 | 15 |
| SSE 이벤트 | 8 | 13 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F67~F69 상세 설계 (MCP Resources + Merge Queue + Phase 3 기반) | Sinclair Seo |
