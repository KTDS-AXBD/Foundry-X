import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { feedbackQueueItemSchema, feedbackQueueListSchema, feedbackQueueUpdateSchema } from "../schemas/feedback-queue.js";
import { FeedbackQueueService } from "../services/feedback-queue-service.js";
import { GitHubService } from "../services/github.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";

export const feedbackQueueRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── GET /feedback-queue ───

const listRoute = createRoute({
  method: "get",
  path: "/feedback-queue",
  tags: ["FeedbackQueue"],
  summary: "피드백 큐 목록 조회",
  request: {
    query: z.object({
      status: z.enum(["pending", "processing", "done", "failed", "skipped"]).optional(),
      limit: z.coerce.number().min(1).max(100).default(20),
      offset: z.coerce.number().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueListSchema } },
      description: "큐 목록",
    },
  },
});

feedbackQueueRoute.openapi(listRoute, async (c) => {
  const { status, limit, offset } = c.req.valid("query");
  const svc = new FeedbackQueueService(c.env.DB);
  const result = await svc.list({ status, limit, offset });
  return c.json(result as z.infer<typeof feedbackQueueListSchema>);
});

// ─── GET /feedback-queue/:id ───

const getByIdRoute = createRoute({
  method: "get",
  path: "/feedback-queue/{id}",
  tags: ["FeedbackQueue"],
  summary: "피드백 큐 아이템 상세",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueItemSchema } },
      description: "큐 아이템",
    },
    404: { description: "아이템 없음" },
  },
});

feedbackQueueRoute.openapi(getByIdRoute, async (c) => {
  const { id } = c.req.valid("param");
  const svc = new FeedbackQueueService(c.env.DB);
  const item = await svc.getById(id);
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json(item as z.infer<typeof feedbackQueueItemSchema>);
});

// ─── PATCH /feedback-queue/:id ───

const updateRoute = createRoute({
  method: "patch",
  path: "/feedback-queue/{id}",
  tags: ["FeedbackQueue"],
  summary: "큐 아이템 상태/결과 업데이트",
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: { "application/json": { schema: feedbackQueueUpdateSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueItemSchema } },
      description: "업데이트된 아이템",
    },
    404: { description: "아이템 없음" },
  },
});

feedbackQueueRoute.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const svc = new FeedbackQueueService(c.env.DB);
  const item = await svc.update(id, body);
  if (!item) return c.json({ error: "Not found" }, 404);

  // ── 상태 변경 시 GitHub Issue에 자동 코멘트 (F475) ──
  const typedItem = item as Record<string, unknown>;
  if (body.status && c.env.GITHUB_TOKEN && c.env.GITHUB_REPO && typedItem.github_issue_number) {
    const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
    const issueNum = typedItem.github_issue_number as number;
    let comment = "";
    if (body.status === "done" && body.agentPrUrl) {
      comment = `✅ **피드백 처리 완료**\n\nPR: ${body.agentPrUrl}\n\n이 피드백은 자동으로 분석되어 수정 PR이 생성되었어요.`;
    } else if (body.status === "failed") {
      comment = `⚠️ **자동 처리 실패**\n\n이 피드백은 자동 처리에 실패했어요. 수동으로 확인이 필요해요.\n\n${body.errorMessage ? `사유: ${body.errorMessage.slice(0, 200)}` : ""}`;
    } else if (body.status === "skipped") {
      comment = `⏭️ **피드백 스킵**\n\n이 피드백은 자동 처리 대상이 아니에요.\n\n${body.errorMessage ? `사유: ${body.errorMessage}` : ""}`;
    }
    if (comment) {
      try { await github.addIssueComment(issueNum, comment); } catch { /* best-effort */ }
    }
  }

  return c.json(item as z.infer<typeof feedbackQueueItemSchema>);
});

// ─── POST /feedback-queue/consume ───

const consumeRoute = createRoute({
  method: "post",
  path: "/feedback-queue/consume",
  tags: ["FeedbackQueue"],
  summary: "다음 pending 아이템 consume (pending→processing 원자적 전환)",
  responses: {
    200: {
      content: { "application/json": { schema: feedbackQueueItemSchema.nullable() } },
      description: "consume된 아이템 (없으면 null)",
    },
  },
});

feedbackQueueRoute.openapi(consumeRoute, async (c) => {
  const svc = new FeedbackQueueService(c.env.DB);
  const item = await svc.consume();
  return c.json(item as z.infer<typeof feedbackQueueItemSchema> | null);
});
