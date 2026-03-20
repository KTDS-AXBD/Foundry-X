---
code: FX-DSGN-024
title: Sprint 21 — GitHub 양방향 동기화 고도화 (상세 설계)
version: 1.0
status: Draft
category: DSGN
created: 2026-03-19
updated: 2026-03-19
author: Sinclair Seo
feature: F93
req: FX-REQ-093
priority: P1
plan: "[[FX-PLAN-024]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F93: GitHub 양방향 동기화 고도화 |
| Plan 참조 | [[FX-PLAN-024]] (`docs/01-plan/features/sprint-21.plan.md`) |
| 서브태스크 | A(Issue→Task) + B(외부 PR 리뷰) + C(코멘트 인터랙션) + D(자동 포스팅) + E(org 라우팅) |
| 예상 변경 | 신규 5 + 수정 8 파일, +40 테스트 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | GitHub Issue→Task 자동 생성 없음, 외부 PR 리뷰 불가, GitHub에서 Foundry-X 명령 불가 |
| **Solution** | webhook 확장 + 독립 리뷰 API + @foundry-x 코멘트 파서 + 리뷰 결과 자동 포스팅 |
| **Function UX Effect** | GitHub를 떠나지 않고 AI 리뷰/태스크 관리 가능 |
| **Core Value** | "Git이 진실" 철학의 양방향 구현 |

## §1 아키텍처 개요

### 1.1 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub                                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐             │
│  │  Issues   │  │ Pull Request │  │  PR Comments      │             │
│  │ (opened)  │  │ (opened)     │  │  @foundry-x xxx   │             │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘             │
└───────┼────────────────┼──────────────────┼────────────────────────┘
        │                │                  │
        │ webhook        │ webhook          │ webhook
        │ (issues)       │ (pull_request)   │ (issue_comment)
        ▼                ▼                  ▼
┌───────────────────────────────────────────────────────────────────┐
│                   POST /webhook/git                               │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Issue Handler   │  │ PR Handler  │  │ Comment Handler      │  │
│  │                 │  │             │  │                      │  │
│  │ syncIssueToTask │  │ syncPrStatus│  │ parseFoundryCommand  │  │
│  │ + AUTO CREATE   │  │ (기존)      │  │ → dispatchCommand    │  │
│  └────────┬────────┘  └──────┬──────┘  └──────────┬───────────┘  │
└───────────┼──────────────────┼─────────────────────┼─────────────┘
            │                  │                     │
            ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Services Layer                             │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ GitHubSyncSvc   │  │ PrPipeline   │  │ GitHubReviewSvc     │ │
│  │ (확장)          │  │ (기존)        │  │ (신규)              │ │
│  │                 │  │              │  │                     │ │
│  │ createTaskFrom  │  │ createAgent  │  │ reviewExternalPr    │ │
│  │ Issue()         │  │ Pr()         │  │ postReviewResult    │ │
│  └────────┬────────┘  └──────────────┘  │ addReviewLabels     │ │
│           │                              └──────────┬──────────┘ │
│           ▼                                         ▼            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    D1 Database                              │ │
│  │  agent_tasks (github_issue_number)                          │ │
│  │  agent_prs (pr_number, review_decision, sdd_score, ...)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 기존 코드와의 관계

| 기존 코드 | 변경 유형 | 이유 |
|-----------|----------|------|
| `github-sync.ts` | **확장** | `syncIssueToTask()`에 자동 생성 분기 추가 |
| `github.ts` | **확장** | `addLabels()`, `removeLabels()` 메서드 추가 |
| `reviewer-agent.ts` | **변경 없음** | 이미 독립적으로 호출 가능 |
| `pr-pipeline.ts` | **변경 없음** | 에이전트 전용 파이프라인 유지 |
| `webhook.ts` | **확장** | `issue_comment` 이벤트 핸들러 + org 라우팅 추가 |
| `schemas/webhook.ts` | **확장** | `githubCommentEventSchema` 추가 |

## §2 서브태스크 A: Issue→Task 자동 생성 (상세 설계)

### 2.1 `GitHubSyncService.syncIssueToTask()` 변경

**현재 코드** (`github-sync.ts:88-117`):
```typescript
// 기존: Task 없으면 no_matching_task 반환
if (!task) {
  return { taskId: null, action: "no_matching_task" };
}
```

**변경 후**:
```typescript
// 변경: Task 없고 action이 "opened"이면 자동 생성
if (!task) {
  if (event.action !== "opened") {
    return { taskId: null, action: "no_matching_task" };
  }
  // 옵트인: foundry-x 라벨 필수
  if (!this.hasFoundryLabel(event.issue.labels)) {
    return { taskId: null, action: "skipped:no_foundry_label" };
  }
  const newTask = await this.createTaskFromIssue(event);
  return { taskId: newTask.id, action: "auto_created" };
}
```

### 2.2 `createTaskFromIssue()` 메서드 (신규)

```typescript
private async createTaskFromIssue(
  event: GitHubIssueEvent,
): Promise<{ id: string }> {
  const id = `task-gh-${event.issue.number}-${Date.now()}`;
  const taskType = this.extractTaskType(event.issue.labels);
  const description = (event.issue.body ?? "").slice(0, 1000);

  await this.db
    .prepare(
      `INSERT INTO agent_tasks
        (id, agent_id, task_type, branch, pr_status, github_issue_number, org_id, result, created_at, updated_at)
       VALUES (?, 'unassigned', ?, ?, 'pending', ?, ?, ?, datetime('now'), datetime('now'))`,
    )
    .bind(
      id,
      taskType,
      `github-issue-${event.issue.number}`,
      event.issue.number,
      this.orgId,
      description,
    )
    .run();

  return { id };
}
```

### 2.3 라벨 유틸리티 메서드

```typescript
private hasFoundryLabel(labels: Array<{ name: string }>): boolean {
  return labels.some((l) => l.name === "foundry-x");
}

private extractTaskType(labels: Array<{ name: string }>): string {
  const LABEL_TO_TYPE: Record<string, string> = {
    bug: "bug-fix",
    fix: "bug-fix",
    enhancement: "feature",
    feature: "feature",
    refactor: "refactor",
    docs: "docs",
    documentation: "docs",
  };
  for (const label of labels) {
    const type = LABEL_TO_TYPE[label.name.toLowerCase()];
    if (type) return type;
  }
  return "task";
}
```

### 2.4 반환 타입 확장

기존 반환:
```typescript
{ taskId: string | null; action: string }
```

action 값 확장:

| action | 의미 |
|--------|------|
| `updated:{status}` | 기존 Task 상태 업데이트 (기존) |
| `already_synced` | 이미 동기화됨 (기존) |
| `no_matching_task` | 매칭 Task 없음 + opened 아님 |
| `skipped:no_foundry_label` | `foundry-x` 라벨 없어서 스킵 |
| `auto_created` | **신규** — Task 자동 생성됨 |
| `ignored:{action}` | 지원하지 않는 action (기존) |

## §3 서브태스크 B: 외부 PR 리뷰 API (상세 설계)

### 3.1 `GitHubReviewService` (신규 서비스)

**파일**: `packages/api/src/services/github-review.ts`

PR 리뷰 로직을 `PrPipelineService`에서 분리하지 않고, **외부 PR 전용 서비스**를 새로 만들어요. 이유:
- `PrPipelineService`는 "브랜치 생성 → 커밋 → PR 생성 → 리뷰 → 머지"라는 에이전트 전용 플로우
- 외부 PR 리뷰는 "기존 PR diff 가져오기 → 리뷰 → 결과 포스팅" 플로우
- `ReviewerAgent`는 양쪽에서 공유 (이미 독립적)

```typescript
export class GitHubReviewService {
  constructor(
    private github: GitHubService,
    private reviewer: ReviewerAgent,
    private db: D1Database,
    private orgId: string,
  ) {}

  async reviewPr(prNumber: number): Promise<ExternalReviewResult> {
    // 1. Cooldown 체크 (같은 PR에 5분 내 재리뷰 방지)
    const lastReview = await this.getLastReviewTime(prNumber);
    if (lastReview && Date.now() - lastReview < 5 * 60 * 1000) {
      throw new ReviewCooldownError(prNumber);
    }

    // 2. PR diff 가져오기
    const diff = await this.github.getPrDiff(prNumber);

    // 3. ReviewerAgent 호출
    const context: PrReviewContext = {
      agentId: "external-reviewer",
      taskId: `external-pr-${prNumber}`,
      taskType: "external-review",
      prNumber,
    };
    const result = await this.reviewer.reviewPullRequest(diff, context);

    // 4. DB에 기록 (agent_prs 레코드 upsert)
    await this.upsertPrRecord(prNumber, result);

    // 5. GitHub에 리뷰 코멘트 포스팅
    await this.postReviewToGitHub(prNumber, result);

    // 6. 라벨 추가
    await this.applyReviewLabels(prNumber, result);

    return { prNumber, ...result };
  }

  async getReviewResult(prNumber: number): Promise<ExternalReviewResult | null> {
    // agent_prs에서 pr_number로 조회
  }
}
```

### 3.2 DB 레코드 Upsert

외부 PR은 `agent_prs`에 레코드가 없을 수 있어요. 리뷰 시 자동 생성:

```typescript
private async upsertPrRecord(
  prNumber: number,
  result: PrReviewResult,
): Promise<string> {
  // 기존 레코드 조회
  const existing = await this.db
    .prepare("SELECT id FROM agent_prs WHERE pr_number = ?")
    .bind(prNumber)
    .first<{ id: string }>();

  if (existing) {
    // UPDATE
    await this.db
      .prepare(
        `UPDATE agent_prs
         SET review_decision = ?, sdd_score = ?, quality_score = ?,
             security_issues = ?, review_agent_id = 'external-reviewer',
             status = 'reviewing', updated_at = datetime('now')
         WHERE id = ?`,
      )
      .bind(
        result.decision,
        result.sddScore,
        result.qualityScore,
        JSON.stringify(result.securityIssues),
        existing.id,
      )
      .run();
    return existing.id;
  }

  // INSERT — agent_id와 task_id를 'external'로 설정
  const id = `pr-ext-${prNumber}-${Date.now()}`;
  await this.db
    .prepare(
      `INSERT INTO agent_prs
        (id, agent_id, task_id, repo, branch, pr_number, status,
         review_decision, sdd_score, quality_score, security_issues,
         review_agent_id, merge_strategy)
       VALUES (?, 'external', NULL, ?, ?, ?, 'reviewing',
               ?, ?, ?, ?, 'external-reviewer', 'squash')`,
    )
    .bind(
      id,
      this.github["repo"], // private 접근 대신 constructor에서 repo 받기
      `external-pr-${prNumber}`,
      prNumber,
      result.decision,
      result.sddScore,
      result.qualityScore,
      JSON.stringify(result.securityIssues),
    )
    .run();
  return id;
}
```

> **참고**: `agent_prs.task_id`는 `REFERENCES agent_tasks(id)` FK지만 NULL 허용이에요 (migration 0007 확인). 외부 PR은 `task_id = NULL`로 삽입.

### 3.3 API 라우트 (`routes/github.ts` 신규)

```typescript
export const githubRoute = new OpenAPIHono<{ Bindings: Env }>();

// POST /github/pr/:prNumber/review — 외부 PR 리뷰 요청
const reviewPrRoute = createRoute({
  method: "post",
  path: "/github/pr/{prNumber}/review",
  tags: ["GitHub"],
  summary: "GitHub PR AI 리뷰 요청 (외부 PR 포함)",
  request: {
    params: z.object({ prNumber: z.coerce.number() }),
  },
  responses: {
    200: { description: "리뷰 결과" },
    429: { description: "쿨다운 중 (5분 내 재요청)" },
  },
});

// GET /github/pr/:prNumber/review — 리뷰 결과 조회
const getReviewRoute = createRoute({
  method: "get",
  path: "/github/pr/{prNumber}/review",
  tags: ["GitHub"],
  summary: "PR 리뷰 결과 조회",
  request: {
    params: z.object({ prNumber: z.coerce.number() }),
  },
  responses: {
    200: { description: "리뷰 결과" },
    404: { description: "리뷰 없음" },
  },
});
```

### 3.4 `app.ts` 등록

```typescript
import { githubRoute } from "./routes/github.js";
// ...
// GitHub (public for webhook, protected routes need auth)
app.use("/api/github/*", authMiddleware);
app.use("/api/github/*", tenantGuard);
app.route("/api", githubRoute);
```

### 3.5 Zod 스키마 (`schemas/github.ts` 신규)

```typescript
import { z } from "@hono/zod-openapi";

export const prNumberParamsSchema = z.object({
  prNumber: z.coerce.number().int().positive(),
});

export const externalReviewResultSchema = z.object({
  prNumber: z.number(),
  decision: z.enum(["approve", "request_changes", "comment"]),
  summary: z.string(),
  sddScore: z.number(),
  qualityScore: z.number(),
  securityIssues: z.array(z.string()),
  comments: z.array(z.object({
    file: z.string(),
    line: z.number(),
    comment: z.string(),
    severity: z.enum(["error", "warning", "info"]),
  })),
  labels: z.array(z.string()),
  reviewedAt: z.string(),
});
```

## §4 서브태스크 C: PR 코멘트 인터랙션 (상세 설계)

### 4.1 Webhook 스키마 확장 (`schemas/webhook.ts`)

```typescript
// ─── GitHub Issue Comment Event (PR 코멘트 포함) ───

export const githubCommentEventSchema = z.object({
  action: z.enum(["created", "edited", "deleted"]),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    user: z.object({ login: z.string() }),
    created_at: z.string(),
  }),
  issue: z.object({
    number: z.number(),
    title: z.string(),
    pull_request: z.object({
      url: z.string(),
    }).optional(),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});
export type GitHubCommentEvent = z.infer<typeof githubCommentEventSchema>;
```

### 4.2 커맨드 파서 (`services/github-review.ts`에 포함)

```typescript
export interface FoundryCommand {
  command: "review" | "status" | "approve" | "help";
  args: string;
}

export function parseFoundryCommand(body: string): FoundryCommand | null {
  const match = body.match(
    /@foundry-x\s+(review|status|approve|help)(?:\s+(.*))?/i,
  );
  if (!match) return null;
  return {
    command: match[1]!.toLowerCase() as FoundryCommand["command"],
    args: match[2]?.trim() ?? "",
  };
}
```

### 4.3 Webhook 라우트 확장 (`routes/webhook.ts`)

기존 `issue_comment` 분기 없음 → 추가:

```typescript
// ─── Issue Comment event (PR 코멘트 인터랙션) ───
if (eventType === "issue_comment") {
  const parsed = githubCommentEventSchema.safeParse(payload);
  if (!parsed.success) {
    return c.json({ error: "Invalid comment event payload" }, 400);
  }

  // PR 코멘트가 아니면 무시
  if (!parsed.data.issue.pull_request) {
    return c.json({ event: "issue_comment", action: "skipped:not_pr" });
  }

  // action이 "created"만 처리 (edited/deleted 무시)
  if (parsed.data.action !== "created") {
    return c.json({ event: "issue_comment", action: `skipped:${parsed.data.action}` });
  }

  // @foundry-x 커맨드 파싱
  const cmd = parseFoundryCommand(parsed.data.comment.body);
  if (!cmd) {
    return c.json({ event: "issue_comment", action: "skipped:no_command" });
  }

  const prNumber = parsed.data.issue.number;
  const reviewSvc = new GitHubReviewService(github, reviewer, c.env.DB, orgId);

  switch (cmd.command) {
    case "review": {
      const result = await reviewSvc.reviewPr(prNumber);
      return c.json({ event: "issue_comment", command: "review", ...result });
    }
    case "status": {
      const result = await reviewSvc.getReviewResult(prNumber);
      // 결과를 GitHub 코멘트로 포스팅
      await github.addIssueComment(prNumber, formatStatusComment(result));
      return c.json({ event: "issue_comment", command: "status", result });
    }
    case "approve": {
      // TODO: 권한 확인 (repo admin만 허용)
      await reviewSvc.forceApprove(prNumber, parsed.data.comment.user.login);
      return c.json({ event: "issue_comment", command: "approve" });
    }
    case "help": {
      await github.addIssueComment(prNumber, HELP_COMMENT);
      return c.json({ event: "issue_comment", command: "help" });
    }
  }
}
```

### 4.4 `ReviewerAgent` 인스턴스 생성

Webhook 핸들러에서 `ReviewerAgent`를 만들기 위해 `LLMService`가 필요해요:

```typescript
// webhook.ts 상단에 추가
import { LLMService } from "../services/llm.js";
import { ReviewerAgent } from "../services/reviewer-agent.js";
import { GitHubReviewService, parseFoundryCommand } from "../services/github-review.js";

// 핸들러 내부
const llm = new LLMService(c.env.ANTHROPIC_API_KEY);
const reviewer = new ReviewerAgent(llm);
```

### 4.5 Help 코멘트 상수

```typescript
const HELP_COMMENT = `## 🤖 Foundry-X Commands

| Command | Description |
|---------|-------------|
| \`@foundry-x review\` | AI 코드 리뷰 실행 (SDD, Quality, Security 점수) |
| \`@foundry-x status\` | 현재 리뷰 상태 조회 |
| \`@foundry-x approve\` | 리뷰 게이트 강제 통과 (repo admin only) |
| \`@foundry-x help\` | 이 도움말 표시 |

---
_Powered by [Foundry-X](https://fx.minu.best)_`;
```

## §5 서브태스크 D: 리뷰 결과 자동 포스팅 + 라벨링 (상세 설계)

### 5.1 리뷰 코멘트 포맷 (`GitHubReviewService.postReviewToGitHub()`)

```typescript
private async postReviewToGitHub(
  prNumber: number,
  result: PrReviewResult,
): Promise<void> {
  const decisionEmoji = {
    approve: "✅ Approved",
    request_changes: "🔴 Changes Requested",
    comment: "💬 Comments",
  }[result.decision];

  const commentLines = result.comments
    .map((c) => `- \`${c.file}:${c.line}\` ${severityIcon(c.severity)} ${c.comment}`)
    .join("\n");

  const body = `## 🤖 Foundry-X AI Review

| Metric | Score |
|--------|------:|
| SDD Compliance | ${result.sddScore}/100 |
| Code Quality | ${result.qualityScore}/100 |
| Security Issues | ${result.securityIssues.length} |

**Decision:** ${decisionEmoji}

**Summary:** ${result.summary}

${commentLines ? `### Comments\n${commentLines}` : ""}

---
_Reviewed by [Foundry-X](https://fx.minu.best) AI Reviewer_`;

  // GitHub Review API (APPROVE/REQUEST_CHANGES/COMMENT)
  const ghEvent = result.decision === "approve"
    ? "APPROVE" as const
    : result.decision === "request_changes"
      ? "REQUEST_CHANGES" as const
      : "COMMENT" as const;

  await this.github.createPrReview(prNumber, { body, event: ghEvent });
}

function severityIcon(severity: string): string {
  return { error: "🔴", warning: "⚠️", info: "ℹ️" }[severity] ?? "ℹ️";
}
```

### 5.2 라벨링 (`GitHubReviewService.applyReviewLabels()`)

```typescript
private async applyReviewLabels(
  prNumber: number,
  result: PrReviewResult,
): Promise<string[]> {
  const labels: string[] = [];

  // SDD score 라벨
  labels.push(result.sddScore >= 80 ? "sdd:pass" : "sdd:needs-work");

  // Quality score 라벨
  labels.push(result.qualityScore >= 70 ? "quality:good" : "quality:needs-work");

  // Security 라벨
  if (result.securityIssues.length > 0) {
    labels.push("security:review-needed");
  }

  // Decision 라벨
  if (result.decision === "approve") {
    labels.push("fx-approved");
  }

  // 이전 fx-* 라벨 제거 후 새 라벨 추가
  await this.cleanPreviousLabels(prNumber);
  await this.github.addLabels(prNumber, labels);

  return labels;
}
```

### 5.3 `GitHubService.addLabels()` / `removeLabels()` 추가

```typescript
// github.ts에 추가

async addLabels(
  issueOrPrNumber: number,
  labels: string[],
): Promise<void> {
  const res = await fetch(
    `${this.baseUrl}/repos/${this.repo}/issues/${issueOrPrNumber}/labels`,
    {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ labels }),
    },
  );
  if (!res.ok) throw new GitHubApiError(res.status, `issues/${issueOrPrNumber}/labels`);
}

async removeLabel(
  issueOrPrNumber: number,
  label: string,
): Promise<void> {
  const res = await fetch(
    `${this.baseUrl}/repos/${this.repo}/issues/${issueOrPrNumber}/labels/${encodeURIComponent(label)}`,
    { method: "DELETE", headers: this.headers() },
  );
  // 404는 무시 (라벨이 없는 경우)
  if (!res.ok && res.status !== 404) {
    throw new GitHubApiError(res.status, `issues/${issueOrPrNumber}/labels/${label}`);
  }
}
```

> **참고**: `createPullRequest()` (L217-226)에서 이미 같은 패턴으로 라벨을 추가하고 있어요. 이걸 독립 메서드로 추출하는 것이에요.

## §6 서브태스크 E: Webhook Org 라우팅 (상세 설계)

### 6.1 현재 → 변경

**현재** (`webhook.ts:56`):
```typescript
const sync = new GitHubSyncService(github, c.env.DB, "org_default");
```

**변경 후**:
```typescript
const orgId = await resolveOrgFromWebhook(c.env.DB, body, c.env.WEBHOOK_SECRET);
const sync = new GitHubSyncService(github, c.env.DB, orgId);
```

### 6.2 `resolveOrgFromWebhook()` 함수

```typescript
async function resolveOrgFromWebhook(
  db: D1Database,
  rawBody: string,
  globalSecret: string | undefined,
  signature: string | undefined,
): Promise<string> {
  if (!signature) return "org_default"; // 서명 없으면 기본

  // 1. 글로벌 시크릿 먼저 확인 (기존 동작 호환)
  if (globalSecret) {
    const expected = await computeHmacSha256(globalSecret, rawBody);
    if (signature === `sha256=${expected}`) return "org_default";
  }

  // 2. org별 시크릿 확인
  const orgs = await db
    .prepare("SELECT id, settings FROM organizations WHERE settings IS NOT NULL")
    .all<{ id: string; settings: string }>();

  for (const org of orgs.results ?? []) {
    try {
      const settings = JSON.parse(org.settings) as { webhookSecret?: string };
      if (!settings.webhookSecret) continue;
      const expected = await computeHmacSha256(settings.webhookSecret, rawBody);
      if (signature === `sha256=${expected}`) return org.id;
    } catch {
      continue;
    }
  }

  // 3. 매칭 안 되면 기본
  return "org_default";
}
```

### 6.3 HMAC 검증 리팩토링

기존 `computeHmacSha256()`을 `resolveOrgFromWebhook()`과 통합. 기존의 signature 검증 블록(webhook.ts L38-44)을 `resolveOrgFromWebhook()`로 대체하되, 검증 실패 시에도 `org_default`로 폴백 (기존 동작 유지).

### 6.4 org settings JSON 구조

```jsonc
// organizations.settings 컬럼
{
  "webhookSecret": "whsec_...",     // GitHub webhook secret (org별)
  "githubRepo": "KTDS-AXBD/Foundry-X", // org별 연동 리포
  "autoCreateTasks": true,           // Issue→Task 자동 생성 ON/OFF
  "reviewCooldownMinutes": 5         // 리뷰 쿨다운 (기본 5분)
}
```

## §7 에러 처리

### 7.1 에러 클래스

```typescript
// services/github-review.ts

export class ReviewCooldownError extends Error {
  constructor(public prNumber: number) {
    super(`PR #${prNumber} was recently reviewed. Please wait 5 minutes.`);
  }
}

export class PrNotFoundError extends Error {
  constructor(public prNumber: number) {
    super(`PR #${prNumber} not found`);
  }
}
```

### 7.2 Rate Limit 보호

- `GitHubReviewService.reviewPr()` 호출 전 `github.getRateLimit()` 확인
- remaining < 100이면 429 응답 + `Retry-After` 헤더
- LLM 호출도 일일 제한: DB에서 오늘 리뷰 건수 카운트 (재사용: `getTodayMergeCount()` 패턴)

## §8 테스트 설계

### 8.1 `github-review.test.ts` (신규, 20건)

```typescript
describe("GitHubReviewService", () => {
  describe("reviewPr", () => {
    it("should review external PR and post result to GitHub");
    it("should create agent_prs record for external PR");
    it("should update existing agent_prs record on re-review");
    it("should reject review within cooldown period (429)");
    it("should add score-based labels to PR");
    it("should clean previous fx-* labels before adding new ones");
    it("should handle GitHub API errors gracefully");
    it("should handle LLM service errors with default review");
  });

  describe("getReviewResult", () => {
    it("should return review result by PR number");
    it("should return null for unreviewed PR");
  });

  describe("parseFoundryCommand", () => {
    it("should parse '@foundry-x review'");
    it("should parse '@foundry-x status'");
    it("should parse '@foundry-x approve'");
    it("should parse '@foundry-x help'");
    it("should ignore non-foundry comments");
    it("should be case-insensitive");
    it("should extract args after command");
  });
});
```

### 8.2 `github-sync.test.ts` (확장, +8건)

```typescript
describe("Issue→Task auto-creation", () => {
  it("should auto-create task when Issue opened with foundry-x label");
  it("should skip auto-creation without foundry-x label");
  it("should skip auto-creation for non-opened actions");
  it("should extract task_type from Issue labels (bug → bug-fix)");
  it("should extract task_type from Issue labels (enhancement → feature)");
  it("should default task_type to 'task' when no matching label");
  it("should not create duplicate task for same Issue number");
  it("should truncate Issue body to 1000 chars");
});
```

### 8.3 `webhook-comment.test.ts` (신규, 12건)

```typescript
describe("POST /webhook/git (issue_comment)", () => {
  it("should trigger review on '@foundry-x review' comment");
  it("should post status on '@foundry-x status' comment");
  it("should force approve on '@foundry-x approve' comment");
  it("should post help on '@foundry-x help' comment");
  it("should skip non-PR comments (issue.pull_request absent)");
  it("should skip edited/deleted comment actions");
  it("should skip comments without @foundry-x mention");
  it("should validate comment event schema");
  it("should handle review cooldown error (429)");
  it("should handle GitHub API error gracefully");
  it("should resolve org from webhook signature");
  it("should fallback to org_default when no org matches");
});
```

### 8.4 Mock 전략

| 의존성 | Mock 방식 |
|--------|-----------|
| `GitHubService` | `vi.fn()` — 모든 메서드 mock |
| `ReviewerAgent` | `vi.fn()` — `reviewPullRequest()` mock |
| `LLMService` | `vi.fn()` — `generate()` mock |
| `D1Database` | 기존 `createMockD1()` — in-memory SQLite |

## §9 구현 순서 (Do Phase 가이드)

```
1. schemas/webhook.ts         — githubCommentEventSchema 추가 (5분)
2. schemas/github.ts          — prNumberParamsSchema + externalReviewResultSchema (5분)
3. services/github.ts         — addLabels(), removeLabel() 추가 (10분)
4. services/github-sync.ts    — createTaskFromIssue(), 유틸리티 (20분)
5. services/github-review.ts  — GitHubReviewService + parseFoundryCommand() (30분)
6. routes/github.ts           — POST/GET /github/pr/:prNumber/review (20분)
7. routes/webhook.ts          — issue_comment 핸들러 + org 라우팅 (20분)
8. app.ts                     — githubRoute 등록 (2분)
9. 테스트 작성                 — github-review.test.ts + github-sync 확장 + webhook-comment.test.ts (60분)
```

## §10 변경 파일 최종 정리

### 신규 파일 (5개)

| # | 파일 | 역할 |
|:-:|------|------|
| 1 | `packages/api/src/services/github-review.ts` | 외부 PR 리뷰 서비스 + 커맨드 파서 |
| 2 | `packages/api/src/routes/github.ts` | GitHub API 라우트 (외부 PR 리뷰) |
| 3 | `packages/api/src/schemas/github.ts` | GitHub Zod 스키마 |
| 4 | `packages/api/src/__tests__/github-review.test.ts` | 리뷰 서비스 테스트 (20건) |
| 5 | `packages/api/src/__tests__/webhook-comment.test.ts` | 코멘트 인터랙션 테스트 (12건) |

### 수정 파일 (6개)

| # | 파일 | 변경 |
|:-:|------|------|
| 1 | `packages/api/src/services/github-sync.ts` | `createTaskFromIssue()` + 라벨 유틸리티 |
| 2 | `packages/api/src/services/github.ts` | `addLabels()`, `removeLabel()` 추가 |
| 3 | `packages/api/src/routes/webhook.ts` | `issue_comment` 핸들러 + org 라우팅 |
| 4 | `packages/api/src/schemas/webhook.ts` | `githubCommentEventSchema` 추가 |
| 5 | `packages/api/src/app.ts` | `githubRoute` 등록 |
| 6 | `packages/api/src/__tests__/github-sync.test.ts` | Issue→Task 자동 생성 테스트 (+8건) |
