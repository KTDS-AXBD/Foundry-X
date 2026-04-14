---
id: FX-DESIGN-288
type: design
title: Sprint 288 — F535 Graph 실행 정식 API + UI
sprint: 288
f_items: [F535]
req: [FX-REQ-565]
status: IN_PROGRESS
created: 2026-04-14
---

# Sprint 288 Design — F535 Graph 실행 정식 API + UI

## §1 목표 재확인

`POST /biz-items/:id/discovery-graph/run-all` 정식화 + sessionId D1 저장/조회 + 웹 UI 버튼.

## §2 현황 분석

| 항목 | 현재 상태 | F535 후 |
|------|----------|---------|
| run-all 엔드포인트 | 존재 (dogfood 레이블) | 정식 API |
| sessionId | 매번 동적 생성, 미저장 | D1 `graph_sessions` 저장 |
| GET sessions API | 없음 | 신규 추가 |
| 웹 UI 버튼 | 없음 | DiscoveryGraphPanel 신규 |
| confirmStage graphMode | 내부 옵션만, API 미노출 | API body `graphMode` 파라미터 추가 |

## §3 D1 Schema

```sql
-- 0135_graph_sessions.sql
CREATE TABLE IF NOT EXISTS graph_sessions (
  id TEXT PRIMARY KEY,              -- sessionId (graph-{bizItemId}-{timestamp})
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed
  discovery_type TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_msg TEXT,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);
CREATE INDEX IF NOT EXISTS idx_graph_sessions_biz_item ON graph_sessions(biz_item_id, started_at DESC);
```

## §4 API 설계

### POST /biz-items/:id/discovery-graph/run-all (정식화)
```typescript
// Request body (기존 + 추가)
{
  discoveryType?: string;
  feedback?: string;
  graphMode?: boolean;   // ← 신규: confirmStage로 진입 시 true
}

// Response (기존 + 추가)
{
  sessionId: string;     // DB에 저장된 session ID
  status: "running" | "completed" | "failed";
  result?: GraphRunResult;
}
```

**정식화 변경점**:
1. sessionId를 `graph-{bizItemId}-{timestamp}` 형태로 생성
2. 실행 전 `graph_sessions` INSERT (status=running)
3. 실행 완료/실패 후 status 업데이트

### GET /biz-items/:id/discovery-graph/sessions (신규)
```typescript
// Response
{
  sessions: Array<{
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    errorMsg: string | null;
  }>;
  latestSessionId: string | null;
}
```

## §5 파일 매핑 (TDD 대상)

| # | 파일 | 작업 | TDD 등급 |
|---|------|------|---------|
| 1 | `packages/api/src/db/migrations/0135_graph_sessions.sql` | 신규 생성 | 면제 |
| 2 | `packages/api/src/core/discovery/services/graph-session-service.ts` | 신규: createSession / updateStatus / listSessions | **필수** |
| 3 | `packages/api/src/core/discovery/routes/discovery-stage-runner.ts` | run-all 정식화 + GET sessions 추가 | 필수 |
| 4 | `packages/api/src/__tests__/graph-session-service.test.ts` | Red phase | — |
| 5 | `packages/api/src/__tests__/discovery-graph-route.test.ts` | Red phase (라우트 통합) | — |
| 6 | `packages/web/src/lib/api-client.ts` | `runDiscoveryGraph()` + `getGraphSessions()` 추가 | 권장 |
| 7 | `packages/web/src/components/feature/discovery/DiscoveryGraphPanel.tsx` | 신규 컴포넌트 | 권장 |
| 8 | `packages/web/src/routes/ax-bd/discovery-detail.tsx` | GraphPanel 탭 통합 | 권장 |
| 9 | `packages/web/src/__tests__/discovery-graph-panel.test.tsx` | Red phase | — |

## §6 DiscoveryGraphPanel 컴포넌트 설계

```tsx
interface DiscoveryGraphPanelProps {
  bizItemId: string;
}

// 상태
const [running, setRunning] = useState(false);
const [sessionId, setSessionId] = useState<string | null>(null);
const [sessions, setSessions] = useState<GraphSession[]>([]);
const [error, setError] = useState<string | null>(null);

// UI
- 'Graph 모드 실행' 버튼 (실행 중: Loader2 아이콘 + "실행 중...")
- 최신 sessionId 표시 (있으면)
- 세션 목록 (최근 5개): status badge + 시작 시간
```

## §7 테스트 계약 (TDD Red Target)

### graph-session-service.test.ts
```typescript
describe("F535: GraphSessionService", () => {
  it("createSession() — DB에 running 상태로 저장됨")
  it("updateStatus(completed) — completedAt 기록됨")
  it("updateStatus(failed, msg) — errorMsg 저장됨")
  it("listSessions() — bizItemId로 필터링, 최신순")
  it("getLatest() — 가장 최근 session 반환")
})
```

### discovery-graph-route.test.ts
```typescript
describe("F535: POST /biz-items/:id/discovery-graph/run-all (정식)", () => {
  it("성공 시 sessionId 포함 응답")
  it("sessionId가 graph_sessions DB에 저장됨")
  it("BIZ_ITEM_NOT_FOUND 시 404")
})
describe("F535: GET /biz-items/:id/discovery-graph/sessions", () => {
  it("빈 목록 반환 (세션 없음)")
  it("세션 있으면 목록 반환 + latestSessionId")
})
```

### discovery-graph-panel.test.tsx
```typescript
describe("F535: DiscoveryGraphPanel", () => {
  it("'Graph 모드 실행' 버튼 렌더링됨")
  it("버튼 클릭 → runDiscoveryGraph API 호출됨")
  it("실행 중 버튼 disabled")
  it("sessionId 반환되면 화면에 표시됨")
})
```

## §8 갭 분석 기준 (90% 목표)

| 기준 | 체크 |
|------|------|
| D1 migration 파일 존재 | graph_sessions 테이블 |
| GraphSessionService 3메서드 | create / updateStatus / listSessions |
| POST run-all sessionId DB 저장 | INSERT + status 업데이트 |
| GET sessions 엔드포인트 | 200 응답 |
| DiscoveryGraphPanel 버튼 | 렌더링 + 클릭 핸들러 |
| discovery-detail.tsx 통합 | 발굴 분석 탭 |
| vitest PASS | 신규 테스트 모두 GREEN |
| typecheck PASS | 0 error |
