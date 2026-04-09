---
code: FX-DSGN-FBV2
title: "피드백 파이프라인 v2 — F476 대시보드 + F477 Agent PR 안정화"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-09
updated: 2026-04-09
author: Claude Sonnet 4.6
ref_plan: "[[FX-PLAN-FBV2]]"
f_items: [F476, F477]
---

# FX-DSGN-FBV2 — 피드백 파이프라인 v2 Design

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | Marker.io 피드백이 들어와도 확인할 UI가 없고, Agent 자동 PR 생성이 프롬프트/워크플로우 미비로 실패 중 |
| **Solution** | Admin 대시보드에서 피드백 현황 조회·관리 + consumer 프롬프트·git 워크플로우·재처리 로직 개선 |
| **Function UX Effect** | 피드백 제출 → 자동 처리 → 대시보드 확인 + Issue 코멘트 알림까지 E2E 가시성 확보 |
| **Core Value** | 팀원/사용자의 피드백이 블랙홀에 빠지지 않고 투명하게 추적·처리되는 피드백 루프 완성 |

## §1 변경 범위 총괄

### 1.1 변경 파일 매트릭스

| # | 파일 | 변경 유형 | F-item | 설명 |
|---|------|----------|--------|------|
| 1 | `packages/api/src/app.ts` | 수정 | F476 | feedback-queue 미들웨어에 JWT admin fallback 추가 |
| 2 | `packages/web/src/lib/api-client.ts` | 수정 | F476 | feedback-queue API 호출 함수 + 타입 추가 |
| 3 | `packages/web/src/routes/feedback-dashboard.tsx` | **신규** | F476 | 피드백 관리 대시보드 페이지 컴포넌트 |
| 4 | `packages/web/content/navigation/sidebar.json` | 수정 | F476 | admin-portal 그룹에 피드백 메뉴 추가 |
| 5 | `packages/web/src/router.tsx` | 수정 | F476 | 라우트 등록 (lazy import) |
| 6 | `scripts/feedback-consumer.sh` | 수정 | F477 | 프롬프트 개선 + git 워크플로우 + 재처리 + 로그 보존 |
| 7 | `packages/web/e2e/feedback-dashboard.spec.ts` | **신규** | F476 | E2E 테스트 |
| 8 | `packages/web/e2e/fixtures/mock-factory.ts` | 수정 | F476 | makeFeedbackQueueItem() fixture 추가 |

---

## §2 F476 — 피드백 관리 대시보드

### 2.1 인증 미들웨어 수정 (app.ts)

**현재** (`packages/api/src/app.ts:186-192`):
```typescript
app.use("/api/feedback-queue/*", async (c, next) => {
  const secret = c.req.header("X-Webhook-Secret");
  if (secret && c.env.WEBHOOK_SECRET && secret === c.env.WEBHOOK_SECRET) {
    return next();
  }
  return c.json({ error: "Unauthorized — X-Webhook-Secret required" }, 401);
});
```

**변경 후**:
```typescript
app.use("/api/feedback-queue/*", async (c, next) => {
  // 1) Webhook Secret 인증 (consumer.sh용)
  const secret = c.req.header("X-Webhook-Secret");
  if (secret && c.env.WEBHOOK_SECRET && secret === c.env.WEBHOOK_SECRET) {
    return next();
  }
  // 2) JWT admin fallback (대시보드용 — F476)
  try {
    await authMiddleware(c, async () => {});
    const user = c.get("user") as { role?: string } | undefined;
    if (user?.role === "admin") {
      return next();
    }
  } catch {
    // JWT 검증 실패 — fallthrough to 401
  }
  return c.json({ error: "Unauthorized — Webhook Secret or Admin JWT required" }, 401);
});
```

**설계 근거**: Plan §2.5 방안 A (권장). 기존 Webhook Secret 인증을 유지하면서 JWT admin fallback을 OR 조건으로 추가해요. 별도 `/api/admin/feedback` 경로(방안 B)는 기존 feedbackQueueRoute 라우트 정의와 이중화되므로 비채택.

**검증 항목**:
- [ ] D-01: Webhook Secret으로 기존 consumer.sh 호출 정상
- [ ] D-02: JWT admin 토큰으로 GET /feedback-queue 호출 정상
- [ ] D-03: JWT non-admin 토큰 → 401 반환
- [ ] D-04: 토큰 없음 + Secret 없음 → 401 반환

### 2.2 API Client 함수 (api-client.ts)

`packages/web/src/lib/api-client.ts` 파일 말미에 추가:

```typescript
// ─── F476: 피드백 관리 대시보드 ───

export interface FeedbackQueueItem {
  id: string;
  org_id: string;
  github_issue_number: number;
  github_issue_url: string;
  title: string;
  body: string | null;
  labels: string;
  screenshot_url: string | null;
  status: "pending" | "processing" | "done" | "failed" | "skipped";
  agent_pr_url: string | null;
  agent_log: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedbackQueueList {
  items: FeedbackQueueItem[];
  total: number;
}

export async function getFeedbackQueue(
  params?: { status?: string; limit?: number; offset?: number },
): Promise<FeedbackQueueList> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const query = qs.toString();
  return fetchApi(`/feedback-queue${query ? `?${query}` : ""}`);
}

export async function getFeedbackQueueItem(id: string): Promise<FeedbackQueueItem> {
  return fetchApi(`/feedback-queue/${id}`);
}

export async function updateFeedbackQueueItem(
  id: string,
  body: { status?: "done" | "failed" | "skipped"; agentPrUrl?: string; errorMessage?: string },
): Promise<FeedbackQueueItem> {
  return patchApi(`/feedback-queue/${id}`, body);
}
```

**설계 근거**: 기존 `fetchApi`/`patchApi` 패턴을 그대로 따르며, 타입은 API 스키마(`feedbackQueueItemSchema`)와 1:1 대응. `postApi`로 consume은 대시보드에서 호출하지 않으므로 미포함.

**검증 항목**:
- [ ] D-05: FeedbackQueueItem 타입이 API 스키마와 필드 일치
- [ ] D-06: getFeedbackQueue 함수에 status/limit/offset 쿼리 전달 정상
- [ ] D-07: updateFeedbackQueueItem에서 재처리(status reset) 호출 가능

### 2.3 대시보드 컴포넌트 (feedback-dashboard.tsx)

**경로**: `packages/web/src/routes/feedback-dashboard.tsx`

**패턴 참고**: `nps-dashboard.tsx` — 동일 Admin 전용 대시보드. `useState` + `useEffect` + `fetchApi` 패턴.

#### 2.3.1 컴포넌트 구조

```
Component (default export)
├── 상태 관리: useState<FeedbackQueueList>, useState<string> (activeFilter), useState<string|null> (selectedId)
├── 상단: 제목 + 통계 카운트 탭 (전체/대기/처리중/완료/실패)
├── 목록: FeedbackCard[] — 카드 형태 목록
│   ├── Issue 번호 + 제목 + 상태 뱃지
│   ├── 날짜 + GitHub Issue 링크
│   ├── 실패 시: 에러 메시지 (1줄 요약)
│   └── 액션 버튼: 재처리 (failed→pending) / 스킵 (pending→skipped)
└── 상세: 선택된 카드 → 슬라이드 패널 or 인라인 확장
    ├── 전체 body 내용
    ├── 라벨 목록
    ├── PR URL (done 상태)
    └── Agent 로그 (접이식)
```

#### 2.3.2 상태 필터 탭

```typescript
const STATUS_TABS = [
  { key: "all", label: "전체", icon: "📋" },
  { key: "pending", label: "대기", icon: "⏳" },
  { key: "processing", label: "처리중", icon: "🔄" },
  { key: "done", label: "완료", icon: "✅" },
  { key: "failed", label: "실패", icon: "❌" },
] as const;
```

- 각 탭에 `total` 카운트 뱃지 표시
- `all` 선택 시 status 파라미터 생략 (전체 조회)
- 탭 전환 시 `offset=0`으로 리셋

#### 2.3.3 카드 목록 아이템

각 카드에 표시하는 정보:

| 영역 | 필드 | 비고 |
|------|------|------|
| 좌측 상단 | `#github_issue_number` + `title` | 1줄 truncate |
| 우측 상단 | 상태 뱃지 (색상 코드) | pending=yellow, processing=blue, done=green, failed=red, skipped=gray |
| 하단 좌 | `created_at` (상대 시간) | `2시간 전`, `3일 전` 등 |
| 하단 우 | 액션 버튼 | 상태별 조건부 렌더링 |

**상태별 액션 버튼**:

| 현재 상태 | 버튼 1 | 버튼 2 | 동작 |
|-----------|--------|--------|------|
| pending | — | 스킵 | PATCH status=skipped |
| processing | — | — | (자동 처리 중) |
| done | PR 보기 | — | `agent_pr_url` 외부 링크 |
| failed | 재처리 | 스킵 | PATCH status=pending (retry_count 리셋) / PATCH status=skipped |
| skipped | 재처리 | — | PATCH status=pending |

**재처리 로직**: `updateFeedbackQueueItem(id, { status: "pending" })` 호출 후 목록 리프레시. 서버 측 `FeedbackQueueService.update()`가 status를 pending으로 변경하면 다음 consumer 실행 시 자동 pick up.

> **주의**: 현재 `feedbackQueueUpdateSchema`의 status enum은 `["done", "failed", "skipped"]`만 허용. 재처리를 위해 `"pending"`을 추가해야 해요.

#### 2.3.4 상세 뷰

카드 클릭 시 인라인 확장 (accordion 패턴):

```
├── body 전문 (markdown이면 렌더링, 아니면 plain text)
├── labels (쉼표 구분 → 뱃지 목록)
├── GitHub Issue 링크 (외부 탭)
├── PR URL (done일 때만 — 외부 탭)
├── error_message (failed일 때만 — 빨간 박스)
└── agent_log (접이식 — 최대 500자 미리보기 + "전체 보기" 토글)
```

**검증 항목**:
- [ ] D-08: 상태별 필터 탭 동작 (5개 상태 + 전체)
- [ ] D-09: 카드 목록 렌더링 (제목, 상태 뱃지, 날짜, Issue 링크)
- [ ] D-10: 재처리 버튼 → status=pending PATCH 호출 + 목록 갱신
- [ ] D-11: 스킵 버튼 → status=skipped PATCH 호출 + 목록 갱신
- [ ] D-12: done 상태 카드 → PR URL 링크 표시
- [ ] D-13: 카드 클릭 → 상세 뷰 확장 (body, labels, error_message)
- [ ] D-14: 빈 목록 시 "피드백이 없습니다" 안내 표시

### 2.4 API 스키마 수정 (feedback-queue.ts)

`packages/api/src/modules/portal/schemas/feedback-queue.ts` — `feedbackQueueUpdateSchema`에 `"pending"` 추가:

```typescript
export const feedbackQueueUpdateSchema = z.object({
  status: z.enum(["pending", "done", "failed", "skipped"]).optional(),
  agentPrUrl: z.string().optional(),
  agentLog: z.string().optional(),
  errorMessage: z.string().optional(),
}).openapi("FeedbackQueueUpdate");
```

**설계 근거**: 대시보드에서 "재처리" 기능을 위해 failed/skipped → pending 전환이 필요. consumer가 다음 실행 시 pending 항목을 pick up.

**검증 항목**:
- [ ] D-15: PATCH body에 status="pending" 허용
- [ ] D-16: 기존 done/failed/skipped 상태 변경 동작 유지

### 2.5 사이드바 메뉴 추가 (sidebar.json)

`packages/web/content/navigation/sidebar.json` — `admin-portal.items` 배열에 추가:

```json
{
  "key": "admin-portal",
  "items": [
    { "href": "/nps-dashboard", "label": "NPS 대시보드", ... },
    { "href": "/dashboard/metrics", "label": "운영 지표", ... },
    { "href": "/projects", "label": "프로젝트", ... },
    { "href": "/feedback-dashboard", "label": "피드백", "iconKey": "MessageSquare", "visible": true, "sortOrder": 3 }
  ]
}
```

**검증 항목**:
- [ ] D-17: Admin 사이드바에 "피드백" 메뉴 표시
- [ ] D-18: 클릭 시 /feedback-dashboard 라우트 이동

### 2.6 라우트 등록 (router.tsx)

`packages/web/src/router.tsx` — nps-dashboard 근처에 추가:

```typescript
{ path: "nps-dashboard", lazy: () => import("@/routes/nps-dashboard") },
{ path: "feedback-dashboard", lazy: () => import("@/routes/feedback-dashboard") },
```

**검증 항목**:
- [ ] D-19: /feedback-dashboard 경로 접근 시 컴포넌트 렌더링

---

## §3 F477 — Agent 자동 PR 생성 안정화

### 3.1 consumer.sh 개선 사항

`scripts/feedback-consumer.sh` 전체 수정 범위:

#### 3.1.1 git 워크플로우 개선 (L62-65)

**현재**:
```bash
cd "$REPO_DIR"
git checkout master && git pull origin master
local BRANCH="fix/feedback-$ISSUE_NUM"
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
```

**변경 후**:
```bash
cd "$REPO_DIR"
git checkout master
git stash --include-untracked 2>/dev/null || true
git pull origin master
local BRANCH="fix/feedback-$ISSUE_NUM"
git checkout -b "$BRANCH" 2>/dev/null || {
  git checkout "$BRANCH"
  git rebase master || {
    git rebase --abort
    git reset --hard master
  }
}
```

**설계 근거**: (1) dirty 상태에서 checkout 실패 방지 (stash), (2) 기존 브랜치가 master 뒤처진 경우 rebase, (3) rebase 충돌 시 master 기준으로 리셋 (안전 fallback).

**검증 항목**:
- [ ] D-20: dirty 상태에서 consumer 실행 시 stash 후 정상 진행
- [ ] D-21: 기존 브랜치 존재 시 rebase 후 작업

#### 3.1.2 Agent 프롬프트 개선 (L74-84)

**현재**: 간략한 5단계 지시

**변경 후**:
```
GitHub Issue #${ISSUE_NUM}: ${TITLE}

${BODY}

이 피드백을 분석하고 수정해주세요.

## 작업 범위
- packages/web/src/ 디렉토리만 수정할 수 있어요
- 다른 패키지(api, cli, shared)나 설정 파일은 수정하지 마세요

## 작업 순서
1. Issue 내용과 스크린샷 설명을 분석하세요
2. packages/web/src/ 에서 관련 파일을 찾으세요
3. 코드를 수정하세요
4. typecheck 확인: cd packages/web && npx tsc --noEmit
5. 변경된 파일만 개별 git add (git add . 금지):
   git add packages/web/src/path/to/file.tsx
6. 커밋:
   git commit -m "fix: [visual-feedback] #${ISSUE_NUM} — ${TITLE}"
7. push:
   git push origin ${BRANCH}
8. PR 생성:
   gh pr create --title "fix: [visual-feedback] #${ISSUE_NUM} — ${TITLE}" --body "Closes #${ISSUE_NUM}"

## 중요
- 반드시 PR URL을 마지막에 출력하세요
- git add . 대신 개별 파일을 지정하세요
- CLAUDE.md, SPEC.md, package.json 등 메타 파일은 수정하지 마세요
```

**설계 근거**: (1) 수정 범위를 `packages/web/src/`로 명시 제한 (Plan §6 리스크 완화), (2) `git add .` 금지 명시 (프로젝트 룰), (3) 메타 파일 수정 금지, (4) PR URL 출력 강조 (추출 실패 방지).

**검증 항목**:
- [ ] D-22: Agent가 packages/web/src/ 외부 파일 수정하지 않음
- [ ] D-23: Agent가 git add 시 개별 파일 지정
- [ ] D-24: PR URL이 Agent 출력에 포함

#### 3.1.3 PR URL 추출 강화 (L91)

**현재**:
```bash
PR_URL=$(echo "$RESULT" | grep -oP 'https://github.com/[^ ]+/pull/\d+' | head -1 || true)
```

**변경 후**:
```bash
# 1차: 표준 GitHub PR URL 패턴
PR_URL=$(echo "$RESULT" | grep -oP 'https://github\.com/[^\s"]+/pull/\d+' | head -1 || true)
# 2차: gh pr create 출력 패턴 fallback
if [ -z "$PR_URL" ]; then
  PR_URL=$(echo "$RESULT" | grep -oP 'https://github\.com/[^\s"]+/pull/[0-9]+' | tail -1 || true)
fi
# 3차: gh pr list에서 브랜치 기반 조회
if [ -z "$PR_URL" ]; then
  PR_URL=$(gh pr list --head "$BRANCH" --json url --jq '.[0].url' 2>/dev/null || true)
fi
```

**설계 근거**: Agent 출력에서 URL이 포함되지 않더라도, `gh pr list`로 브랜치 기반 PR 조회를 fallback으로 제공.

**검증 항목**:
- [ ] D-25: Agent 출력에 PR URL이 있을 때 정상 추출
- [ ] D-26: Agent 출력에 URL 없을 때 gh pr list fallback 동작

#### 3.1.4 재처리 메커니즘

consume_one() 함수 앞에 retry_failed() 함수 추가:

```bash
retry_failed() {
  # failed 상태이고 retry_count < 3인 항목을 pending으로 리셋
  local FAILED_ITEMS
  FAILED_ITEMS=$(curl -sf "$API_BASE/api/feedback-queue?status=failed&limit=10" \
    -H "$AUTH_HEADER" 2>/dev/null || echo '{"items":[]}')

  echo "$FAILED_ITEMS" | jq -c '.items[] | select(.retry_count < 3)' | while read -r ITEM; do
    local ID
    ID=$(echo "$ITEM" | jq -r '.id')
    local RC
    RC=$(echo "$ITEM" | jq -r '.retry_count')
    log "Retrying failed item $ID (retry_count=$RC)"
    curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ID" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d '{"status":"pending"}' >/dev/null 2>&1 || true
  done
}
```

Main loop에서 `consume_one` 전에 `retry_failed` 호출:

```bash
while true; do
  retry_failed
  consume_one || sleep "$INTERVAL"
  # ...
done
```

**설계 근거**: 최대 3회 재시도 후 failed 유지. 대시보드에서 수동 재처리 시 retry_count 리셋은 서버 로직에서 처리.

**검증 항목**:
- [ ] D-27: failed + retry_count < 3 → 자동 pending 리셋
- [ ] D-28: retry_count >= 3 → 자동 재처리 안 함
- [ ] D-29: 대시보드 수동 재처리는 retry_count 무관하게 동작

#### 3.1.5 Agent 로그 보존 (상태 업데이트 시)

성공/실패 모두 `agentLog` 필드에 Agent 전체 출력의 마지막 2000자를 저장:

```bash
local AGENT_LOG
AGENT_LOG=$(echo "$RESULT" | tail -c 2000 | jq -Rs '.' | sed 's/^"//;s/"$//')

if [ -n "$PR_URL" ]; then
  curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"done\",\"agentPrUrl\":\"$PR_URL\",\"agentLog\":\"$AGENT_LOG\"}" >/dev/null
else
  local ERR_MSG
  ERR_MSG=$(echo "$RESULT" | tail -5 | jq -Rs '.' | sed 's/^"//;s/"$//')
  curl -sf -X PATCH "$API_BASE/api/feedback-queue/$ITEM_ID" \
    -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"failed\",\"errorMessage\":\"No PR created: $ERR_MSG\",\"agentLog\":\"$AGENT_LOG\"}" >/dev/null
fi
```

**검증 항목**:
- [ ] D-30: 성공 시 agent_log 컬럼에 로그 저장
- [ ] D-31: 실패 시 agent_log + error_message 모두 저장

---

## §4 E2E 테스트

### 4.1 테스트 파일

`packages/web/e2e/feedback-dashboard.spec.ts`

### 4.2 테스트 케이스

| # | 테스트 | 검증 내용 |
|---|--------|----------|
| E-01 | 페이지 접근 + 제목 표시 | `/feedback-dashboard` 접근 → "피드백 관리" 헤딩 |
| E-02 | 빈 목록 안내 | 데이터 없을 때 안내 메시지 표시 |
| E-03 | 카드 목록 렌더링 | mock 데이터 4건 → 카드 4장 + Issue 번호/제목/상태 뱃지 |
| E-04 | 상태 필터 탭 | "실패" 탭 클릭 → failed 상태 카드만 표시 |
| E-05 | 카드 상세 확장 | 카드 클릭 → body, labels, error_message 표시 |
| E-06 | 재처리 버튼 | failed 카드의 "재처리" 클릭 → PATCH 호출 + 목록 갱신 |
| E-07 | PR 링크 | done 카드에 PR URL 링크 표시 + 외부 탭 target |
| E-08 | 사이드바 메뉴 | Admin 사이드바에 "피드백" 메뉴 표시 + 클릭 시 이동 |

### 4.3 Mock Factory 추가

`packages/web/e2e/fixtures/mock-factory.ts`에 추가:

```typescript
export function makeFeedbackQueueItem(overrides?: Partial<FeedbackQueueItem>): FeedbackQueueItem {
  return {
    id: "fq-001",
    org_id: "org-001",
    github_issue_number: 386,
    github_issue_url: "https://github.com/KTDS-AXBD/Foundry-X/issues/386",
    title: "[Marker.io] API409 error occurred!",
    body: "Screenshot from Marker.io widget",
    labels: "visual-feedback",
    screenshot_url: null,
    status: "pending",
    agent_pr_url: null,
    agent_log: null,
    error_message: null,
    retry_count: 0,
    created_at: "2026-04-08T10:00:00Z",
    updated_at: "2026-04-08T10:00:00Z",
    ...overrides,
  };
}
```

**검증 항목**:
- [ ] D-32: E2E 8건 전체 pass
- [ ] D-33: mock-factory에 makeFeedbackQueueItem 존재

---

## §5 구현 순서

### Phase A: 인프라 준비 (F477)

| 단계 | 작업 | 검증 |
|------|------|------|
| A-1 | feedback-consumer.sh git 워크플로우 개선 (§3.1.1) | D-20, D-21 |
| A-2 | Agent 프롬프트 개선 (§3.1.2) | D-22~D-24 |
| A-3 | PR URL 추출 강화 (§3.1.3) | D-25, D-26 |
| A-4 | 재처리 메커니즘 추가 (§3.1.4) | D-27~D-29 |
| A-5 | Agent 로그 보존 (§3.1.5) | D-30, D-31 |

### Phase B: 프론트엔드 (F476)

| 단계 | 작업 | 검증 |
|------|------|------|
| B-1 | feedbackQueueUpdateSchema에 "pending" 추가 (§2.4) | D-15, D-16 |
| B-2 | app.ts 미들웨어 JWT admin fallback (§2.1) | D-01~D-04 |
| B-3 | api-client.ts feedback-queue 함수 추가 (§2.2) | D-05~D-07 |
| B-4 | feedback-dashboard.tsx 컴포넌트 생성 (§2.3) | D-08~D-14 |
| B-5 | sidebar.json 메뉴 추가 + router.tsx 등록 (§2.5, §2.6) | D-17~D-19 |
| B-6 | E2E 테스트 추가 (§4) | D-32, D-33 |

---

## §6 검증 항목 총괄

| ID | 카테고리 | 항목 | 자동화 |
|----|----------|------|--------|
| D-01 | 인증 | Webhook Secret 기존 동작 유지 | API 테스트 |
| D-02 | 인증 | JWT admin → feedback-queue 접근 허용 | API 테스트 |
| D-03 | 인증 | JWT non-admin → 401 | API 테스트 |
| D-04 | 인증 | 토큰+Secret 모두 없음 → 401 | API 테스트 |
| D-05 | API Client | FeedbackQueueItem 타입 일치 | typecheck |
| D-06 | API Client | getFeedbackQueue 쿼리 파라미터 전달 | E2E |
| D-07 | API Client | updateFeedbackQueueItem 재처리 호출 | E2E |
| D-08 | 대시보드 | 상태별 필터 탭 (5+1) | E2E E-04 |
| D-09 | 대시보드 | 카드 목록 렌더링 | E2E E-03 |
| D-10 | 대시보드 | 재처리 버튼 동작 | E2E E-06 |
| D-11 | 대시보드 | 스킵 버튼 동작 | E2E |
| D-12 | 대시보드 | done → PR URL 링크 | E2E E-07 |
| D-13 | 대시보드 | 카드 상세 뷰 | E2E E-05 |
| D-14 | 대시보드 | 빈 목록 안내 | E2E E-02 |
| D-15 | 스키마 | status enum에 "pending" 추가 | API 테스트 |
| D-16 | 스키마 | 기존 상태 변경 유지 | API 테스트 |
| D-17 | 네비게이션 | 사이드바 메뉴 표시 | E2E E-08 |
| D-18 | 네비게이션 | 메뉴 클릭 → 라우트 이동 | E2E E-08 |
| D-19 | 라우트 | /feedback-dashboard lazy load | E2E E-01 |
| D-20 | Consumer | dirty 상태 stash 처리 | 수동 |
| D-21 | Consumer | 기존 브랜치 rebase | 수동 |
| D-22 | Consumer | Agent 수정 범위 제한 | 수동 |
| D-23 | Consumer | Agent git add 개별 파일 | 수동 |
| D-24 | Consumer | PR URL 출력 | 수동 |
| D-25 | Consumer | PR URL 정규식 추출 | 수동 |
| D-26 | Consumer | gh pr list fallback | 수동 |
| D-27 | Consumer | 자동 재처리 (retry < 3) | 수동 |
| D-28 | Consumer | retry >= 3 스킵 | 수동 |
| D-29 | Consumer | 대시보드 수동 재처리 | E2E E-06 |
| D-30 | Consumer | 성공 시 agent_log 저장 | 수동 |
| D-31 | Consumer | 실패 시 agent_log + error 저장 | 수동 |
| D-32 | E2E | 8건 전체 pass | E2E |
| D-33 | E2E | mock-factory fixture | typecheck |
