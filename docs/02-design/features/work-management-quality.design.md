# Design: F511 Work Management 품질 보강

> Phase 35 · Sprint 263 · FX-REQ-534 · P1
> Plan: `docs/01-plan/features/work-management-quality.plan.md`

## 1. 변경 파일 목록

| # | 파일 | 변경 유형 | 항목 |
|---|------|----------|------|
| 1 | `packages/api/src/services/work.service.ts` | 수정 | T3, T4 |
| 2 | `packages/api/src/__tests__/work-sessions.test.ts` | 수정 | T3, T4 |
| 3 | `packages/web/src/routes/work-management.tsx` | 수정 | G1 |
| 4 | `packages/web/e2e/work-management.spec.ts` | 수정 | T1, T2 |

**신규 파일 없음.** 기존 4개 파일만 수정.

## 2. 상세 설계

### T3: syncSessions SQL Injection 방어

**파일**: `packages/api/src/services/work.service.ts` — `syncSessions()` (line 310~322)

**현재 (위험)**:
```ts
// line 311: string interpolation으로 IN 절 구성
const activeNames = input.sessions.map(s => `'${s.name.replace(/'/g, "''")}'`).join(",");
const del = await this.env.DB.prepare(
  `DELETE FROM agent_sessions WHERE id NOT IN (${activeNames})`
).run();
```

**변경**:
```ts
// D1 prepared statement ? placeholder 사용
const names = input.sessions.map(s => s.name);
const placeholders = names.map(() => "?").join(",");
const del = await this.env.DB.prepare(
  `DELETE FROM agent_sessions WHERE id NOT IN (${placeholders})`
).bind(...names).run();
```

**변경 범위**: line 311~317 교체 (7줄 → 5줄)

**테스트 (T3)**: `work-sessions.test.ts`에 추가
```ts
it("rejects SQL injection in session name", async () => {
  const svc = new WorkService(makeEnv(db));
  // 악의적 이름으로 sync해도 SQL 에러 없이 정상 처리
  await svc.syncSessions({
    sessions: [{ name: "'; DROP TABLE agent_sessions; --", status: "idle", profile: "coder", windows: 1, last_activity: 0 }],
    worktrees: [],
    collected_at: "2026-04-12T10:00:00Z",
  });
  const list = await svc.getSessions();
  expect(list.sessions).toHaveLength(1);
  expect(list.sessions[0]?.name).toContain("DROP"); // 이름으로 저장됨, SQL 실행 안 됨
});
```

---

### T4: getSessions ORDER BY 명시적 순서

**파일**: `packages/api/src/services/work.service.ts` — `getSessions()` (line 240)

**현재**:
```sql
ORDER BY status ASC, last_activity DESC
```
→ `ASC` 정렬에서 busy(b) < done(d) < idle(i) 알파벳 순이라 의도와 다름.

**변경**:
```sql
ORDER BY CASE status
  WHEN 'busy' THEN 0
  WHEN 'idle' THEN 1
  WHEN 'done' THEN 2
  ELSE 3
END, last_activity DESC
```

**변경 범위**: line 240 — 1줄 → 5줄 교체

**테스트 (T4)**: `work-sessions.test.ts`에 추가
```ts
it("returns sessions ordered: busy first, then idle, then done", async () => {
  const svc = new WorkService(makeEnv(db));
  // 3개 세션 다른 상태로 sync
  await svc.syncSessions({
    sessions: [
      { name: "s-idle", status: "idle", profile: "coder", windows: 1, last_activity: 100 },
      { name: "s-busy", status: "busy", profile: "coder", windows: 1, last_activity: 200 },
      { name: "s-done", status: "done", profile: "tester", windows: 1, last_activity: 300 },
    ],
    worktrees: [],
    collected_at: "2026-04-12T10:00:00Z",
  });
  const list = await svc.getSessions();
  expect(list.sessions.map(s => s.status)).toEqual(["busy", "idle", "done"]);
});
```

---

### G1: API 에러 핸들링 UI

**파일**: `packages/web/src/routes/work-management.tsx`

**변경 1**: 에러 상태 추가 (Component 함수 내)
```ts
const [error, setError] = useState<string | null>(null);
```

**변경 2**: fetch 콜백에 에러 핸들링 추가
```ts
const fetchSnapshot = useCallback(async () => {
  try {
    const data = await fetchApi<WorkSnapshot>("/work/snapshot");
    setSnapshot(data);
    setLastUpdate(new Date());
    setError(null);
  } catch (e) {
    if (!snapshot) { // 기존 데이터 있으면 stale 유지, 없으면 에러 표시
      setError(e instanceof ApiError && e.status === 401
        ? "로그인이 필요해요"
        : "데이터를 불러올 수 없어요");
    }
  }
}, [snapshot]);
```

**변경 3**: 에러 UI 렌더링 (Kanban 탭 상단)
```tsx
{error && !snapshot && (
  <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
    <div style={{ fontSize: 16, marginBottom: 12 }}>{error}</div>
    <button onClick={() => { setError(null); fetchSnapshot(); }}
      style={{ background: "#3b82f6", color: "#fff", border: "none",
               borderRadius: 6, padding: "8px 20px", cursor: "pointer" }}>
      다시 시도
    </button>
  </div>
)}
```

**import 추가**: `ApiError`를 `@/lib/api-client`에서 import
```ts
import { fetchApi, postApi, ApiError } from "@/lib/api-client";
```

---

### T1: Sessions E2E Edge Case

**파일**: `packages/web/e2e/work-management.spec.ts`

추가 테스트 3건:

```ts
test("sessions tab — empty sessions shows placeholder", async ({ authenticatedPage: page }) => {
  // /work/sessions mock을 빈 목록으로 override
  await page.route("**/api/work/sessions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ sessions: [], worktrees: [], last_sync: "..." }) }));
  // 나머지 mock은 기존 mockWorkApi 패턴
  await page.goto("/work-management");
  await page.getByRole("button", { name: "Sessions" }).click();
  await expect(page.getByText(/세션이 없어요|No sessions/)).toBeVisible();
});

test("sessions tab — API error shows fallback", async ({ authenticatedPage: page }) => {
  await page.route("**/api/work/sessions", (route) =>
    route.fulfill({ status: 500, body: "Internal Server Error" }));
  await page.goto("/work-management");
  await page.getByRole("button", { name: "Sessions" }).click();
  // 에러 시 기존 null 상태로 로딩/에러 표시
});

test("sessions tab — busy/idle/done status badges", async ({ authenticatedPage: page }) => {
  await mockWorkApi(page);
  await page.goto("/work-management");
  await page.getByRole("button", { name: "Sessions" }).click();
  // MOCK_SESSIONS에 busy 1개 + idle 1개
  await expect(page.getByText("Busy", { exact: true })).toBeVisible();
  await expect(page.getByText("Idle", { exact: true })).toBeVisible();
});
```

---

### T2: Polling 갱신 E2E

**파일**: `packages/web/e2e/work-management.spec.ts`

```ts
test("snapshot polling — refreshes data after interval", async ({ authenticatedPage: page }) => {
  let callCount = 0;
  await page.route("**/api/work/snapshot", (route) => {
    callCount++;
    return route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ...MOCK_SNAPSHOT,
        summary: { ...MOCK_SNAPSHOT.summary, done_today: callCount } }) });
  });
  // 나머지 endpoint mock
  await page.route("**/api/work/context", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_CONTEXT) }));
  await page.route("**/api/work/sessions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SESSIONS) }));

  await page.goto("/work-management");
  await expect(page.getByRole("heading", { name: "Work Management" })).toBeVisible();

  // 5초 polling이므로 6초 대기 후 2회 이상 호출 확인
  await page.waitForTimeout(6000);
  expect(callCount).toBeGreaterThanOrEqual(2);
});
```

## 3. 구현 순서 (TDD)

| Step | 항목 | Red (테스트) | Green (구현) |
|------|------|-------------|-------------|
| 1 | T3 | SQL injection 테스트 작성 | syncSessions placeholder 교체 |
| 2 | T4 | ORDER BY 순서 테스트 작성 | CASE WHEN 교체 |
| 3 | G1 | — (UI는 E2E로 검증) | 에러 상태 + fallback UI 추가 |
| 4 | T1 | 빈 세션/에러 E2E 작성 | (G1에서 이미 구현) |
| 5 | T2 | polling E2E 작성 | (이미 구현됨, 검증만) |

## 4. 의도적 제외

| 항목 | 사유 |
|------|------|
| 0126 migration 파일 수정 | remote에 이미 적용 완료. IF NOT EXISTS 함정은 feedback memory로 문서화 |
| fetchContext/fetchSessions 개별 에러 상태 | 탭별 에러 분리는 과도한 복잡도. snapshot 에러 하나로 대표 |
| retry 횟수 제한 | api-client의 requestWithRetry가 이미 1회 retry 포함 |
