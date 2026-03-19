---
code: FX-DSGN-020
title: Sprint 19 (v1.7.0) — AgentInbox 스레드 답장 (ThreadReplyForm)
version: 0.1
status: Draft
category: DSGN
system-version: 1.7.0
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
references: "[[FX-PLAN-020]]"
---

# Sprint 19 Design Document

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 스레드 뷰(F81)는 읽기 전용. 답장 UI 없음. getInboxThread() 미사용. mock-d1 agent_messages 누락 |
| **Solution** | ThreadDetailView + ThreadReplyForm 분리 컴포넌트. ackThread() 일괄 확인. SSE thread_reply. mock-d1 보완 |
| **Function/UX Effect** | 스레드 클릭 → 전체 대화 + 인라인 답장. 스레드 단위 읽음. 실시간 답장 알림 |
| **Core Value** | 에이전트 비동기 협업 완성: 읽기→쓰기→알림→검증 체인 |

---

## F87: ThreadReplyForm UI — 스레드 상세 뷰 + 답장 폼

### 1. 컴포넌트 아키텍처

```
AgentInboxPanel.tsx (수정)
├── viewMode: "flat" | "threaded" | "detail"   ← "detail" 추가
├── selectedThreadId: string | null             ← 신규 상태
├── flat → 기존 MessageItem 목록
├── threaded → 기존 groupByThread + 스레드 그룹
└── detail → ThreadDetailView 렌더링 위임

ThreadDetailView.tsx (신규, ~120 LOC)
├── Props: { parentMessageId, agentId, onBack, onAck }
├── getInboxThread() 호출 → 전체 대화 표시
├── MessageItem 재사용 (indent 없이, 시간순)
├── ThreadReplyForm 하단 포함
└── SSE agent.message.thread_reply 구독 → 자동 리프레시

ThreadReplyForm.tsx (신규, ~80 LOC)
├── Props: { parentMessageId, fromAgentId, toAgentId, onReplySent }
├── type select + subject input + payload textarea
├── sendInboxMessage() 호출 (parentMessageId 포함)
└── 전송 후 onReplySent() 콜백
```

### 2. AgentInboxPanel 수정사항

**상태 추가:**
```typescript
// 기존
type ViewMode = "flat" | "threaded";

// 변경
type ViewMode = "flat" | "threaded" | "detail";

// 신규 상태
const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
```

**스레드 클릭 핸들러:**
```typescript
const handleThreadClick = (rootMessageId: string) => {
  setSelectedThreadId(rootMessageId);
  setViewMode("detail");
};

const handleBackToThreads = () => {
  setSelectedThreadId(null);
  setViewMode("threaded");
};
```

**렌더링 분기 추가 (viewMode === "detail"):**
```tsx
{viewMode === "detail" && selectedThreadId ? (
  <ThreadDetailView
    parentMessageId={selectedThreadId}
    agentId={agentId}
    onBack={handleBackToThreads}
    onAck={handleAcknowledge}
  />
) : viewMode === "flat" ? (
  // 기존 flat 렌더링
) : (
  // 기존 threaded 렌더링 — 루트 클릭에 handleThreadClick 연결
)}
```

**스레드 루트 클릭 변경** (threaded 모드의 `<div onClick>` 수정):

```tsx
// 기존: 토글만
onClick={() => children.length > 0 && handleToggleThread(root.id)}

// 변경: 답장 있으면 상세뷰, 없으면 토글
onClick={() => children.length > 0 ? handleThreadClick(root.id) : handleToggleThread(root.id)}
```

> **설계 결정**: 답장이 1개 이상인 스레드만 상세 뷰 진입. 답장 없는 루트 메시지는 기존처럼 토글.

### 3. ThreadDetailView 컴포넌트

```typescript
// packages/web/src/components/feature/ThreadDetailView.tsx

"use client";

interface ThreadDetailViewProps {
  parentMessageId: string;
  agentId: string;
  onBack: () => void;
  onAck: (messageId: string) => void;
}
```

**데이터 로딩:**
```typescript
const [thread, setThread] = useState<InboxMessage[]>([]);
const [loading, setLoading] = useState(true);

const loadThread = useCallback(async () => {
  setLoading(true);
  try {
    const data = await getInboxThread(parentMessageId, 100);
    setThread(data.thread as InboxMessage[]);
  } catch {
    // 로드 실패 시 빈 상태
  } finally {
    setLoading(false);
  }
}, [parentMessageId]);
```

**SSE 구독 (thread_reply 이벤트):**
```typescript
useEffect(() => {
  const es = new EventSource(`${BASE_URL}/agents/stream`);
  const handleReply = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.parentMessageId === parentMessageId) {
        loadThread(); // 이 스레드의 답장이면 리프레시
      }
    } catch {}
  };
  es.addEventListener("agent.message.thread_reply", handleReply);
  es.addEventListener("agent.message.received", handleReply);
  return () => es.close();
}, [parentMessageId, loadThread]);
```

**렌더링 구조:**
```tsx
<div>
  {/* 헤더: 뒤로 + 스레드 제목 + 일괄 읽음 버튼 */}
  <div className="flex items-center justify-between mb-4">
    <Button variant="ghost" size="sm" onClick={onBack}>
      ← 뒤로
    </Button>
    <span className="text-sm font-semibold truncate">
      스레드: {thread[0]?.subject ?? "..."}
    </span>
    <Button variant="outline" size="sm" onClick={handleAckThread}>
      전체 읽음
    </Button>
  </div>

  {/* 메시지 목록 (시간순) */}
  <ul className="space-y-2 mb-4 max-h-96 overflow-y-auto">
    {thread.map((msg, i) => (
      <MessageItem
        key={msg.id}
        msg={msg as AgentMessage}
        indent={i > 0}  // 루트 제외 들여쓰기
        onAck={onAck}
      />
    ))}
  </ul>

  {/* 답장 폼 */}
  <ThreadReplyForm
    parentMessageId={parentMessageId}
    fromAgentId={agentId}
    toAgentId={deriveRecipient(thread)}
    onReplySent={loadThread}
  />
</div>
```

**수신자 자동 결정 (`deriveRecipient`):**
```typescript
// 스레드에서 agentId가 아닌 가장 최근 발신자를 수신자로 설정
function deriveRecipient(thread: InboxMessage[], agentId: string): string {
  const other = [...thread].reverse().find(m => m.fromAgentId !== agentId);
  return other?.fromAgentId ?? thread[0]?.fromAgentId ?? "";
}
```

### 4. ThreadReplyForm 컴포넌트

```typescript
// packages/web/src/components/feature/ThreadReplyForm.tsx

"use client";

interface ThreadReplyFormProps {
  parentMessageId: string;
  fromAgentId: string;
  toAgentId: string;
  onReplySent: () => void;
}
```

**상태:**
```typescript
const [type, setType] = useState<string>("task_result");
const [subject, setSubject] = useState("");
const [payload, setPayload] = useState("");
const [sending, setSending] = useState(false);
```

**전송 핸들러:**
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!subject.trim()) return;
  setSending(true);
  try {
    const parsedPayload = payload.trim()
      ? JSON.parse(payload) as Record<string, unknown>
      : {};
    await sendInboxMessage(
      fromAgentId, toAgentId, type, subject, parsedPayload, parentMessageId,
    );
    setSubject("");
    setPayload("");
    onReplySent();
  } catch {
    // 전송 실패 — TODO: 에러 표시
  } finally {
    setSending(false);
  }
};
```

**렌더링:**
```tsx
<form onSubmit={handleSubmit} className="border-t pt-3 space-y-2">
  <div className="flex gap-2">
    {/* Type select */}
    <select
      value={type}
      onChange={(e) => setType(e.target.value)}
      className="rounded border px-2 py-1 text-sm"
    >
      <option value="task_result">결과</option>
      <option value="task_question">질문</option>
      <option value="task_feedback">피드백</option>
      <option value="status_update">상태</option>
    </select>

    {/* Subject input */}
    <input
      type="text"
      value={subject}
      onChange={(e) => setSubject(e.target.value)}
      placeholder="답장 내용..."
      className="flex-1 rounded border px-2 py-1 text-sm"
      required
    />
  </div>

  {/* Payload (접을 수 있는 JSON 입력) */}
  <details className="text-xs">
    <summary className="cursor-pointer text-muted-foreground">
      payload (JSON, 선택)
    </summary>
    <textarea
      value={payload}
      onChange={(e) => setPayload(e.target.value)}
      rows={3}
      className="mt-1 w-full rounded border px-2 py-1 font-mono text-xs"
      placeholder='{"key": "value"}'
    />
  </details>

  {/* 전송 버튼 */}
  <div className="flex justify-end">
    <Button type="submit" size="sm" disabled={sending || !subject.trim()}>
      {sending ? "전송 중..." : "답장 전송"}
    </Button>
  </div>
</form>
```

### 5. MessageItem export 분리

현재 `MessageItem`은 `AgentInboxPanel.tsx` 내부에 정의되어 있어요. ThreadDetailView에서도 재사용하려면 **export 필요**:

```typescript
// packages/web/src/components/feature/MessageItem.tsx (신규 — 기존 코드 이동)
export function MessageItem({ msg, indent, onAck }: MessageItemProps) { ... }
```

AgentInboxPanel과 ThreadDetailView 모두 이 파일에서 import.

### 6. api-client getInboxThread() 타입 강화

```typescript
// 기존
export async function getInboxThread(
  parentMessageId: string,
  limit?: number,
): Promise<{ thread: unknown[]; total: number; parentMessageId: string }>

// 변경
export async function getInboxThread(
  parentMessageId: string,
  limit?: number,
): Promise<{ thread: InboxMessage[]; total: number; parentMessageId: string }>
```

### 7. api-client ackThread() 함수 추가

```typescript
// packages/web/src/lib/api-client.ts

export async function ackThread(parentMessageId: string): Promise<{ count: number }> {
  const url = `${BASE_URL}/agents/inbox/${parentMessageId}/ack-thread`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<{ count: number }>;
}
```

---

## F88: 스레드 답장 API 보강

### 1. ackThread() 서비스 메서드

```typescript
// packages/api/src/services/agent-inbox.ts — AgentInbox 클래스에 추가

async ackThread(parentMessageId: string): Promise<number> {
  const result = await this.deps.db
    .prepare(
      `UPDATE agent_messages
       SET acknowledged = 1, acknowledged_at = ?
       WHERE (parent_message_id = ? OR id = ?) AND acknowledged = 0`,
    )
    .bind(new Date().toISOString(), parentMessageId, parentMessageId)
    .run();

  return result.meta?.changes ?? 0;
}
```

**동작:**
- `parent_message_id = parentMessageId` (자식들) OR `id = parentMessageId` (부모 자신)
- `acknowledged = 0`인 것만 업데이트 (멱등성)
- 변경된 행 수 반환

### 2. 라우트 추가

```typescript
// packages/api/src/routes/inbox.ts — 추가

inboxRoute.post("/:parentMessageId/ack-thread", async (c) => {
  const { parentMessageId } = threadParamsSchema.parse(c.req.param());
  const inbox = new AgentInbox({ db: c.env.DB });
  const count = await inbox.ackThread(parentMessageId);
  return c.json({ acknowledged: true, count });
});
```

**위치 주의**: 이 라우트는 `/:id/ack` 보다 **위에** 배치해야 해요 (`:parentMessageId/ack-thread`가 `:id/ack`에 의해 잡히지 않도록). 또는 더 안전하게:

```
현재 라우트 순서:
1. GET  /:parentMessageId/thread          ← 기존
2. POST /send                              ← 기존
3. GET  /:agentId                          ← 기존
4. POST /:id/ack                           ← 기존

변경 라우트 순서:
1. GET  /:parentMessageId/thread          ← 기존
2. POST /:parentMessageId/ack-thread      ← 신규 (ack-thread가 ack 앞에)
3. POST /send                              ← 기존
4. GET  /:agentId                          ← 기존
5. POST /:id/ack                           ← 기존
```

> `ack-thread`는 `/ack`과 구분되는 경로이므로 Hono 라우터가 정확히 매칭해요. 하지만 안전하게 `/:id/ack` 위에 배치.

### 3. 스키마 추가

```typescript
// packages/api/src/schemas/inbox.ts — 추가

export const ackThreadParamsSchema = z.object({
  parentMessageId: z.string().min(1),
});
```

> 기존 `threadParamsSchema`와 동일 구조이므로 재사용 가능. 명시적 분리가 필요하면 별도 정의.

### 4. SSE 이벤트 확장

```typescript
// packages/api/src/services/agent-inbox.ts — send() 내부 수정

// 기존 (모든 메시지에 대해)
this.deps.sse?.pushEvent({
  event: "agent.message.received",
  data: { messageId: id, fromAgentId, toAgentId, type, subject },
});

// 추가: parentMessageId가 있으면 thread_reply 이벤트도 전파
if (parentMessageId) {
  this.deps.sse?.pushEvent({
    event: "agent.message.thread_reply",
    data: { messageId: id, parentMessageId, fromAgentId, toAgentId, subject },
  });
}
```

**SSE 이벤트 정리:**

| 이벤트 | 발생 시점 | 데이터 |
|--------|-----------|--------|
| `agent.message.received` | 모든 메시지 전송 | messageId, from, to, type, subject |
| `agent.message.thread_reply` | 답장 메시지 전송 (parentMessageId 존재) | messageId, parentMessageId, from, to, subject |

> **설계 결정**: 기존 `agent.message.received`는 유지 (하위 호환). `thread_reply`는 추가 이벤트로 UI에서 스레드 상세 뷰 리프레시에 활용.

---

## F89: 통합 테스트 + E2E

### 1. mock-d1.ts 보완

**추가할 CREATE TABLE** (migration 0009 기준):

```sql
-- agent_messages (0009_planner_inbox_worktree.sql)
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

-- agent_plans (0009 + 0010)
CREATE TABLE IF NOT EXISTS agent_plans (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','approved','rejected','executing','completed','failed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  approved_at TEXT,
  execution_status TEXT,
  execution_started_at TEXT,
  execution_completed_at TEXT,
  execution_result TEXT,
  execution_error TEXT
);

-- agent_worktrees (0009)
CREATE TABLE IF NOT EXISTS agent_worktrees (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  branch TEXT NOT NULL,
  path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','merged','abandoned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  merged_at TEXT
);
```

### 2. inbox 라우트 통합 테스트

```typescript
// packages/api/src/__tests__/inbox-routes.test.ts

import { describe, it, expect, beforeEach } from "vitest";
// createTestApp()로 Hono app + MockD1Database 생성
```

**테스트 케이스 (10건):**

| # | 테스트 | HTTP | 검증 |
|---|--------|------|------|
| 1 | 메시지 전송 — 정상 | POST /agents/inbox/send | 201, 필드 검증 |
| 2 | 메시지 전송 — parentMessageId 포함 | POST /agents/inbox/send | 201, parentMessageId 존재 |
| 3 | 메시지 전송 — 필수 필드 누락 | POST /agents/inbox/send | 400 |
| 4 | 목록 조회 — 전체 | GET /agents/inbox/:agentId | 200, messages 배열 |
| 5 | 목록 조회 — 미읽음만 | GET /agents/inbox/:agentId?unreadOnly=true | 200, 필터 |
| 6 | 스레드 조회 — 정상 | GET /agents/inbox/:id/thread | 200, thread 배열 |
| 7 | 스레드 조회 — 존재하지 않음 | GET /agents/inbox/xxx/thread | 404 |
| 8 | 단건 확인 — 정상 | POST /agents/inbox/:id/ack | 200, acknowledged: true |
| 9 | 단건 확인 — 이미 확인 | POST /agents/inbox/:id/ack | 404 |
| 10 | 일괄 확인 — ackThread | POST /agents/inbox/:id/ack-thread | 200, count >= 1 |

### 3. agent-inbox.test.ts 추가 테스트

```typescript
// 기존 8건에 추가 (2건)

describe("ackThread", () => {
  it("acknowledges all messages in thread", async () => {
    // parent + 2 children 생성
    const parent = await inbox.send("a", "b", "task_assign", "Root", {});
    await inbox.send("b", "a", "task_result", "Reply1", {}, parent.id);
    await inbox.send("a", "b", "task_question", "Reply2", {}, parent.id);

    const count = await inbox.ackThread(parent.id);
    expect(count).toBe(3);

    const thread = await inbox.getThread(parent.id);
    expect(thread.every(m => m.acknowledged)).toBe(true);
  });

  it("returns 0 when all already acknowledged", async () => {
    const parent = await inbox.send("a", "b", "task_assign", "Root", {});
    await inbox.ackThread(parent.id); // 1차
    const count = await inbox.ackThread(parent.id); // 2차
    expect(count).toBe(0);
  });
});
```

### 4. Playwright E2E

```typescript
// packages/web/e2e/inbox-thread.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Agent Inbox Thread Reply", () => {
  test("에이전트 페이지에서 Inbox 탭 접근", async ({ page }) => {
    await page.goto("/agents");
    await expect(page.getByText("Agent Inbox")).toBeVisible();
  });

  test("스레드 뷰 전환 + 클릭 → 상세", async ({ page }) => {
    await page.goto("/agents");
    await page.getByRole("button", { name: "스레드" }).click();
    // 스레드가 있으면 클릭하여 상세 뷰 진입
    const thread = page.locator("[data-testid='thread-root']").first();
    if (await thread.isVisible()) {
      await thread.click();
      await expect(page.getByText("← 뒤로")).toBeVisible();
    }
  });

  test("답장 폼 렌더링", async ({ page }) => {
    // ThreadDetailView 진입 후
    await expect(page.getByPlaceholder("답장 내용...")).toBeVisible();
    await expect(page.getByRole("button", { name: "답장 전송" })).toBeVisible();
  });

  test("뒤로 → 스레드 목록 복귀", async ({ page }) => {
    await page.getByText("← 뒤로").click();
    await expect(page.getByRole("button", { name: "스레드" })).toBeVisible();
  });
});
```

---

## 파일 변경 목록

| 파일 | 변경 | F# | LOC (예상) |
|------|------|----|:----------:|
| `packages/web/src/components/feature/MessageItem.tsx` | 신규 (분리) | F87 | ~45 |
| `packages/web/src/components/feature/ThreadReplyForm.tsx` | 신규 | F87 | ~80 |
| `packages/web/src/components/feature/ThreadDetailView.tsx` | 신규 | F87 | ~120 |
| `packages/web/src/components/feature/AgentInboxPanel.tsx` | 수정 | F87 | ~10 (import + viewMode + 핸들러) |
| `packages/web/src/lib/api-client.ts` | 수정 | F87 | ~15 (ackThread + 타입 강화) |
| `packages/api/src/services/agent-inbox.ts` | 수정 | F88 | ~15 (ackThread + SSE) |
| `packages/api/src/routes/inbox.ts` | 수정 | F88 | ~8 (ack-thread 라우트) |
| `packages/api/src/schemas/inbox.ts` | 수정 | F88 | ~4 (ackThreadParams) |
| `packages/api/src/__tests__/helpers/mock-d1.ts` | 수정 | F89 | ~30 (3 CREATE TABLE) |
| `packages/api/src/__tests__/inbox-routes.test.ts` | 신규 | F89 | ~150 |
| `packages/api/src/__tests__/agent-inbox.test.ts` | 수정 | F89 | ~25 (ackThread 테스트) |
| `packages/web/e2e/inbox-thread.spec.ts` | 신규 | F89 | ~50 |

**총 예상**: 신규 ~445 LOC + 수정 ~82 LOC = ~527 LOC

---

## 구현 순서 (상세)

```
Step 1: MessageItem 분리                         [F87, 선행]
   ├── AgentInboxPanel에서 MessageItem 추출 → MessageItem.tsx
   └── AgentInboxPanel에서 import 변경

Step 2: mock-d1 보완                              [F89, 선행]
   └── agent_messages + agent_plans + agent_worktrees CREATE TABLE 추가

Step 3: ackThread() 서비스 + 테스트               [F88]
   ├── agent-inbox.ts에 ackThread() 추가
   └── agent-inbox.test.ts에 2건 추가

Step 4: ack-thread 라우트 + 스키마                [F88]
   ├── schemas/inbox.ts에 ackThreadParamsSchema 추가
   └── routes/inbox.ts에 POST /:parentMessageId/ack-thread 추가

Step 5: SSE thread_reply 이벤트                   [F88]
   └── agent-inbox.ts send()에 조건부 thread_reply 이벤트 추가

Step 6: api-client 보강                           [F87]
   ├── getInboxThread() 반환 타입 InboxMessage[]로 강화
   └── ackThread() 함수 추가

Step 7: ThreadReplyForm 컴포넌트                  [F87]
   └── form + sendInboxMessage() + onReplySent 콜백

Step 8: ThreadDetailView 컴포넌트                 [F87]
   ├── getInboxThread() 호출
   ├── MessageItem 목록 렌더링
   ├── ThreadReplyForm 하단
   └── SSE thread_reply 구독

Step 9: AgentInboxPanel viewMode 확장             [F87]
   ├── viewMode "detail" + selectedThreadId 추가
   ├── handleThreadClick / handleBackToThreads
   └── threaded 모드 루트 클릭 → detail 전환

Step 10: inbox 라우트 통합 테스트                 [F89]
   └── inbox-routes.test.ts 10건

Step 11: Playwright E2E                           [F89]
   └── inbox-thread.spec.ts 4건

Step 12: 전체 검증                                [전체]
   └── typecheck + build + tests 통과
```
