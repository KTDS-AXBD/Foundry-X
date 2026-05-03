import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";

// ─── Mock external services ───

vi.mock("../modules/portal/services/github-review.js", () => {
  const ReviewCooldownError = class ReviewCooldownError extends Error {
    prNumber: number;
    constructor(prNumber: number) {
      super(`PR #${prNumber} was recently reviewed. Please wait 5 minutes.`);
      this.prNumber = prNumber;
    }
  };

  return {
    GitHubReviewService: vi.fn().mockImplementation(() => ({
      reviewPr: vi.fn().mockResolvedValue({
        prNumber: 42,
        decision: "approve",
        summary: "Looks good",
        sddScore: 90,
        qualityScore: 85,
        securityIssues: [],
        comments: [],
        labels: ["sdd:pass"],
        reviewedAt: "2026-03-19T00:00:00Z",
      }),
      getReviewResult: vi.fn().mockResolvedValue({
        prNumber: 42,
        decision: "approve",
        sddScore: 90,
        qualityScore: 85,
      }),
      forceApprove: vi.fn().mockResolvedValue(undefined),
    })),
    parseFoundryCommand: vi.fn((body: string) => {
      const match = body.match(/@foundry-x\s+(review|status|approve|help)(?:\s+(.*))?/i);
      if (!match) return null;
      return { command: match[1]!.toLowerCase(), args: match[2]?.trim() ?? "" };
    }),
    ReviewCooldownError,
    HELP_COMMENT: "## 🤖 Foundry-X Commands\n\nUse @foundry-x <command>",
    formatStatusComment: vi.fn((result: unknown) => `Status: ${JSON.stringify(result)}`),
  };
});

vi.mock("../services/llm.js", () => ({
  LLMService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../services/reviewer-agent.js", () => ({
  ReviewerAgent: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../modules/portal/services/wiki-sync.js", () => ({
  WikiSyncService: vi.fn().mockImplementation(() => ({
    pullFromGit: vi.fn().mockResolvedValue({ synced: 0 }),
  })),
}));

vi.mock("../modules/portal/services/github.js", () => ({
  GitHubService: vi.fn().mockImplementation(() => ({
    addIssueComment: vi.fn().mockResolvedValue({ id: 1 }),
  })),
}));

vi.mock("../modules/portal/services/github-sync.js", () => ({
  GitHubSyncService: vi.fn().mockImplementation(() => ({
    syncIssueToTask: vi.fn().mockResolvedValue({ taskId: null, action: "no_matching_task" }),
    syncPrStatus: vi.fn().mockResolvedValue({ prRecordId: null, action: "no_matching_pr" }),
  })),
}));

// ─── Import after mocks ───

import { webhookRoute } from "../modules/portal/routes/webhook.js";
import { Hono } from "hono";
import { GitHubReviewService, ReviewCooldownError } from "../modules/portal/services/github-review.js";

function createTestApp(envOverrides: Record<string, unknown> = {}) {
  const app = new Hono();
  const db = createMockD1();

  // Mount webhook route under /api
  const webhookApp = new Hono();
  webhookApp.route("/api", webhookRoute);

  // Inject env bindings
  app.use("*", async (c, next) => {
    (c as any).env = {
      DB: db,
      GITHUB_TOKEN: "ghp_test",
      GITHUB_REPO: "KTDS-AXBD/Foundry-X",
      ANTHROPIC_API_KEY: "sk-test",
      WEBHOOK_SECRET: undefined,
      AI: undefined,
      ...envOverrides,
    };
    await next();
  });
  app.route("/", webhookApp);

  return { app, db };
}

function makeCommentPayload(overrides: Record<string, unknown> = {}) {
  return {
    action: "created",
    comment: {
      id: 1001,
      body: "@foundry-x review",
      user: { login: "testuser" },
      created_at: "2026-03-19T12:00:00Z",
    },
    issue: {
      number: 42,
      title: "Test PR",
      pull_request: { url: "https://api.github.com/repos/test/pulls/42" },
    },
    repository: { full_name: "KTDS-AXBD/Foundry-X" },
    ...overrides,
  };
}

describe("POST /webhook/git (issue_comment)", () => {
  let app: ReturnType<typeof createTestApp>["app"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ app } = createTestApp());
  });

  // ─── 1. @foundry-x review ───
  it("should trigger review on @foundry-x review comment", async () => {
    const payload = makeCommentPayload();
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.event).toBe("issue_comment");
    expect(json.command).toBe("review");
    expect(json.prNumber).toBe(42);
    expect(json.decision).toBe("approve");
  });

  // ─── 2. @foundry-x status ───
  it("should post status on @foundry-x status comment", async () => {
    const payload = makeCommentPayload({
      comment: {
        id: 1001,
        body: "@foundry-x status",
        user: { login: "testuser" },
        created_at: "2026-03-19T12:00:00Z",
      },
    });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.event).toBe("issue_comment");
    expect(json.command).toBe("status");
  });

  // ─── 3. @foundry-x approve ───
  it("should handle @foundry-x approve comment", async () => {
    const payload = makeCommentPayload({
      comment: {
        id: 1001,
        body: "@foundry-x approve",
        user: { login: "admin" },
        created_at: "2026-03-19T12:00:00Z",
      },
    });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.command).toBe("approve");
  });

  // ─── 4. @foundry-x help ───
  it("should post help on @foundry-x help comment", async () => {
    const payload = makeCommentPayload({
      comment: {
        id: 1001,
        body: "@foundry-x help",
        user: { login: "testuser" },
        created_at: "2026-03-19T12:00:00Z",
      },
    });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.command).toBe("help");
  });

  // ─── 5. Skip non-PR comments ───
  it("should skip non-PR comments (issue.pull_request absent)", async () => {
    const payload = makeCommentPayload({
      issue: {
        number: 42,
        title: "Test Issue (not a PR)",
        // pull_request is absent
      },
    });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.action).toBe("skipped:not_pr");
  });

  // ─── 6. Skip edited comments ───
  it("should skip edited comment actions", async () => {
    const payload = makeCommentPayload({ action: "edited" });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.action).toBe("skipped:edited");
  });

  // ─── 7. Skip deleted comments ───
  it("should skip deleted comment actions", async () => {
    const payload = makeCommentPayload({ action: "deleted" });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.action).toBe("skipped:deleted");
  });

  // ─── 8. Skip comments without @foundry-x ───
  it("should skip comments without @foundry-x mention", async () => {
    const payload = makeCommentPayload({
      comment: {
        id: 1001,
        body: "Looks good to me!",
        user: { login: "testuser" },
        created_at: "2026-03-19T12:00:00Z",
      },
    });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.action).toBe("skipped:no_command");
  });

  // ─── 9. Invalid payload → 400 ───
  it("should validate comment event schema (invalid payload → 400)", async () => {
    const payload = { action: "created", invalid: true };
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(400);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toBe("Invalid comment event payload");
  });

  // ─── 10. Review cooldown → 429 ───
  it("should handle review cooldown error (429 response)", async () => {
    const { GitHubReviewService: MockGitHubReviewService } = await import("../modules/portal/services/github-review.js");
    const mockInstance = {
      reviewPr: vi.fn().mockRejectedValue(new ReviewCooldownError(42)),
      getReviewResult: vi.fn(),
      forceApprove: vi.fn(),
    };
    (MockGitHubReviewService as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(() => mockInstance);

    const payload = makeCommentPayload();
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(429);
    const json = await res.json() as Record<string, unknown>;
    expect(json.error).toContain("PR #42");
  });

  // ─── 11. Org resolution from webhook signature ───
  it("should resolve org from webhook signature", async () => {
    // With WEBHOOK_SECRET set, the global secret match returns org_default
    ({ app } = createTestApp({ WEBHOOK_SECRET: "test-secret" }));

    // Create a valid HMAC signature for the body
    const payload = makeCommentPayload({
      comment: {
        id: 1001,
        body: "@foundry-x help",
        user: { login: "testuser" },
        created_at: "2026-03-19T12:00:00Z",
      },
    });
    const bodyStr = JSON.stringify(payload);

    // Compute HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode("test-secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyStr));
    const hmac = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
        "x-hub-signature-256": `sha256=${hmac}`,
      },
      body: bodyStr,
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.command).toBe("help");
  });

  // ─── 12. Fallback to org_default ───
  it("should fallback to org_default when no org matches", async () => {
    // No WEBHOOK_SECRET means org_default fallback
    const payload = makeCommentPayload({
      comment: {
        id: 1001,
        body: "@foundry-x help",
        user: { login: "testuser" },
        created_at: "2026-03-19T12:00:00Z",
      },
    });
    const res = await app.request("/api/webhook/git", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-github-event": "issue_comment",
        // No x-hub-signature-256 header → resolveOrgFromWebhook returns org_default
      },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json.command).toBe("help");
  });
});
