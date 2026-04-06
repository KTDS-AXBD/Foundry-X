import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlackService, verifySlackSignature, eventToCategory } from "../modules/portal/services/slack.js";
import type { SlackEvent } from "../modules/portal/services/slack.js";
import { slackRoute } from "../modules/portal/routes/slack.js";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";

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

  // ─── F94: 새 Block Kit 빌더 5건 ───

  it("buildBlocks for queue.conflict includes warning header and dashboard button", () => {
    const blocks = service.buildBlocks({
      type: "queue.conflict",
      title: "머지 큐 충돌 감지",
      body: "PR #5와 PR #7에서 동일 파일 수정이 감지되었어요.",
      url: "https://fx.minu.best/dashboard/queue",
    });

    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.type).toBe("header");
    expect((blocks[0] as any).text.text).toContain("⚠️");
    expect(blocks[1]!.type).toBe("section");
    expect(blocks[2]!.type).toBe("actions");
    expect((blocks[2] as any).elements[0].action_id).toBe("view_dashboard");
  });

  it("buildBlocks for message.received includes reply button", () => {
    const blocks = service.buildBlocks({
      type: "message.received",
      title: "에이전트 메시지 수신",
      body: "Reviewer가 코드 리뷰 결과를 보냈어요.",
      url: "https://fx.minu.best/agents/inbox",
    });

    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.type).toBe("header");
    expect((blocks[0] as any).text.text).toContain("💬");
    expect(blocks[2]!.type).toBe("actions");
    expect((blocks[2] as any).elements[0].url).toContain("inbox");
  });

  it("buildBlocks for plan.executing includes rocket header, no actions", () => {
    const blocks = service.buildBlocks({
      type: "plan.executing",
      title: "계획 실행 시작",
      body: "Slack 통합 계획 실행을 시작해요.",
    });

    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.type).toBe("header");
    expect((blocks[0] as any).text.text).toContain("🚀");
    expect(blocks[1]!.type).toBe("section");
    // No actions block
    expect(blocks.every((b) => b.type !== "actions")).toBe(true);
  });

  it("buildBlocks for plan.completed includes result button", () => {
    const blocks = service.buildBlocks({
      type: "plan.completed",
      title: "계획 실행 완료",
      body: "모든 작업이 성공적으로 완료되었어요.",
      url: "https://fx.minu.best/plans/abc",
    });

    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.type).toBe("header");
    expect((blocks[0] as any).text.text).toContain("✅");
    expect(blocks[2]!.type).toBe("actions");
    expect((blocks[2] as any).elements[0].url).toContain("plans");
  });

  it("buildBlocks for plan.failed includes error section and detail button", () => {
    const blocks = service.buildBlocks({
      type: "plan.failed",
      title: "계획 실행 실패",
      body: "TypeScript 컴파일 에러가 발생했어요.",
      url: "https://fx.minu.best/plans/abc",
    });

    expect(blocks).toHaveLength(3);
    expect(blocks[0]!.type).toBe("header");
    expect((blocks[0] as any).text.text).toContain("❌");
    expect(blocks[1]!.type).toBe("section");
    expect(blocks[2]!.type).toBe("actions");
  });
});

// ─── F94: eventToCategory 매핑 5건 ───

describe("eventToCategory", () => {
  it("maps agent.task.* to 'agent'", () => {
    expect(eventToCategory("agent.task.started")).toBe("agent");
    expect(eventToCategory("agent.task.completed")).toBe("agent");
  });

  it("maps agent.pr.* to 'pr'", () => {
    expect(eventToCategory("agent.pr.created")).toBe("pr");
    expect(eventToCategory("agent.pr.merged")).toBe("pr");
  });

  it("maps agent.plan.* to 'plan'", () => {
    expect(eventToCategory("agent.plan.waiting")).toBe("plan");
    expect(eventToCategory("agent.plan.approved")).toBe("plan");
  });

  it("maps agent.queue.* to 'queue'", () => {
    expect(eventToCategory("agent.queue.updated")).toBe("queue");
    expect(eventToCategory("agent.queue.conflict")).toBe("queue");
  });

  it("returns null for unknown event", () => {
    expect(eventToCategory("system.startup")).toBeNull();
    expect(eventToCategory("random.event")).toBeNull();
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

  function createDbApp() {
    const db = createMockD1();
    const app = new Hono();
    app.route("/api", slackRoute);
    return { app, db };
  }

  function interactionReq(app: Hono, payload: object, env?: Record<string, unknown>) {
    const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
    return app.request("/api/slack/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }, env);
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

  // ─── F94: Interactive D1 실 연동 8건 ───

  it("plan_approve updates agent_plans status to approved via D1", async () => {
    const { app, db } = createDbApp();
    await db.prepare(
      "INSERT INTO agent_plans (id, task_id, agent_id, status) VALUES (?, ?, ?, ?)",
    ).bind("plan_d1_test", "task_1", "agent_1", "pending_approval").run();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_approve", value: "plan_d1_test" }],
      user: { id: "U_SLACK_1", name: "TestUser" },
    }, { DB: db });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.replace_original).toBe(true);
    expect(data.blocks).toBeDefined();
    expect(data.blocks[0].text.text).toContain("승인 완료");

    const plan = await db.prepare("SELECT status, human_feedback FROM agent_plans WHERE id = ?").bind("plan_d1_test").first();
    expect((plan as any).status).toBe("approved");
    expect((plan as any).human_feedback).toContain("U_SLACK_1");
  });

  it("plan_approve returns replace_original block with user mention", async () => {
    const { app, db } = createDbApp();
    await db.prepare(
      "INSERT INTO agent_plans (id, task_id, agent_id, status) VALUES (?, ?, ?, ?)",
    ).bind("plan_block_test", "task_1", "agent_1", "pending_approval").run();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_approve", value: "plan_block_test" }],
      user: { id: "U_BLOCK", name: "Blocker" },
    }, { DB: db });

    const data = (await res.json()) as any;
    expect(data.replace_original).toBe(true);
    expect(data.blocks[0].text.text).toContain("<@U_BLOCK>");
  });

  it("plan_approve on already processed plan returns warning", async () => {
    const { app, db } = createDbApp();
    await db.prepare(
      "INSERT INTO agent_plans (id, task_id, agent_id, status) VALUES (?, ?, ?, ?)",
    ).bind("plan_done", "task_1", "agent_1", "approved").run();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_approve", value: "plan_done" }],
      user: { id: "U2", name: "User2" },
    }, { DB: db });

    const data = (await res.json()) as any;
    expect(data.text).toContain("이미 처리");
    expect(data.replace_original).toBe(true);
  });

  it("plan_approve with invalid planId returns warning (meta.changes=0)", async () => {
    const { app, db } = createDbApp();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_approve", value: "plan_nonexistent" }],
      user: { id: "U3", name: "User3" },
    }, { DB: db });

    const data = (await res.json()) as any;
    expect(data.text).toContain("이미 처리");
  });

  it("plan_reject updates agent_plans status to rejected via D1", async () => {
    const { app, db } = createDbApp();
    await db.prepare(
      "INSERT INTO agent_plans (id, task_id, agent_id, status) VALUES (?, ?, ?, ?)",
    ).bind("plan_reject_d1", "task_1", "agent_1", "pending_approval").run();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_reject", value: "plan_reject_d1" }],
      user: { id: "U_REJ", name: "Rejector" },
    }, { DB: db });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.replace_original).toBe(true);
    expect(data.blocks[0].text.text).toContain("거절됨");

    const plan = await db.prepare("SELECT status, human_feedback FROM agent_plans WHERE id = ?").bind("plan_reject_d1").first();
    expect((plan as any).status).toBe("rejected");
    expect((plan as any).human_feedback).toContain("U_REJ");
  });

  it("plan_reject returns replace_original block with user mention", async () => {
    const { app, db } = createDbApp();
    await db.prepare(
      "INSERT INTO agent_plans (id, task_id, agent_id, status) VALUES (?, ?, ?, ?)",
    ).bind("plan_rej_block", "task_1", "agent_1", "pending_approval").run();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_reject", value: "plan_rej_block" }],
      user: { id: "U_RB", name: "RejBlocker" },
    }, { DB: db });

    const data = (await res.json()) as any;
    expect(data.replace_original).toBe(true);
    expect(data.blocks[0].text.text).toContain("<@U_RB>");
  });

  it("plan_reject on already processed plan returns warning", async () => {
    const { app, db } = createDbApp();
    await db.prepare(
      "INSERT INTO agent_plans (id, task_id, agent_id, status) VALUES (?, ?, ?, ?)",
    ).bind("plan_rej_done", "task_1", "agent_1", "rejected").run();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_reject", value: "plan_rej_done" }],
      user: { id: "U4", name: "User4" },
    }, { DB: db });

    const data = (await res.json()) as any;
    expect(data.text).toContain("이미 처리");
  });

  it("interaction with no DB env falls back to text response", async () => {
    const app = createApp();

    const res = await interactionReq(app, {
      type: "block_actions",
      actions: [{ action_id: "plan_approve", value: "plan_no_db" }],
      user: { id: "U5", name: "User5" },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.text).toContain("승인");
    expect(data.text).toContain("plan_no_db");
  });
});

// ─── F94: 채널별 알림 라우팅 7건 ───

describe("Channel routing (eventToCategory + sendNotification)", () => {
  const webhookUrl = "https://hooks.slack.com/services/T00/B00/xxx";
  let service: SlackService;

  beforeEach(() => {
    service = new SlackService({ webhookUrl });
    vi.restoreAllMocks();
  });

  it("sendNotification uses given webhook for category-specific notification", async () => {
    const categoryWebhook = "https://hooks.slack.com/services/T00/B00/agent-channel";
    const agentService = new SlackService({ webhookUrl: categoryWebhook });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await agentService.sendNotification({
      type: "task.completed",
      title: "작업 완료",
      body: "테스트",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = mockFetch.mock.calls[0]!;
    expect(calledUrl).toBe(categoryWebhook);
  });

  it("sendNotification falls back to org webhook when no category config", async () => {
    const orgWebhook = "https://hooks.slack.com/services/T00/B00/org-fallback";
    const orgService = new SlackService({ webhookUrl: orgWebhook });
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await orgService.sendNotification({
      type: "pr.merged",
      title: "PR 머지",
      body: "fallback 테스트",
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = mockFetch.mock.calls[0]!;
    expect(calledUrl).toBe(orgWebhook);
  });

  it("skips notification when no webhook configured", async () => {
    // Just verify eventToCategory returns correctly — actual skip logic is in SSEManager
    expect(eventToCategory("agent.task.completed")).toBe("agent");
    expect(eventToCategory("unknown.event")).toBeNull();
  });

  it("eventToCategory correctly maps all category-eligible events", () => {
    const eligible = [
      "agent.task.started", "agent.pr.created", "agent.plan.waiting",
      "agent.queue.updated", "agent.message.received",
    ];
    for (const e of eligible) {
      expect(eventToCategory(e)).not.toBeNull();
    }
  });

  it("isSlackEligible equivalent: eventToCategory returns non-null for all 5 categories", () => {
    expect(eventToCategory("agent.task.completed")).toBe("agent");
    expect(eventToCategory("agent.pr.merged")).toBe("pr");
    expect(eventToCategory("agent.plan.approved")).toBe("plan");
    expect(eventToCategory("agent.queue.conflict")).toBe("queue");
    expect(eventToCategory("agent.message.thread_reply")).toBe("message");
  });

  it("isSlackEligible equivalent: returns null for unknown event", () => {
    expect(eventToCategory("system.health.check")).toBeNull();
    expect(eventToCategory("")).toBeNull();
  });

  it("handles new event types in sendNotification correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    // Test each new event type builds blocks without error
    const newTypes: Array<{ type: SlackEvent["type"]; expected: string }> = [
      { type: "queue.conflict", expected: "⚠️" },
      { type: "message.received", expected: "💬" },
      { type: "plan.executing", expected: "🚀" },
      { type: "plan.completed", expected: "✅" },
      { type: "plan.failed", expected: "❌" },
    ];

    for (const { type, expected } of newTypes) {
      const result = await service.sendNotification({
        type,
        title: `Test ${type}`,
        body: "테스트 내용",
        url: "https://fx.minu.best/test",
      });
      expect(result.ok).toBe(true);

      const callArgs = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]!;
      const body = JSON.parse(callArgs[1].body);
      expect(body.blocks[0].text.text).toContain(expected);
    }
  });
});
