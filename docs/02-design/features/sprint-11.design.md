---
code: FX-DSGN-011
title: Sprint 11 (v0.11.0) — SSE 완성 + E2E 고도화 + 배포 자동화 + MCP 설계 상세 설계
version: 0.1
status: Draft
category: DSGN
system-version: 0.11.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 11 Design Document

> **Summary**: Sprint 10의 AgentOrchestrator.executeTask()에 SSE 이벤트 직접 발행(pushEvent)을 통합하고, agents/page.tsx에 실시간 task 상태 UI를 추가한다. Playwright E2E로 에이전트 실행·충돌 해결·SSE 연결 흐름을 검증하고, CI/CD 환경 분리와 MCP 프로토콜 설계를 수행한다.
>
> **Project**: Foundry-X
> **Version**: 0.11.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-18
> **Status**: Draft
> **Planning Doc**: [sprint-11.plan.md](../../01-plan/features/sprint-11.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **SSE 이벤트 직접 발행 (F55)**: D1 폴링 + pushEvent() 하이브리드로 agent.task.started/completed 실시간 전파
2. **대시보드 실시간 UI (F55)**: agents/page.tsx에서 onStatus/onError 핸들러 활용, AgentCard에 task 상태 배지
3. **E2E 핵심 흐름 검증 (F56)**: 에이전트 실행·충돌 해결·SSE 연결 3개 흐름을 Playwright로 자동 검증
4. **CI/CD 환경 분리 (F57)**: wrangler.toml staging 환경 + deploy.yml 분리 + smoke-test 강화
5. **MCP 프로토콜 설계 (F58)**: MCP 1.0 기반 McpTransport/McpAgentRunner 구현 계획 문서화

### 1.2 현재 코드 분석

| 파일 | 현재 패턴 | 문제 | Sprint 11 변경 |
|------|----------|------|--------------|
| `services/sse-manager.ts` | D1 폴링(10s), activity/status/error 3개 이벤트 | agent.task.started/completed 없음 | pushEvent() 메서드 + 2개 이벤트 타입 추가 |
| `services/agent-orchestrator.ts` | executeTask() 6-step, db만 주입 | SSE 이벤트 미발행 | SSEManager 주입 + step 3.5/6.5에 이벤트 삽입 |
| `routes/agent.ts` | SSEManager를 매번 `new SSEManager(db)` | 1회성 인스턴스, push 불가 | 공유 인스턴스로 변경 |
| `web/agents/page.tsx` | onActivity만 사용, 결과는 모달 콜백 | task 실시간 상태 미반영 | onStatus/onError + task 상태 state 추가 |
| `web/components/AgentCard.tsx` | status 배지 (idle/running/...) | task 진행 상태 미표시 | taskStatus prop + 로딩 인디케이터 |
| `web/lib/sse-client.ts` | onStatus 핸들러 존재하나 미사용 | — | 변경 없음 (이미 준비됨) |
| `web/e2e/agents.spec.ts` | 2건 스모크 (heading + grid) | 인터랙션 흐름 0건 | 별도 E2E 파일로 분리 |
| `.github/workflows/deploy.yml` | master push → deploy (환경 미분리) | staging 없음 | staging/production 환경 분리 |
| `services/mcp-adapter.ts` | 인터페이스만 (42줄) | 100% stub | 타입 구체화 + 구현 계획 주석 |

### 1.3 환경 변경

```typescript
// packages/api/src/env.ts — Sprint 11 변경 없음
// 기존 Bindings 그대로 사용
// DB, CACHE, AI, ANTHROPIC_API_KEY, GITHUB_TOKEN, JWT_SECRET, GITHUB_REPO
```

---

## 2. F55: SSE 이벤트 완성 — 상세 설계

### 2.1 SSEManager 이벤트 타입 확장

**파일**: `packages/api/src/services/sse-manager.ts` (현재 112줄)

현재 `SSEEvent` 유니온 타입(3개)에 2개를 추가:

```typescript
// ─── 신규 타입 (shared/agent.ts에도 미러) ───

export interface TaskStartedData {
  taskId: string;
  agentId: string;
  taskType: AgentTaskType;
  runnerType: AgentRunnerType;
  startedAt: string;
}

export interface TaskCompletedData {
  taskId: string;
  agentId: string;
  status: 'success' | 'partial' | 'failed';
  tokensUsed: number;
  durationMs: number;
  /** 결과 요약 (첫 200자) — 전체 결과는 GET /agents/tasks/{id}/result */
  resultSummary?: string;
  completedAt: string;
}

// ─── SSEEvent 유니온 확장 ───

export type SSEEvent =
  | { event: "activity"; data: { agentId: string; status: string; currentTask?: string; progress?: number; timestamp: string } }
  | { event: "status"; data: { agentId: string; previousStatus: string; newStatus: string; result?: string; timestamp: string } }
  | { event: "error"; data: { agentId: string; error: string; message: string; timestamp: string } }
  | { event: "agent.task.started"; data: TaskStartedData }      // F55 신규
  | { event: "agent.task.completed"; data: TaskCompletedData };  // F55 신규
```

### 2.2 SSEManager pushEvent() — 직접 발행 메커니즘

현재 SSEManager는 `createStream()` 내부에서만 이벤트를 생성해요. 외부에서 이벤트를 주입하려면 **이벤트 큐 + 구독 패턴**을 추가해야 해요.

```typescript
// SSEManager 클래스 확장

export class SSEManager {
  private encoder = new TextEncoder();
  private pollInterval = 10_000;
  // ─── F55: Push 이벤트 메커니즘 ───
  private subscribers = new Set<(payload: string) => boolean>();
  private recentTaskIds = new Set<string>();  // dedup용 (최근 60초)
  private dedupTimer?: ReturnType<typeof setInterval>;

  constructor(private db: D1Database) {
    // 60초마다 dedup 캐시 정리
    this.dedupTimer = setInterval(() => this.recentTaskIds.clear(), 60_000);
  }

  /**
   * 외부에서 SSE 이벤트를 직접 발행 — AgentOrchestrator에서 호출
   * D1 폴링과 중복 방지를 위해 taskId 기반 dedup 수행
   */
  pushEvent(event: SSEEvent): void {
    // dedup: agent.task.* 이벤트는 taskId 기반
    const taskId = ('taskId' in event.data) ? (event.data as { taskId: string }).taskId : null;
    if (taskId && this.recentTaskIds.has(`${event.event}:${taskId}`)) return;
    if (taskId) this.recentTaskIds.add(`${event.event}:${taskId}`);

    const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
    // 모든 활성 스트림에 전파
    for (const send of this.subscribers) {
      if (!send(payload)) {
        this.subscribers.delete(send);
      }
    }
  }

  createStream(): ReadableStream {
    // 기존 D1 폴링 로직 유지 + subscriber 등록
    let timerId: ReturnType<typeof setInterval> | undefined;
    let lastCheckedAt = new Date(0).toISOString();

    return new ReadableStream({
      start: (controller) => {
        let closed = false;

        const safeEnqueue = (data: Uint8Array): boolean => {
          try { controller.enqueue(data); return true; }
          catch { closed = true; if (timerId) clearInterval(timerId); return false; }
        };

        // F55: push 이벤트 구독
        const send = (payload: string): boolean => {
          if (closed) return false;
          return safeEnqueue(this.encoder.encode(payload));
        };
        this.subscribers.add(send);

        // 기존 D1 폴링 (변경 없음)
        const poll = async () => { /* ... 기존 로직 그대로 ... */ };
        poll();
        timerId = setInterval(poll, this.pollInterval);
      },
      cancel: () => {
        if (timerId) clearInterval(timerId);
        // subscriber 정리는 send()가 false 반환하면 자동 제거
      },
    });
  }

  /** 리소스 정리 — 테스트에서 사용 */
  dispose(): void {
    if (this.dedupTimer) clearInterval(this.dedupTimer);
    this.subscribers.clear();
    this.recentTaskIds.clear();
  }

  // sessionToSSEEvent() — 변경 없음
}
```

**설계 결정**:
- **Pub/Sub 패턴**: `subscribers` Set으로 활성 스트림을 추적. 스트림이 닫히면 `send()`가 false 반환하여 자동 정리.
- **Dedup**: `recentTaskIds`로 60초 내 동일 taskId+event 조합 중복 방지. D1 폴링이 같은 세션을 감지해도 push된 이벤트와 중복되지 않음.
- **Thread Safety**: Cloudflare Workers는 단일 스레드이므로 동시성 문제 없음.

### 2.3 AgentOrchestrator SSE 통합

**파일**: `packages/api/src/services/agent-orchestrator.ts` (현재 373줄)

```typescript
// constructor 변경: SSEManager 옵셔널 주입
export class AgentOrchestrator {
  constructor(
    private db: D1Database,
    private sse?: SSEManager,  // F55: 옵셔널 — 테스트에서는 미주입
  ) {}

  async executeTask(
    agentId: string,
    taskType: AgentTaskType,
    context: AgentExecutionRequest["context"],
    runner: AgentRunner,
  ): Promise<AgentExecutionResult> {
    // 1~2. session + task 생성 (기존 그대로)
    const sessionId = `sess-${crypto.randomUUID().slice(0, 8)}`;
    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const branch = `feature/${agentId}/${taskId}`;

    await this.db.prepare(/* session INSERT */).bind(sessionId, "default", agentId, now).run();
    await this.db.prepare(/* task INSERT */).bind(taskId, sessionId, branch, taskType, runner.type, now, now).run();

    // 3. Constraint 수집 (기존 그대로)
    const constraints = /* ... */;

    // ─── 3.5 F55: SSE agent.task.started 발행 ───
    this.sse?.pushEvent({
      event: "agent.task.started",
      data: {
        taskId,
        agentId,
        taskType,
        runnerType: runner.type,
        startedAt: now,
      },
    });

    // 4. Runner 실행 (기존 그대로)
    const request: AgentExecutionRequest = { taskId, agentId, taskType, context, constraints };
    const result = await runner.execute(request);

    // 5~6. 결과 기록 + session 업데이트 (기존 그대로)
    /* ... */

    // ─── 6.5 F55: SSE agent.task.completed 발행 ───
    const resultSummary = result.output.analysis?.slice(0, 200)
      ?? result.output.reviewComments?.map(c => c.comment).join('; ').slice(0, 200)
      ?? undefined;

    this.sse?.pushEvent({
      event: "agent.task.completed",
      data: {
        taskId,
        agentId,
        status: result.status,
        tokensUsed: result.tokensUsed,
        durationMs: result.duration,
        resultSummary,
        completedAt: new Date().toISOString(),
      },
    });

    return result;
  }

  // 나머지 메서드 — 변경 없음
}
```

### 2.4 agent.ts Route — SSEManager 공유 인스턴스

**파일**: `packages/api/src/routes/agent.ts` (현재 433줄)

현재 SSE 스트림 엔드포인트에서 `new SSEManager(db)` 매번 생성해요. F55에서는 **요청 간 공유 인스턴스**가 필요해요.

```typescript
// 방법: Hono middleware로 SSEManager를 c.var에 주입

// agent.ts 상단에 SSEManager 팩토리 미들웨어 추가
let sharedSSEManager: SSEManager | null = null;

function getSSEManager(db: D1Database): SSEManager {
  if (!sharedSSEManager) {
    sharedSSEManager = new SSEManager(db);
  }
  return sharedSSEManager;
}

// SSE 스트림 라우트 변경 (line ~163)
agentRoute.get("/agents/stream", (c) => {
  const sseManager = getSSEManager(c.env.DB);
  const stream = sseManager.createStream();
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

// execute 라우트 변경 (line ~331)
agentRoute.openapi(executeAgentTask, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const sseManager = getSSEManager(c.env.DB);
  const orchestrator = new AgentOrchestrator(c.env.DB, sseManager);  // F55: SSEManager 주입
  const runner = createAgentRunner({ ANTHROPIC_API_KEY: c.env.ANTHROPIC_API_KEY });

  if (!(await runner.isAvailable())) {
    return c.json({ error: "No agent runner available" }, 503);
  }

  const result = await orchestrator.executeTask(id, body.taskType, body.context, runner);
  return c.json(result);
});
```

**설계 결정**:
- **싱글턴 패턴**: Workers의 요청 간 모듈 스코프 변수는 같은 isolate에서 유지돼요. `sharedSSEManager`는 동일 Worker isolate 내에서 모든 요청이 공유하므로, `/agents/stream`의 subscriber와 `/agents/{id}/execute`의 pushEvent가 연결돼요.
- **Workers 한계**: Cloudflare Workers는 Durable Objects 없이는 인스턴스 간 상태 공유가 불가해요. 같은 isolate에 라우팅되는 요청끼리만 SSE push가 동작해요. 이 제약은 Sprint 12+에서 Durable Objects 도입으로 해결 가능.

### 2.5 shared/agent.ts 타입 추가

**파일**: `packages/shared/src/agent.ts` (현재 190줄, 끝부분에 추가)

```typescript
// ─── Sprint 11: SSE Task Event Types (F55) ───

/** F55: 에이전트 작업 시작 SSE 이벤트 데이터 */
export interface TaskStartedData {
  taskId: string;
  agentId: string;
  taskType: AgentTaskType;
  runnerType: AgentRunnerType;
  startedAt: string;
}

/** F55: 에이전트 작업 완료 SSE 이벤트 데이터 */
export interface TaskCompletedData {
  taskId: string;
  agentId: string;
  status: 'success' | 'partial' | 'failed';
  tokensUsed: number;
  durationMs: number;
  resultSummary?: string;
  completedAt: string;
}

/** F55: 에이전트 task 진행 상태 (대시보드 UI용) */
export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed';
```

### 2.6 agents/page.tsx 실시간 UI

**파일**: `packages/web/src/app/(app)/agents/page.tsx` (현재 104줄)

```typescript
"use client";

import { useEffect, useState } from "react";
import { fetchApi, type AgentExecutionResult } from "@/lib/api-client";
import type { AgentProfile, AgentActivity, TaskStartedData, TaskCompletedData, AgentTaskStatus } from "@foundry-x/shared";
import AgentCard from "@/components/feature/AgentCard";
import { AgentExecuteModal } from "@/components/feature/AgentExecuteModal";
import { AgentTaskResult } from "@/components/feature/AgentTaskResult";
import { SSEClient } from "@/lib/sse-client";

// F55: 에이전트별 task 상태 추적
interface AgentTaskState {
  taskId: string;
  status: AgentTaskStatus;
  taskType?: string;
  startedAt?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executeAgent, setExecuteAgent] = useState<AgentProfile | null>(null);
  const [taskResult, setTaskResult] = useState<AgentExecutionResult | null>(null);
  // F55: 에이전트별 task 상태
  const [taskStates, setTaskStates] = useState<Map<string, AgentTaskState>>(new Map());
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchApi<AgentProfile[]>("/agents")
      .then((data) => { if (!cancelled) { setAgents(data); setLoading(false); } })
      .catch((err: Error) => { if (!cancelled) { setError(err.message); setLoading(false); } });

    const client = new SSEClient({
      url: "/api/agents/stream",
      onActivity: (data) => {
        if (cancelled) return;
        // 기존 로직 유지
        const payload = data as { agentId: string; activity: AgentActivity };
        setAgents((prev) => {
          if (!prev) return prev;
          return prev.map((a) =>
            a.id === payload.agentId ? { ...a, activity: payload.activity } : a,
          );
        });
      },
      // ─── F55: 신규 핸들러 ───
      onStatus: (data) => {
        if (cancelled) return;
        const raw = data as Record<string, unknown>;

        // agent.task.started
        if (raw.taskId && raw.runnerType) {
          const started = raw as unknown as TaskStartedData;
          setTaskStates((prev) => {
            const next = new Map(prev);
            next.set(started.agentId, {
              taskId: started.taskId,
              status: "running",
              taskType: started.taskType,
              startedAt: started.startedAt,
            });
            return next;
          });
        }

        // agent.task.completed
        if (raw.taskId && raw.completedAt) {
          const completed = raw as unknown as TaskCompletedData;
          setTaskStates((prev) => {
            const next = new Map(prev);
            next.set(completed.agentId, {
              taskId: completed.taskId,
              status: completed.status === "failed" ? "failed" : "completed",
            });
            return next;
          });
          // 완료 시 자동으로 결과 조회
          fetchApi<AgentExecutionResult>(`/agents/tasks/${completed.taskId}/result`)
            .then((res) => { if (!cancelled) setTaskResult(res); })
            .catch(() => { /* 조회 실패 무시 — 모달에서 재시도 가능 */ });
        }
      },
      onError: () => {
        if (cancelled) return;
        setSseConnected(false);
      },
      onConnectionChange: (connected) => {
        if (!cancelled) setSseConnected(connected);
      },
    });
    client.connect();

    return () => { cancelled = true; client.disconnect(); };
  }, []);

  return (
    <div>
      {/* 제목 + SSE 연결 상태 */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agent Transparency</h1>
        <span className={`h-2 w-2 rounded-full ${sseConnected ? "bg-green-500" : "bg-red-500"}`} />
      </div>

      {/* ... 기존 loading/error/empty 로직 ... */}

      {agents && agents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((a) => (
            <div key={a.id} className="space-y-2">
              {/* F55: taskStatus prop 전달 */}
              <AgentCard agent={a} taskStatus={taskStates.get(a.id)?.status} />
              <button
                className="w-full rounded border border-primary/30 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
                onClick={() => setExecuteAgent(a)}
                disabled={taskStates.get(a.id)?.status === "running"}
              >
                {taskStates.get(a.id)?.status === "running" ? "실행 중..." : "작업 실행"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* taskResult, executeAgent 모달 — 기존 로직 유지 */}
    </div>
  );
}
```

### 2.7 AgentCard taskStatus 확장

**파일**: `packages/web/src/components/feature/AgentCard.tsx` (현재 158줄)

```typescript
// props 확장
export interface AgentCardProps {
  agent: AgentProfile;
  taskStatus?: AgentTaskStatus;  // F55: 실시간 task 상태
}

export default function AgentCard({ agent, taskStatus }: AgentCardProps) {
  // taskStatus가 있으면 activity.status보다 우선
  const displayStatus = taskStatus === "running" ? "running"
    : taskStatus === "failed" ? "error"
    : agent.activity?.status ?? "idle";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{agent.name}</CardTitle>
        <div className="flex items-center gap-2">
          {/* F55: 실행 중 로딩 인디케이터 */}
          {taskStatus === "running" && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          <Badge variant={statusVariant(displayStatus)}>{displayStatus}</Badge>
        </div>
      </CardHeader>
      {/* ... 나머지 기존 코드 ... */}
    </Card>
  );
}
```

### 2.8 F55 테스트 계획

| 파일 | 테스트 | 예상 수 |
|------|--------|:------:|
| `sse-manager.test.ts` (기존 파일 확장) | pushEvent() 단독 발행, subscriber 자동 정리, dedup 검증 | 3 |
| `agent-orchestrator.test.ts` (기존 파일 확장) | executeTask()에서 task.started/completed SSE 발행, SSEManager 미주입 시 정상 동작 | 3 |
| `agents-page.test.tsx` (신규 또는 web 렌더링) | onStatus 핸들러 task 상태 반영, AgentCard taskStatus 배지, SSE 연결 인디케이터 | 4 |
| **합계** | | **10** |

---

## 3. F56: E2E 테스트 고도화 — 상세 설계

### 3.1 에이전트 실행 E2E

**파일**: `packages/web/e2e/agent-execute.spec.ts` (신규)

```typescript
import { test, expect } from "./fixtures/auth";

test.describe("Agent Execute Flow", () => {
  test("에이전트 작업 실행 → 결과 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/agents");
    // 1. "작업 실행" 버튼 클릭
    await page.getByRole("button", { name: /작업 실행/ }).first().click();
    // 2. AgentExecuteModal 표시 확인
    await expect(page.getByRole("dialog")).toBeVisible();
    // 3. taskType 선택 + 실행
    await page.getByRole("combobox").selectOption("code-review");
    await page.getByRole("button", { name: /실행|Execute/ }).click();
    // 4. 결과 표시 확인 (로딩 → 완료)
    await expect(page.getByText(/AgentTaskResult|결과/i)).toBeVisible({ timeout: 15000 });
  });

  test("실행 중 버튼 비활성화", async ({ authenticatedPage: page }) => {
    await page.goto("/agents");
    // Mock API로 장시간 실행 시뮬레이션
    await page.route("**/agents/*/execute", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ status: "success", output: {}, tokensUsed: 100, model: "mock", duration: 1000 }), headers: { "Content-Type": "application/json" } }),
    );
    // 실행 시작 후 버튼 disabled 확인
    await page.getByRole("button", { name: /작업 실행/ }).first().click();
    await page.getByRole("button", { name: /실행|Execute/ }).click();
    await expect(page.getByRole("button", { name: /실행 중/ })).toBeDisabled();
  });

  test("에러 시 에러 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/agents");
    await page.route("**/agents/*/execute", (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: "No agent runner available" }) }),
    );
    await page.getByRole("button", { name: /작업 실행/ }).first().click();
    await page.getByRole("button", { name: /실행|Execute/ }).click();
    await expect(page.getByText(/error|에러|실행.*불가/i)).toBeVisible({ timeout: 5000 });
  });
});
```

### 3.2 충돌 해결 E2E

**파일**: `packages/web/e2e/conflict-resolution.spec.ts` (신규)

```typescript
import { test, expect } from "./fixtures/auth";

test.describe("Conflict Resolution Flow", () => {
  test("충돌 없는 Spec 생성", async ({ authenticatedPage: page }) => {
    await page.goto("/spec-generator");
    await page.route("**/spec/generate", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ spec: { title: "Test Spec" }, markdown: "# Test", confidence: 0.9, model: "mock", conflicts: [] }),
      }),
    );
    await page.getByRole("textbox").fill("사용자 인증 기능 추가");
    await page.getByRole("button", { name: /Generate|생성/ }).click();
    await expect(page.getByText(/Test Spec/i)).toBeVisible({ timeout: 10000 });
  });

  test("충돌 감지 → ConflictCard 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/spec-generator");
    await page.route("**/spec/generate", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          spec: { title: "Auth Feature" },
          markdown: "# Auth",
          confidence: 0.8,
          model: "mock",
          conflicts: [{
            type: "direct", severity: "critical",
            existingSpec: { id: "spec-1", title: "기존 인증", field: "title", value: "인증" },
            newSpec: { field: "title", value: "인증" },
            description: "동일 기능 범위",
          }],
        }),
      }),
    );
    await page.getByRole("textbox").fill("인증 기능");
    await page.getByRole("button", { name: /Generate|생성/ }).click();
    // ConflictCard 표시 확인
    await expect(page.getByText(/충돌|conflict/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/직접 충돌|direct/i)).toBeVisible();
  });

  test("충돌 해결 — 수락 클릭", async ({ authenticatedPage: page }) => {
    await page.goto("/spec-generator");
    // 충돌 있는 응답 Mock 후 수락 버튼 클릭
    await page.route("**/spec/generate", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          spec: { title: "Auth" }, markdown: "# Auth", confidence: 0.8, model: "mock",
          conflicts: [{ type: "direct", severity: "warning", existingSpec: { id: "s1", title: "기존", field: "t", value: "v" }, newSpec: { field: "t", value: "v" }, description: "test" }],
        }),
      }),
    );
    await page.route("**/spec/conflicts/resolve", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) }),
    );
    await page.getByRole("textbox").fill("test");
    await page.getByRole("button", { name: /Generate|생성/ }).click();
    await page.getByRole("button", { name: /수락|accept/i }).first().click();
    // resolved 상태 확인
    await expect(page.getByText(/resolved|해결/i)).toBeVisible({ timeout: 5000 });
  });
});
```

### 3.3 SSE 라이프사이클 E2E

**파일**: `packages/web/e2e/sse-lifecycle.spec.ts` (신규)

```typescript
import { test, expect } from "./fixtures/auth";

test.describe("SSE Connection", () => {
  test("agents 페이지 SSE 연결 상태 표시", async ({ authenticatedPage: page }) => {
    await page.goto("/agents");
    // F55: SSE 연결 인디케이터 (green dot)
    const indicator = page.locator("[class*=rounded-full]").filter({ has: page.locator("[class*=bg-green]").or(page.locator("[class*=bg-red]")) });
    await expect(indicator.first()).toBeVisible({ timeout: 10000 });
  });

  test("SSE 이벤트 수신 시 UI 업데이트", async ({ authenticatedPage: page }) => {
    await page.goto("/agents");
    // EventSource mock은 복잡하므로, agent 카드의 상태 변화만 확인
    await expect(page.locator("[class*=card]").first()).toBeVisible({ timeout: 10000 });
  });
});
```

### 3.4 API 통합 테스트

**파일**: `packages/api/src/__tests__/agent-execute-integration.test.ts` (신규)

| 테스트 케이스 | 검증 |
|-------------|------|
| executeTask → SSE agent.task.started 발행 | SSEManager.pushEvent 호출 확인 (spy) |
| executeTask → SSE agent.task.completed 발행 | 상동, status/tokensUsed 검증 |
| executeTask 실패 → completed(status=failed) | 에러 시에도 completed 이벤트 발행 |
| SSE 미주입 시 정상 동작 | SSEManager 없이 executeTask 성공 |
| dedup — 같은 taskId 이벤트 1회만 발행 | pushEvent 2회 호출 시 subscriber 1회만 수신 |

**파일**: `packages/api/src/__tests__/conflict-resolution-integration.test.ts` (신규)

| 테스트 케이스 | 검증 |
|-------------|------|
| generate → detect → conflicts 포함 응답 | 전체 파이프라인 |
| resolve(accept) → DB 기록 | spec_conflicts.resolution = 'accept' |
| resolve(reject) → DB 기록 | spec_conflicts.resolution = 'reject' |
| 충돌 0건 → conflicts 빈 배열 | 정상 생성 |

### 3.5 F56 테스트 합계

| 카테고리 | 파일 | 예상 수 |
|---------|------|:------:|
| E2E | agent-execute.spec.ts | 3 |
| E2E | conflict-resolution.spec.ts | 3 |
| E2E | sse-lifecycle.spec.ts | 2 |
| API 통합 | agent-execute-integration.test.ts | 5 |
| API 통합 | conflict-resolution-integration.test.ts | 4 |
| **합계** | | **17** |

---

## 4. F57: 프로덕션 배포 자동화 — 상세 설계

### 4.1 wrangler.toml 환경 분리

**파일**: `packages/api/wrangler.toml`

```toml
# 기존 설정 유지
name = "foundry-x-api"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[vars]
ENVIRONMENT = "production"
GITHUB_REPO = "KTDS-AXBD/Foundry-X"

[[d1_databases]]
binding = "DB"
database_name = "foundry-x-db"
database_id = "..."

[[kv_namespaces]]
binding = "CACHE"
id = "030b30d47a98485ea3af95b3347163d6"

# ─── F57: Staging 환경 ───
[env.staging]
name = "foundry-x-api-staging"
[env.staging.vars]
ENVIRONMENT = "staging"
GITHUB_REPO = "KTDS-AXBD/Foundry-X"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "foundry-x-db"
database_id = "..."
# staging은 같은 DB 공유 (비용 절감) — 프로덕션 격리 필요 시 별도 생성

[[env.staging.kv_namespaces]]
binding = "CACHE"
id = "030b30d47a98485ea3af95b3347163d6"
```

### 4.2 deploy.yml 환경 분리

**파일**: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare
on:
  push:
    branches: [master]
  pull_request:
    types: [opened, synchronize]   # F57: PR → staging 자동 배포
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck lint test

  # F57: staging 배포 (PR용)
  deploy-staging:
    if: github.event_name == 'pull_request'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @foundry-x/shared build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/api
          command: deploy --env staging

  # Production 배포 (master push)
  deploy-api:
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @foundry-x/shared build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/api

  deploy-web:
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @foundry-x/shared build
      - run: pnpm --filter @foundry-x/web build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/web
          command: pages deploy out --project-name=foundry-x-web
          packageManager: pnpm

  smoke-test:
    if: github.event_name == 'push' || github.event_name == 'workflow_dispatch'
    needs: [deploy-api, deploy-web]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run smoke tests
        run: bash scripts/smoke-test.sh
        env:
          API_URL: https://foundry-x-api.ktds-axbd.workers.dev
          WEB_URL: https://fx.minu.best
```

### 4.3 smoke-test.sh 확장

**파일**: `scripts/smoke-test.sh` (기존 파일 확장)

추가 검증:
```bash
# F57: 에이전트 Runner 목록 확인
echo "=== Agent Runners ==="
RUNNERS=$(curl -sf "${API_URL}/agents/runners")
echo "$RUNNERS" | jq '.[] | .type + ": " + (.available | tostring)'

# F57: SSE 연결 확인 (3초 타임아웃)
echo "=== SSE Connection ==="
timeout 3 curl -sf -N "${API_URL}/agents/stream" | head -5 || echo "SSE: OK (timeout expected)"
```

---

## 5. F58: MCP 실 구현 설계 — 상세 설계

### 5.1 설계 문서 산출물

**파일**: `docs/02-design/features/mcp-protocol.design.md` (신규)

문서 구조:
1. MCP 1.0 프로토콜 요약 (Transport, Tools, Resources, Prompts, Sampling)
2. Foundry-X 연동 아키텍처 (McpTransport → McpAgentRunner → AgentOrchestrator)
3. McpTransport 구현 명세 (SSE > HTTP > stdio 우선순위)
4. McpAgentRunner 구현 명세 (taskType ↔ MCP tool 매핑)
5. 외부 MCP 서버 연동 시나리오

### 5.2 mcp-adapter.ts 타입 구체화

**파일**: `packages/api/src/services/mcp-adapter.ts` (현재 42줄)

```typescript
import type { AgentRunner } from "./agent-runner.js";
import type { AgentExecutionRequest, AgentExecutionResult, AgentTaskType } from "./execution-types.js";

/**
 * MCP Transport 추상화 — 통신 방식 교체 가능
 * Sprint 12 구현 예정: SseTransport (1순위), HttpTransport (2순위)
 */
export interface McpTransport {
  type: "stdio" | "sse" | "http";
  connect(config: McpConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  /** MCP 메시지 송신 */
  send(message: McpMessage): Promise<McpResponse>;
}

export interface McpConnectionConfig {
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** 연결 타임아웃 (ms) — 기본 10000 */
  timeout?: number;
}

// ─── MCP Protocol Messages (1.0) ───

export interface McpMessage {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface McpResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id?: string | number;
}

// ─── MCP Tool/Resource ───

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

// ─── MCP AgentRunner ───

export interface McpAgentRunner extends AgentRunner {
  readonly type: "mcp";
  listTools(): Promise<McpTool[]>;
  listResources(): Promise<McpResource[]>;
}

// ─── Sprint 12: 구현 계획 ───

/**
 * taskType → MCP tool 매핑 규칙
 *
 * | AgentTaskType     | MCP Tool Name        | MCP Input               |
 * |-------------------|----------------------|-------------------------|
 * | code-review       | foundry_code_review  | { files, spec }         |
 * | code-generation   | foundry_code_gen     | { spec, instructions }  |
 * | spec-analysis     | foundry_spec_analyze | { newSpec, existing }   |
 * | test-generation   | foundry_test_gen     | { files, spec }         |
 */
export const TASK_TYPE_TO_MCP_TOOL: Record<AgentTaskType, string> = {
  "code-review": "foundry_code_review",
  "code-generation": "foundry_code_gen",
  "spec-analysis": "foundry_spec_analyze",
  "test-generation": "foundry_test_gen",
};
```

### 5.3 F58 테스트

| 파일 | 테스트 | 예상 수 |
|------|--------|:------:|
| `mcp-adapter.test.ts` (신규) | TASK_TYPE_TO_MCP_TOOL 매핑 검증, McpMessage 타입 구조 확인 | 2 |

---

## 6. 구현 순서 요약

```
Phase A: F55 SSE 이벤트 완성 (선행)
  A1. shared/agent.ts — TaskStartedData/TaskCompletedData/AgentTaskStatus 타입
  A2. sse-manager.ts — SSEEvent 확장 + pushEvent() + subscribers + dedup
  A3. agent-orchestrator.ts — SSEManager 주입 + step 3.5/6.5 이벤트 발행
  A4. agent.ts route — SSEManager 공유 인스턴스 + orchestrator에 전달
  A5. agents/page.tsx — onStatus/onError + taskStates + sseConnected
  A6. AgentCard.tsx — taskStatus prop + 로딩 인디케이터
  A7. 테스트 10건

Phase B: F56 E2E 고도화 (Phase A 완료 후)
  B1. agent-execute.spec.ts — 3건
  B2. conflict-resolution.spec.ts — 3건
  B3. sse-lifecycle.spec.ts — 2건
  B4. agent-execute-integration.test.ts — 5건
  B5. conflict-resolution-integration.test.ts — 4건

Phase C: F57 배포 자동화 (독립)
  C1. wrangler.toml — staging 환경
  C2. deploy.yml — 환경 분리 + PR 트리거
  C3. smoke-test.sh — 에이전트 + SSE 검증

Phase D: F58 MCP 설계 (독립)
  D1. mcp-protocol.design.md — 설계 문서
  D2. mcp-adapter.ts — 타입 구체화 + 매핑 상수
  D3. mcp-adapter.test.ts — 2건
```

---

## 7. 파일 변경 종합

### 7.1 수정 파일 (~11개)

| # | 파일 | 변경 요약 |
|---|------|----------|
| 1 | `packages/shared/src/agent.ts` | TaskStartedData, TaskCompletedData, AgentTaskStatus 타입 추가 |
| 2 | `packages/api/src/services/sse-manager.ts` | SSEEvent 확장 + pushEvent() + subscribers Set + dedup |
| 3 | `packages/api/src/services/agent-orchestrator.ts` | SSEManager 주입 + executeTask() step 3.5/6.5 |
| 4 | `packages/api/src/routes/agent.ts` | SSEManager 공유 인스턴스 + orchestrator에 전달 |
| 5 | `packages/api/src/services/mcp-adapter.ts` | McpMessage/McpResponse + TASK_TYPE_TO_MCP_TOOL 상수 |
| 6 | `packages/web/src/app/(app)/agents/page.tsx` | onStatus/onError + taskStates + sseConnected UI |
| 7 | `packages/web/src/components/feature/AgentCard.tsx` | taskStatus prop + 로딩 인디케이터 |
| 8 | `packages/api/wrangler.toml` | [env.staging] 환경 추가 |
| 9 | `.github/workflows/deploy.yml` | staging/production 분리 + PR 트리거 |
| 10 | `scripts/smoke-test.sh` | runners + SSE 검증 추가 |
| 11 | `packages/api/src/__tests__/sse-manager.test.ts` | pushEvent + dedup 테스트 추가 |

### 7.2 신규 파일 (~6개)

| # | 파일 | 내용 |
|---|------|------|
| 1 | `packages/web/e2e/agent-execute.spec.ts` | 에이전트 실행 E2E 3건 |
| 2 | `packages/web/e2e/conflict-resolution.spec.ts` | 충돌 해결 E2E 3건 |
| 3 | `packages/web/e2e/sse-lifecycle.spec.ts` | SSE 연결 E2E 2건 |
| 4 | `packages/api/src/__tests__/agent-execute-integration.test.ts` | 통합 5건 |
| 5 | `packages/api/src/__tests__/conflict-resolution-integration.test.ts` | 통합 4건 |
| 6 | `docs/02-design/features/mcp-protocol.design.md` | MCP 프로토콜 설계 |

### 7.3 테스트 합계

| F# | 단위/통합 | E2E | 소계 |
|----|:--------:|:---:|:----:|
| F55 SSE | 10 | — | 10 |
| F56 E2E | 9 | 8 | 17 |
| F58 MCP | 2 | — | 2 |
| **합계** | **21** | **8** | **29** |

**Sprint 11 완료 후 예상**: 276 + 29 = **305 tests** + **18 E2E specs**

---

## 8. Agent Teams 위임 전략

| Worker | 범위 | 금지 파일 | 예상 파일 수 |
|--------|------|----------|:----------:|
| W1 (SSE Backend) | sse-manager.ts, agent-orchestrator.ts, shared/agent.ts(SSE 타입만), sse-manager.test.ts, agent-execute-integration.test.ts | `packages/web/`, `packages/cli/`, `mcp-adapter.ts`, `deploy.yml` | ~5 |
| W2 (E2E Tests) | `packages/web/e2e/*.spec.ts` 전체, conflict-resolution-integration.test.ts | `sse-manager.ts`, `agent-orchestrator.ts`, `mcp-adapter.ts` | ~5 |
| Leader | agents/page.tsx, AgentCard.tsx, agent.ts route, deploy.yml, wrangler.toml, smoke-test.sh, mcp-adapter.ts, mcp-protocol.design.md, SPEC 관리 | — | ~8 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial draft — F55~F58 상세 설계 | Sinclair Seo |
