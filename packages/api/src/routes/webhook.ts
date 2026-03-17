import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { WikiSyncService } from "../services/wiki-sync.js";
import { GitHubService } from "../services/github.js";
import type { Env } from "../env.js";

export const webhookRoute = new OpenAPIHono<{ Bindings: Env }>();

const gitWebhookRoute = createRoute({
  method: "post",
  path: "/webhook/git",
  tags: ["Webhook"],
  summary: "GitHub Push Webhook 수신",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            ref: z.string(),
            commits: z.array(
              z.object({
                modified: z.array(z.string()),
                added: z.array(z.string()),
              }),
            ),
          }),
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
  if (c.env.WEBHOOK_SECRET) {
    const signature = c.req.header("x-hub-signature-256");
    const body = await c.req.text();
    const expected = await computeHmacSha256(c.env.WEBHOOK_SECRET, body);
    if (signature !== `sha256=${expected}`) {
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  const payload = await c.req.json();

  if (payload.ref !== "refs/heads/master") {
    return c.json({ message: "Skipped: not master branch" });
  }

  const modifiedFiles = payload.commits.flatMap(
    (commit: { modified: string[]; added: string[] }) => [
      ...commit.modified,
      ...commit.added,
    ],
  );

  const github = new GitHubService(c.env.GITHUB_TOKEN, c.env.GITHUB_REPO);
  const sync = new WikiSyncService(github, c.env.DB);
  const result = await sync.pullFromGit(modifiedFiles);

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
