import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlackService, verifySlackSignature } from "../services/slack.js";
import type { SlackEvent } from "../services/slack.js";
import { slackRoute } from "../routes/slack.js";
import { Hono } from "hono";

// ─── SlackService Tests ───

describe("SlackService", () => {
  let service: SlackService;
  const webhookUrl = "https://hooks.slack.com/services/T00/B00/xxx";

  beforeEach(() => {
    service = new SlackService({ webhookUrl });
    vi.restoreAllMocks();
  });

  it("sendNotification calls fetch with correct webhook URL and blocks", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const event: SlackEvent = {
      type: "task.completed",
      title: "에이전트 작업 완료",
      body: "PR #42 코드 리뷰가 완료되었어요.",
      url: "https://fx.minu.best/dashboard",
    };

    const result = await service.sendNotification(event);
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, options] = mockFetch.mock.calls[0]!;
    expect(calledUrl).toBe(webhookUrl);
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.blocks).toBeDefined();
    expect(body.blocks[0].type).toBe("header");
  });

  it("sendNotification returns ok:false when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    const result = await service.sendNotification({
      type: "pr.merged",
      title: "PR Merged",
      body: "Details",
    });
    expect(result.ok).toBe(false);
  });

  it("buildBlocks for task.completed includes header, section, and dashboard button", () => {
    const blocks = service.buildBlocks({
      type: "task.completed",
      title: "작업 완료",
      body: "에이전트가 코드를 작성했어요.",
      url: "https://fx.minu.best/agents/1",
    });

    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.type).toBe("header");
    expect(blocks[1]!.type).toBe("section");
    expect(blocks[2]!.type).toBe("actions");

    const actions = blocks[2]! as any;
    expect(actions.elements[0].action_id).toBe("view_dashboard");
    expect(actions.elements[0].url).toBe("https://fx.minu.best/agents/1");
  });

  it("buildBlocks for pr.merged includes header and section only", () => {
    const blocks = service.buildBlocks({
      type: "pr.merged",
      title: "PR #10 머지 완료",
      body: "feature/slack → master",
    });

    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.type).toBe("header");
    expect(blocks[1]!.type).toBe("section");
  });

  it("buildBlocks for plan.waiting includes approve and reject buttons", () => {
    const blocks = service.buildBlocks({
      type: "plan.waiting",
      title: "계획 승인 대기",
      body: "Slack 통합 구현 계획이 생성되었어요.",
      planId: "plan_abc123",
    });

    expect(blocks).toHaveLength(3);
    const actions = blocks[2] as any;
    expect(actions.elements).toHaveLength(2);
    expect(actions.elements[0].action_id).toBe("plan_approve");
    expect(actions.elements[0].value).toBe("plan_abc123");
    expect(actions.elements[0].style).toBe("primary");
    expect(actions.elements[1].action_id).toBe("plan_reject");
    expect(actions.elements[1].style).toBe("danger");
  });
});

// ─── Signature Verification Tests ───

describe("verifySlackSignature", () => {
  const signingSecret = "test-slack-signing-secret";

  async function computeSignature(secret: string, timestamp: string, body: string): Promise<string> {
    const baseString = `v0:${timestamp}:${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
    return `v0=${[...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  }

  it("returns true for valid signature", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = "text=status&team_id=T1&user_id=U1&channel_id=C1";
    const signature = await computeSignature(signingSecret, timestamp, body);

    const valid = await verifySlackSignature(signingSecret, signature, timestamp, body);
    expect(valid).toBe(true);
  });

  it("returns false for tampered signature", async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = "text=status";
    const valid = await verifySlackSignature(signingSecret, "v0=invalid", timestamp, body);
    expect(valid).toBe(false);
  });

  it("returns false for stale timestamp (replay attack)", async () => {
    const staleTimestamp = String(Math.floor(Date.now() / 1000) - 600); // 10 minutes ago
    const body = "text=status";
    const signature = await computeSignature(signingSecret, staleTimestamp, body);

    const valid = await verifySlackSignature(signingSecret, signature, staleTimestamp, body);
    expect(valid).toBe(false);
  });
});

// ─── Slack Route Tests ───

describe("Slack routes", () => {
  function createApp() {
    const app = new Hono();
    // Mount slack route without auth — Slack uses its own signature verification
    app.route("/api", slackRoute);
    return app;
  }

  it("POST /api/slack/commands with text=status returns project status", async () => {
    const app = createApp();
    const body = "text=status&team_id=T1&user_id=U1&channel_id=C1";
    const res = await app.request("/api/slack/commands", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.response_type).toBe("ephemeral");
    expect(data.text).toContain("상태");
  });

  it("POST /api/slack/commands with text=plan triggers PlannerAgent message", async () => {
    const app = createApp();
    const body = "text=plan+Slack+통합&team_id=T1&user_id=U1&channel_id=C1";
    const res = await app.request("/api/slack/commands", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.response_type).toBe("ephemeral");
    expect(data.text).toContain("PlannerAgent");
  });

  it("POST /api/slack/interactions with plan_approve action returns approval message", async () => {
    const app = createApp();
    const payload = JSON.stringify({
      type: "block_actions",
      actions: [{ action_id: "plan_approve", value: "plan_xyz" }],
    });
    const body = `payload=${encodeURIComponent(payload)}`;
    const res = await app.request("/api/slack/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.text).toContain("승인");
    expect(data.text).toContain("plan_xyz");
  });

  it("POST /api/slack/interactions with plan_reject action returns rejection message", async () => {
    const app = createApp();
    const payload = JSON.stringify({
      type: "block_actions",
      actions: [{ action_id: "plan_reject", value: "plan_123" }],
    });
    const body = `payload=${encodeURIComponent(payload)}`;
    const res = await app.request("/api/slack/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.text).toContain("거절");
    expect(data.text).toContain("plan_123");
  });
});
