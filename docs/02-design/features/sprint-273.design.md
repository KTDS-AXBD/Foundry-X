---
id: FX-DESIGN-273
title: "Sprint 273 Design — F516 Backlog 인입 파이프라인 + 실시간 동기화"
sprint: 273
f_items: [F516]
req: [FX-REQ-544]
status: active
created: 2026-04-13
---

# Sprint 273 Design — F516

## §1 개요

F516은 3채널 Backlog 인입(웹 폼 / CLI / Marker.io)과 GitHub Webhook → SSE 실시간 동기화를 구현한다.
기존 `classify()`, `SSEManager`, `webhook-registry` 인프라를 최대한 재활용하고 새 레이어만 추가한다.

---

## §2 데이터 모델

### 2-1. D1 Migration: `backlog_items` (0128)

```sql
CREATE TABLE IF NOT EXISTS backlog_items (
  id           TEXT PRIMARY KEY,          -- 'bli-{timestamp}-{rand4}'
  org_id       TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  track        TEXT NOT NULL DEFAULT 'F', -- F|B|C|X
  priority     TEXT NOT NULL DEFAULT 'P2',-- P0~P3
  source       TEXT NOT NULL DEFAULT 'web', -- web|cli|marker|github
  classify_method TEXT NOT NULL DEFAULT 'llm', -- llm|regex
  status       TEXT NOT NULL DEFAULT 'pending', -- pending|classified|registered|rejected
  idempotency_key TEXT,                   -- 중복 방지 (Marker.io issue_id 등)
  github_issue_number INTEGER,
  spec_row_added INTEGER DEFAULT 0,       -- SPEC.md 행 추가 완료 여부
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_backlog_items_org ON backlog_items(org_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON backlog_items(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_backlog_items_idempotency ON backlog_items(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

---

## §3 API 설계

### 3-1. POST /api/work/submit

**요청 스키마**:
```typescript
WorkSubmitInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  source: z.enum(["web", "cli", "marker"]).default("web"),
  idempotency_key: z.string().optional(), // Marker.io: GitHub issue ID
})
```

**응답 스키마**:
```typescript
WorkSubmitOutputSchema = z.object({
  id: z.string(),                     // backlog_items.id
  track: z.enum(["F","B","C","X"]),
  priority: z.enum(["P0","P1","P2","P3"]),
  title: z.string(),
  classify_method: z.enum(["llm","regex"]),
  github_issue_number: z.number().optional(),
  spec_row_added: z.boolean(),
  status: z.string(),
})
```

**처리 흐름**:
```
POST /api/work/submit
  ├─ idempotency_key 중복 체크 → 409 Conflict
  ├─ classify() → { track, priority, title, method }
  ├─ D1 INSERT backlog_items (status=classified)
  ├─ GitHub Issue 생성 (GITHUB_TOKEN)
  ├─ SPEC.md 행 추가 PoC
  │   ├─ 성공: spec_row_added=1
  │   └─ 실패: spec_row_added=0 + GitHub Issue comment "수동 등록 필요"
  ├─ SSE broadcast { event: "work:backlog-updated", data: { id, track, ... } }
  └─ 200 OK { id, track, priority, ... }
```

### 3-2. GET /api/work/stream (SSE)

```typescript
// 기존 SSE 인프라 확장
// Content-Type: text/event-stream
// Hono streaming API 사용
```

**이벤트 타입**:
- `work:backlog-updated` — Backlog 항목 신규/변경
- `work:snapshot-refresh` — 전체 스냅샷 갱신 요청 (GitHub push 시)

### 3-3. POST /api/webhook/git (기존 확장)

기존 push 이벤트 핸들러에 SSE broadcast 추가:
```typescript
// eventType === "push"
const sseManager = new SSEManager(c.env.DB);
await sseManager.broadcast({ event: "work:snapshot-refresh", data: { ref: payload.ref } });
```

---

## §4 서비스 설계

### 4-1. WorkService 확장

```typescript
// packages/api/src/services/work.service.ts

async submitBacklog(input: WorkSubmitInput): Promise<WorkSubmitOutput> {
  // 1. 중복 체크 (idempotency_key)
  // 2. classify()
  // 3. D1 INSERT
  // 4. createGithubIssue()
  // 5. updateSpecMd() — PoC, 실패 허용
  // 6. SSEManager.broadcast()
  return result;
}

private async createGithubIssue(title: string, track: string, priority: string): Promise<number | undefined> {
  // GitHub REST API POST /repos/{owner}/{repo}/issues
  // label: track-{F/B/C/X}, priority-{P0~P3}
}

private async updateSpecMd(item: BacklogItem): Promise<boolean> {
  // GitHub API GET contents/SPEC.md → base64 decode → append row → PUT
  // 실패 시 false 반환 (예외 전파 안 함)
}
```

### 4-2. SSEManager 확장

```typescript
// packages/api/src/services/sse-manager.ts

export interface BacklogUpdatedData {
  id: string;
  track: string;
  priority: string;
  title: string;
  source: string;
}
// pushEvent() 기존 메서드 재활용 — 새 이벤트 타입 추가만
```

### 4-3. Marker.io → Backlog 연결

기존 webhook.ts의 `[Marker.io]` 이슈 감지 로직 뒤에:
```typescript
// 기존: FeedbackQueueService.enqueue()
// 추가: WorkService.submitBacklog({ source: "marker", idempotency_key: issue.id.toString(), ... })
```

---

## §5 파일 매핑 (Worker 없음 — 단일 구현)

| 파일 | 변경 | 크기 예측 |
|------|------|-----------|
| `packages/api/src/db/migrations/0128_backlog_items.sql` | NEW | ~20 lines |
| `packages/api/src/schemas/work.ts` | ADD | +30 lines |
| `packages/api/src/services/work.service.ts` | ADD methods | +80 lines |
| `packages/api/src/services/sse-manager.ts` | ADD type + method | +20 lines |
| `packages/api/src/routes/work.ts` | ADD 2 routes | +60 lines |
| `packages/api/src/modules/portal/routes/webhook.ts` | MODIFY push handler | +15 lines |
| `packages/web/src/routes/work-management.tsx` | ADD tab + EventSource | +120 lines |
| `packages/api/src/__tests__/work-submit.test.ts` | NEW | +100 lines |

---

## §6 테스트 계약 (TDD Red Phase)

### 테스트 파일: `packages/api/src/__tests__/work-submit.test.ts`

```typescript
// F516 TDD Red Phase
describe("F516 — POST /api/work/submit", () => {
  it("제목+설명 입력 시 AI 분류 + D1 저장 + 200 반환")
  it("ANTHROPIC_API_KEY 없을 때 regex fallback으로 분류")
  it("동일 idempotency_key 재전송 시 409 Conflict 반환")
  it("GitHub Issue 생성 성공 시 github_issue_number 포함")
  it("GitHub Issue 생성 실패 시에도 200 반환 (soft fail)")
  it("SPEC.md 업데이트 실패 시 spec_row_added=false + 200 반환")
})

describe("F516 — GET /api/work/stream (SSE)", () => {
  it("연결 시 Content-Type: text/event-stream 반환")
  it("submitBacklog() 후 work:backlog-updated 이벤트 전송")
})
```

---

## §7 웹 UI 설계

### /work-management "제출" 탭

```
┌─────────────────────────────────────┐
│ [스냅샷] [칸반] [세션] [속도] [제출] │  ← 탭 추가
└─────────────────────────────────────┘

제출 탭:
┌─────────────────────────────────────┐
│ 아이디어 / 피드백 제출               │
│                                     │
│ 제목 ________________________________│
│ 설명 ________________________________│
│       ________________________________│
│ [제출하기]                           │
│                                     │
│ ✅ 등록됨 — Track: F, Priority: P2  │  ← 결과 표시
└─────────────────────────────────────┘
```

### SSE 실시간 연결

```typescript
// 기존 5초 polling 유지 (폴백) + SSE 레이어 추가
// SSE 연결 성공 시 polling interval을 30초로 증가
useEffect(() => {
  const es = new EventSource('/api/work/stream');
  es.addEventListener('work:backlog-updated', () => fetchSnapshot());
  es.addEventListener('work:snapshot-refresh', () => fetchSnapshot());
  return () => es.close();
}, []);
```

---

## §8 오픈 이슈 / 결정 사항

| # | 이슈 | 결정 |
|---|------|------|
| 1 | SPEC.md GitHub API 업데이트 Workers 호환성 | PoC 구현 후 결정 — 실패 시 D1만 저장 + 수동 안내 |
| 2 | SSE Durable Objects vs KV polling | 기존 SSE 인프라 재활용 (Durable Objects 기반) |
| 3 | Marker.io webhook 직접 수신 vs GitHub Issues 경유 | 기존 GitHub Issues 경유 유지 (webhook 설정 변경 불필요) |
| 4 | 웹 SSE 인증 처리 | JWT 인증 불필요 — `/api/work/stream`은 public (스냅샷 공개 정보) |
