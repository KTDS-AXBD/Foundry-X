---
code: FX-DSGN-S137
title: "Sprint 137 — F319+F320 Marker.io 피드백 자동화 파이프라인 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 137
f_items: [F319, F320]
---

# FX-DSGN-S137 — Marker.io 피드백 자동화 파이프라인 Design

## §1 설계 목표

Marker.io 비주얼 피드백이 GitHub Issue로 생성되면 자동으로 D1 큐에 등록하고, WSL 소비자가 Claude Code Agent를 실행하여 코드 수정 → PR 생성까지 자동화.

## §2 기존 자산 분석

| 자산 | 위치 | 활용 |
|------|------|------|
| Webhook handler | `packages/api/src/routes/webhook.ts` line 65~73 | Issues 이벤트 핸들러 확장 |
| Issue schema | `packages/api/src/schemas/webhook.ts` line 5~17 | labels 배열 이미 파싱 |
| GitHubSyncService | `packages/api/src/services/github-sync.ts` | 기존 syncIssueToTask 참조 패턴 |
| App routing | `packages/api/src/app.ts` line 201 | webhookRoute 이미 등록 |
| D1 latest | `0093_backup_metadata.sql` | 다음: 0094 |
| deploy.yml | `.github/workflows/deploy.yml` | PR merge → 자동 배포 (기존) |

## §3 상세 설계

### 파일 1: D1 마이그레이션 (신규)

**경로**: `packages/api/src/db/migrations/0094_feedback_queue.sql`

```sql
-- Marker.io 피드백 자동 처리 큐
CREATE TABLE IF NOT EXISTS feedback_queue (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  github_issue_number INTEGER NOT NULL,
  github_issue_url TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  labels TEXT NOT NULL DEFAULT '[]',
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','processing','done','failed','skipped')),
  agent_pr_url TEXT,
  agent_log TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_feedback_queue_status ON feedback_queue(status);
CREATE INDEX IF NOT EXISTS idx_feedback_queue_org ON feedback_queue(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_queue_issue ON feedback_queue(org_id, github_issue_number);
```

### 파일 2: Zod 스키마 (신규)

**경로**: `packages/api/src/schemas/feedback-queue.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const feedbackQueueItemSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  githubIssueNumber: z.number(),
  githubIssueUrl: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  labels: z.string(),
  screenshotUrl: z.string().nullable(),
  status: z.enum(["pending", "processing", "done", "failed", "skipped"]),
  agentPrUrl: z.string().nullable(),
  agentLog: z.string().nullable(),
  errorMessage: z.string().nullable(),
  retryCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const feedbackQueueListSchema = z.object({
  items: z.array(feedbackQueueItemSchema),
  total: z.number(),
});

export const feedbackQueueUpdateSchema = z.object({
  status: z.enum(["done", "failed", "skipped"]).optional(),
  agentPrUrl: z.string().optional(),
  agentLog: z.string().optional(),
  errorMessage: z.string().optional(),
});
```

### 파일 3: 큐 서비스 (신규)

**경로**: `packages/api/src/services/feedback-queue-service.ts`

```typescript
export class FeedbackQueueService {
  constructor(private db: D1Database) {}

  async enqueue(orgId: string, issue: {
    number: number;
    url: string;
    title: string;
    body: string | null;
    labels: string[];
    screenshotUrl?: string;
  }): Promise<{ id: string; created: boolean }> {
    // UNIQUE 제약으로 중복 방지 — INSERT OR IGNORE
    const id = crypto.randomUUID();
    const result = await this.db.prepare(
      `INSERT OR IGNORE INTO feedback_queue
       (id, org_id, github_issue_number, github_issue_url, title, body, labels, screenshot_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, orgId, issue.number, issue.url, issue.title, issue.body,
           JSON.stringify(issue.labels), issue.screenshotUrl ?? null).run();
    return { id, created: (result.meta?.changes ?? 0) > 0 };
  }

  async consume(): Promise<Record<string, unknown> | null> {
    // 원자적 전환: 가장 오래된 pending → processing
    const item = await this.db.prepare(
      `UPDATE feedback_queue SET status = 'processing', updated_at = datetime('now')
       WHERE id = (SELECT id FROM feedback_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1)
       RETURNING *`
    ).first();
    return item ?? null;
  }

  async complete(id: string, prUrl: string): Promise<void> {
    await this.db.prepare(
      `UPDATE feedback_queue SET status = 'done', agent_pr_url = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(prUrl, id).run();
  }

  async fail(id: string, error: string): Promise<void> {
    await this.db.prepare(
      `UPDATE feedback_queue SET status = 'failed', error_message = ?,
       retry_count = retry_count + 1, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(error, id).run();
  }

  async skip(id: string, reason: string): Promise<void> {
    await this.db.prepare(
      `UPDATE feedback_queue SET status = 'skipped', error_message = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(reason, id).run();
  }

  async list(params: { status?: string; limit?: number; offset?: number }) {
    const { status, limit = 20, offset = 0 } = params;
    const where = status ? "WHERE status = ?" : "";
    const binds = status ? [status, limit, offset] : [limit, offset];

    const countResult = await this.db.prepare(
      `SELECT COUNT(*) as total FROM feedback_queue ${where}`
    ).bind(...(status ? [status] : [])).first<{ total: number }>();

    const items = await this.db.prepare(
      `SELECT * FROM feedback_queue ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds).all();

    return { items: items.results ?? [], total: countResult?.total ?? 0 };
  }

  async getById(id: string) {
    return this.db.prepare("SELECT * FROM feedback_queue WHERE id = ?").bind(id).first();
  }
}
```

### 파일 4: API 라우트 (신규)

**경로**: `packages/api/src/routes/feedback-queue.ts`

4개 endpoint:

| Method | Path | 설명 | Auth |
|--------|------|------|------|
| GET | `/feedback-queue` | 큐 목록 (status 필터, limit/offset) | JWT |
| GET | `/feedback-queue/:id` | 큐 아이템 상세 | JWT |
| PATCH | `/feedback-queue/:id` | 상태/PR URL/에러 업데이트 | JWT |
| POST | `/feedback-queue/consume` | 다음 pending → processing (원자적) | JWT |

### 파일 5: Webhook 확장 (수정)

**경로**: `packages/api/src/routes/webhook.ts` line 65~73

기존 Issues 이벤트 핸들러 내부에 visual-feedback 라벨 감지 로직 추가:

```typescript
// ─── Issues event ───
if (eventType === "issues") {
  const parsed = githubIssueEventSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "Invalid issue event payload" }, 400);
  }

  // ── visual-feedback 라벨 감지 → 피드백 큐 등록 ──
  const hasVisualFeedback = parsed.data.issue.labels.some(
    (l) => l.name === "visual-feedback"
  );
  if (hasVisualFeedback && (parsed.data.action === "opened" || parsed.data.action === "labeled")) {
    const queueService = new FeedbackQueueService(c.env.DB);
    const issueUrl = `https://github.com/${parsed.data.repository.full_name}/issues/${parsed.data.issue.number}`;
    await queueService.enqueue(orgId, {
      number: parsed.data.issue.number,
      url: issueUrl,
      title: parsed.data.issue.title,
      body: parsed.data.issue.body,
      labels: parsed.data.issue.labels.map((l) => l.name),
    });
  }

  // 기존 syncIssueToTask 유지
  const sync = new GitHubSyncService(github, c.env.DB, orgId);
  const result = await sync.syncIssueToTask(parsed.data);
  return c.json({ event: "issues", ...result, feedbackQueued: hasVisualFeedback });
}
```

### 파일 6: App 라우트 등록 (수정)

**경로**: `packages/api/src/app.ts`

```diff
+import { feedbackQueueRoute } from "./routes/feedback-queue.js";
 ...
+// Feedback Queue (auth + tenant required)
+app.route("/api", feedbackQueueRoute);
```

### 파일 7: WSL 소비자 스크립트 (신규)

**경로**: `scripts/feedback-consumer.sh`

핵심 루프:
1. `POST /api/feedback-queue/consume` → pending 아이템 1건
2. `git checkout -b fix/feedback-{issue_number}`
3. `claude -p` 실행 (Issue 내용 + 코드 수정 프롬프트)
4. PR URL 추출 → `PATCH /api/feedback-queue/:id` (done/failed)
5. `git checkout master` → 다음 아이템 대기

### 파일 8: Agent 프롬프트 템플릿 (신규)

**경로**: `scripts/feedback-agent-prompt.md`

Claude Code에 전달할 가이드라인:
- 프로젝트 구조 컨텍스트
- Web 패키지 우선 (CSS/레이아웃/텍스트 수정)
- typecheck + lint 필수 통과
- PR 컨벤션 (`fix: [visual-feedback] #N — 설명`)

## §4 테스트 설계

### Unit Tests

`packages/api/src/__tests__/feedback-queue.test.ts`:

| # | 테스트 | 검증 |
|:--:|--------|------|
| 1 | enqueue — 신규 Issue 등록 | INSERT 성공, status=pending |
| 2 | enqueue — 중복 Issue 무시 | INSERT OR IGNORE, created=false |
| 3 | consume — pending 1건 처리 | status→processing, 반환값 |
| 4 | consume — pending 없을 때 | null 반환 |
| 5 | complete — done + PR URL | status=done, agent_pr_url 저장 |
| 6 | fail — failed + error | status=failed, retry_count+1 |
| 7 | skip — skipped + reason | status=skipped |
| 8 | list — status 필터링 | pending만 조회 |
| 9 | list — 페이지네이션 | limit/offset 동작 |
| 10 | webhook — visual-feedback 감지 | Issue opened + 라벨 → queue INSERT |
| 11 | webhook — 일반 Issue 무시 | 라벨 없으면 큐 미등록 |
| 12 | webhook — labeled 액션 | 기존 Issue에 라벨 추가 시 큐 등록 |

## §5 구현 순서

| 단계 | 파일 | 작업 |
|:----:|------|------|
| 1 | `0094_feedback_queue.sql` | D1 마이그레이션 |
| 2 | `schemas/feedback-queue.ts` | Zod 스키마 |
| 3 | `services/feedback-queue-service.ts` | 큐 서비스 |
| 4 | `routes/feedback-queue.ts` | API 4 endpoints |
| 5 | `app.ts` | 라우트 등록 |
| 6 | `routes/webhook.ts` | visual-feedback 감지 |
| 7 | `__tests__/feedback-queue.test.ts` | 12 unit tests |
| 8 | `scripts/feedback-consumer.sh` | WSL 소비자 |
| 9 | `scripts/feedback-agent-prompt.md` | Agent 프롬프트 |
| 10 | 전체 검증 | typecheck + lint + test |

## §6 검증 체크리스트

- [ ] D1 migration 0094 적용
- [ ] `pnpm typecheck` — 에러 0건
- [ ] `pnpm test` — 신규 12건 + 회귀 0건
- [ ] webhook visual-feedback 라벨 감지
- [ ] consume API 원자적 전환
- [ ] WSL consumer script 동작
- [ ] 기존 webhook 회귀 없음
