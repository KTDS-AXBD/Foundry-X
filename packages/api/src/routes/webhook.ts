import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { WikiSyncService } from "../services/wiki-sync.js";
import { GitHubService } from "../services/github.js";
import { GitHubSyncService } from "../services/github-sync.js";
import { githubIssueEventSchema, githubPrEventSchema } from "../schemas/webhook.js";
import type { Env } from "../env.js";

export const webhookRoute = new OpenAPIHono<{ Bindings: Env }>();

// ─── Unified GitHub Webhook Endpoint ───

const gitWebhookRoute = createRoute({
  method: "post",
  path: "/webhook/git",
  tags: ["Webhook"],
  summary: "GitHub Webhook 수신 (push / issues / pull_request)",
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
    401: { description: "서명 검증 실패" },
  },
});

webhookRoute.openapi(gitWebhookRoute, async (c) => {
  // Read body once — ReadableStream can only be consumed once
  const body = await c.req.text();

  // HMAC-SHA256 signature verification (required when secret is configured)
  if (c.env.WEBHOOK_SECRET) {
    const signature = c.req.header("x-hub-signature-256");
    const expected = await computeHmacSha256(c.env.WEBHOOK_SECRET, body);
    if (signature !== `sha256=${expected}`) {
      return c.json({ error: "Invalid signature" }, 401);
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
    const sync = new GitHubSyncService(github, c.env.DB, "org_default");
    const result = await sync.syncIssueToTask(parsed.data);
    return c.json({ event: "issues", ...result });
  }

  // ─── Pull Request event ───
  if (eventType === "pull_request") {
    const parsed = githubPrEventSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json({ error: "Invalid PR event payload" }, 400);
    }
    const sync = new GitHubSyncService(github, c.env.DB, "org_default");
    const result = await sync.syncPrStatus(parsed.data);
    return c.json({ event: "pull_request", ...result });
  }

  // ─── Push event (existing behavior) ───
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

  return c.json(result);
});

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
