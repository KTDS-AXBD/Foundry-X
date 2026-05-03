import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { GitHubService } from "../services/github.js";
import { LLMService } from "../../../services/llm.js";
import { ReviewerAgent } from "../../../services/agent/reviewer-agent.js";
import { GitHubReviewService, ReviewCooldownError } from "../services/github-review.js";
import { prNumberParamsSchema } from "../schemas/github.js";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";

export const githubRoute = new OpenAPIHono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── POST /github/pr/:prNumber/review — 외부 PR 리뷰 요청 ───

const reviewPrRoute = createRoute({
  method: "post",
  path: "/github/pr/{prNumber}/review",
  tags: ["GitHub"],
  summary: "GitHub PR AI 리뷰 요청 (외부 PR 포함)",
  request: {
    params: prNumberParamsSchema,
  },
  responses: {
    200: {
      description: "리뷰 결과",
      content: {
        "application/json": {
          schema: z.object({
            prNumber: z.number(),
            decision: z.string(),
            summary: z.string(),
            sddScore: z.number(),
            qualityScore: z.number(),
          }),
        },
      },
    },
    429: {
      description: "쿨다운 중 (5분 내 재요청)",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

githubRoute.openapi(reviewPrRoute, async (c) => {
  const { prNumber } = c.req.valid("param");
  const orgId = c.get("orgId") ?? "org_default";
  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const reviewer = new ReviewerAgent(llm);
  const reviewSvc = new GitHubReviewService(github, reviewer, c.env.DB, orgId, c.env.GITHUB_REPO);

  try {
    const result = await reviewSvc.reviewPr(prNumber);
    return c.json(result);
  } catch (err) {
    if (err instanceof ReviewCooldownError) {
      return c.json({ error: err.message }, 429);
    }
    throw err;
  }
});

// ─── GET /github/pr/:prNumber/review — 리뷰 결과 조회 ───

const getReviewRoute = createRoute({
  method: "get",
  path: "/github/pr/{prNumber}/review",
  tags: ["GitHub"],
  summary: "PR 리뷰 결과 조회",
  request: {
    params: prNumberParamsSchema,
  },
  responses: {
    200: {
      description: "리뷰 결과",
      content: {
        "application/json": {
          schema: z.object({
            prNumber: z.number(),
            decision: z.string().nullable(),
            sddScore: z.number().nullable(),
            qualityScore: z.number().nullable(),
          }),
        },
      },
    },
    404: {
      description: "리뷰 없음",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

githubRoute.openapi(getReviewRoute, async (c) => {
  const { prNumber } = c.req.valid("param");
  const orgId = c.get("orgId") ?? "org_default";
  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const llm = new LLMService(c.env.AI, c.env.ANTHROPIC_API_KEY);
  const reviewer = new ReviewerAgent(llm);
  const reviewSvc = new GitHubReviewService(github, reviewer, c.env.DB, orgId, c.env.GITHUB_REPO);

  const result = await reviewSvc.getReviewResult(prNumber);
  if (!result) {
    return c.json({ error: "No review found for this PR" }, 404);
  }
  return c.json(result);
});
