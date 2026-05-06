import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { WikiSyncService } from "../services/wiki-sync.js";
import { GitHubService } from "../services/github.js";
import { GitHubSyncService } from "../services/github-sync.js";
import { githubIssueEventSchema, githubPrEventSchema, githubCommentEventSchema } from "../schemas/webhook.js";
import { LLMService } from "../../../core/infra/types.js";
import { ReviewerAgent } from "../../../core/agent/services/reviewer-agent.js";
import { GitHubReviewService, parseFoundryCommand, ReviewCooldownError, HELP_COMMENT, formatStatusComment } from "../services/github-review.js";
import { FeedbackQueueService } from "../services/feedback-queue-service.js";
import { SSEManager } from "../../../core/infra/sse-manager.js";
import type { Env } from "../../../env.js";

export const webhookRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── Unified GitHub Webhook Endpoint ───

const gitWebhookRoute = createRoute({
  method: "post",
  path: "/webhook/git",
  tags: ["Webhook"],
  summary: "GitHub Webhook 수신 (push / issues / pull_request / issue_comment)",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({}).passthrough(),
        },
      },
    },
  },
  responses: {
    200: { description: "동기화 결과" },
    400: { description: "잘못된 이벤트 페이로드" },
    401: { description: "서명 검증 실패" },
    429: { description: "쿨다운 중" },
  },
});

webhookRoute.openapi(gitWebhookRoute, async (c) => {
  // Read body once — ReadableStream can only be consumed once
  const body = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");

  // Reject unsigned requests when a secret is configured
  if (c.env.WEBHOOK_SECRET && !signature) {
    return c.json({ error: "Missing webhook signature" }, 401);
  }

  // Resolve org from webhook signature (handles HMAC verification internally)
  const orgId = await resolveOrgFromWebhook(c.env.DB, body, c.env.WEBHOOK_SECRET, signature);

  // If signature was provided but didn't match any known secret, reject
  if (c.env.WEBHOOK_SECRET && signature && orgId === "org_default") {
    const expected = await computeHmacSha256(c.env.WEBHOOK_SECRET, body);
    if (signature !== `sha256=${expected}`) {
      return c.json({ error: "Invalid webhook signature" }, 401);
    }
  }

  const payload = JSON.parse(body);
  const eventType = c.req.header("x-github-event") ?? "push";
  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);

  // ─── Issues event ───
  if (eventType === "issues") {
    const parsed = githubIssueEventSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid issue event payload" }, 400);
    }

    // ── visual-feedback 라벨 또는 [Marker.io] 제목 감지 → 피드백 큐 등록 (F319, F475) ──
    let feedbackQueued = false;
    const hasVisualFeedback = parsed.data.issue.labels.some(
      (l) => l.name === "visual-feedback"
    );
    const isMarkerIo = parsed.data.issue.title.startsWith("[Marker.io]");
    if ((hasVisualFeedback || isMarkerIo) && (parsed.data.action === "opened" || parsed.data.action === "labeled")) {
      const queueService = new FeedbackQueueService(c.env.DB);
      const issueUrl = `https://github.com/${parsed.data.repository.full_name}/issues/${parsed.data.issue.number}`;
      await queueService.enqueue(orgId, {
        number: parsed.data.issue.number,
        url: issueUrl,
        title: parsed.data.issue.title,
        body: parsed.data.issue.body,
        labels: parsed.data.issue.labels.map((l) => l.name),
      });
      feedbackQueued = true;
    }

    // 기존 syncIssueToTask 유지
    const sync = new GitHubSyncService(github, c.env.DB, orgId);
    const result = await sync.syncIssueToTask(parsed.data);
    return c.json({ event: "issues", ...result, feedbackQueued });
  }

  // ─── Pull Request event ───
  if (eventType === "pull_request") {
    const parsed = githubPrEventSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid PR event payload" }, 400);
    }
    const sync = new GitHubSyncService(github, c.env.DB, orgId);
    const result = await sync.syncPrStatus(parsed.data);
    return c.json({ event: "pull_request", ...result });
  }

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
    const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
    const reviewer = new ReviewerAgent(llm);
    const reviewSvc = new GitHubReviewService(github, reviewer, c.env.DB, orgId, c.env.GITHUB_REPO);

    switch (cmd.command) {
      case "review": {
        try {
          const result = await reviewSvc.reviewPr(prNumber);
          return c.json({ event: "issue_comment", command: "review", ...result });
        } catch (err) {
          if (err instanceof ReviewCooldownError) {
            return c.json({ error: err.message }, 429);
          }
          throw err;
        }
      }
      case "status": {
        const result = await reviewSvc.getReviewResult(prNumber);
        await github.addIssueComment(prNumber, formatStatusComment(result));
        return c.json({ event: "issue_comment", command: "status", result });
      }
      case "approve": {
        await reviewSvc.forceApprove(prNumber, parsed.data.comment.user.login);
        return c.json({ event: "issue_comment", command: "approve" });
      }
      case "help": {
        await github.addIssueComment(prNumber, HELP_COMMENT);
        return c.json({ event: "issue_comment", command: "help" });
      }
    }
  }

  // ─── Push event (existing behavior + F516 SSE broadcast) ───
  if (payload.ref !== "refs/heads/master") {
    return c.json({ message: "Skipped: not master branch" });
  }

  const modifiedFiles = payload.commits.flatMap(
    (commit: { modified: string[]; added: string[] }) => [
      ...commit.modified,
      ...commit.added,
    ],
  );

  const wikiSync = new WikiSyncService(github, c.env.DB);
  const result = await wikiSync.pullFromGit(modifiedFiles);

  // F516: push 이벤트 → SSE broadcast (soft fail)
  try {
    const sseManager = new SSEManager(c.env.DB);
    sseManager.pushEvent({ event: "work:snapshot-refresh", data: { ref: payload.ref as string } });
  } catch {
    // SSE 실패는 응답에 영향 없음
  }

  return c.json(result);
});

// ─── Org routing: resolve org from webhook signature ───

async function resolveOrgFromWebhook(
  db: D1Database,
  rawBody: string,
  globalSecret: string | undefined,
  signature: string | undefined,
): Promise<string> {
  if (!signature) return "org_default";

  // 1. 글로벌 시크릿 먼저 확인 (기존 동작 호환)
  if (globalSecret) {
    const expected = await computeHmacSha256(globalSecret, rawBody);
    if (signature === `sha256=${expected}`) return "org_default";
  }

  // 2. org별 시크릿 확인
  try {
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
  } catch {
    // DB not available — fallback
  }

  // 3. 매칭 안 되면 기본
  return "org_default";
}

async function computeHmacSha256(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
