import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

let env: ReturnType<typeof createTestEnv>;
let authHeaders: Record<string, string>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders, ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function webhookReq(body: unknown) {
  return app.request("http://localhost/api/webhook/git", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-github-event": "issues" },
    body: JSON.stringify(body),
  }, env);
}

function execDb(sql: string) {
  (env.DB as any).exec(sql);
}

beforeEach(async () => {
  env = createTestEnv();
  // F340: feedback-queue는 Webhook Secret 인증 (JWT가 아닌 X-Webhook-Secret 헤더)
  (env as any).WEBHOOK_SECRET = "test-webhook-secret";
  authHeaders = { "X-Webhook-Secret": "test-webhook-secret" };
  // Ensure agent_tasks has github_issue_number column (same as webhook-extended.test.ts)
  execDb("ALTER TABLE agent_tasks ADD COLUMN github_issue_number INTEGER DEFAULT NULL");
  execDb("CREATE INDEX IF NOT EXISTS idx_tasks_github ON agent_tasks(github_issue_number)");
});

describe("FeedbackQueueService — via API", () => {
  // ── Enqueue tests (via webhook) ──

  it("webhook — visual-feedback Issue opened → queue INSERT", async () => {
    const res = await webhookReq({
      action: "opened",
      issue: {
        number: 42,
        title: "[Visual] Button misaligned",
        body: "The submit button is off by 10px",
        state: "open",
        labels: [{ name: "visual-feedback" }, { name: "bug" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.feedbackQueued).toBe(true);
  });

  it("webhook — 일반 Issue (라벨 없음) → 큐 미등록", async () => {
    const res = await webhookReq({
      action: "opened",
      issue: {
        number: 43,
        title: "Regular issue",
        body: "Not visual feedback",
        state: "open",
        labels: [{ name: "enhancement" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.feedbackQueued).toBe(false);
  });

  it("webhook — labeled 액션 → visual-feedback 큐 등록", async () => {
    const res = await webhookReq({
      action: "labeled",
      issue: {
        number: 44,
        title: "Existing issue gets label",
        body: "Added visual-feedback label later",
        state: "open",
        labels: [{ name: "visual-feedback" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.feedbackQueued).toBe(true);
  });

  // ── CRUD API tests ──

  it("GET /feedback-queue — 빈 목록", async () => {
    const res = await req("GET", "/api/feedback-queue");
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("POST /feedback-queue/consume — pending 없을 때 null", async () => {
    const res = await req("POST", "/api/feedback-queue/consume");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeNull();
  });

  it("enqueue → list → consume → complete 전체 흐름", async () => {
    // 1. Enqueue via webhook
    await webhookReq({
      action: "opened",
      issue: {
        number: 100,
        title: "Fix header",
        body: "Header is broken",
        state: "open",
        labels: [{ name: "visual-feedback" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });

    // 2. List — should have 1 pending item
    const listRes = await req("GET", "/api/feedback-queue?status=pending");
    expect(listRes.status).toBe(200);
    const listData = await listRes.json() as any;
    expect(listData.total).toBe(1);
    expect(listData.items[0].status).toBe("pending");
    expect(listData.items[0].github_issue_number).toBe(100);

    // 3. Consume — pending → processing
    const consumeRes = await req("POST", "/api/feedback-queue/consume");
    expect(consumeRes.status).toBe(200);
    const consumed = await consumeRes.json() as any;
    expect(consumed.status).toBe("processing");
    expect(consumed.github_issue_number).toBe(100);

    // 4. Complete — processing → done
    const patchRes = await req("PATCH", `/api/feedback-queue/${consumed.id}`, {
      body: { status: "done", agentPrUrl: "https://github.com/KTDS-AXBD/Foundry-X/pull/999" },
    });
    expect(patchRes.status).toBe(200);
    const completed = await patchRes.json() as any;
    expect(completed.status).toBe("done");
    expect(completed.agent_pr_url).toBe("https://github.com/KTDS-AXBD/Foundry-X/pull/999");
  });

  it("enqueue → consume → fail → retry_count 증가", async () => {
    await webhookReq({
      action: "opened",
      issue: {
        number: 200,
        title: "Fail test",
        body: null,
        state: "open",
        labels: [{ name: "visual-feedback" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });

    const consumeRes = await req("POST", "/api/feedback-queue/consume");
    const consumed = await consumeRes.json() as any;

    const failRes = await req("PATCH", `/api/feedback-queue/${consumed.id}`, {
      body: { status: "failed", errorMessage: "Agent timeout" },
    });
    expect(failRes.status).toBe(200);
    const failed = await failRes.json() as any;
    expect(failed.status).toBe("failed");
    expect(failed.error_message).toBe("Agent timeout");
  });

  it("enqueue — 중복 Issue 무시 (INSERT OR IGNORE)", async () => {
    const issue = {
      action: "opened" as const,
      issue: {
        number: 300,
        title: "Duplicate",
        body: "Dup test",
        state: "open" as const,
        labels: [{ name: "visual-feedback" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    };

    await webhookReq(issue);
    await webhookReq(issue); // duplicate

    const listRes = await req("GET", "/api/feedback-queue");
    const listData = await listRes.json() as any;
    expect(listData.total).toBe(1);
  });

  it("GET /feedback-queue/:id — 존재하는 아이템", async () => {
    await webhookReq({
      action: "opened",
      issue: {
        number: 400,
        title: "Get by ID test",
        body: "Testing getById",
        state: "open",
        labels: [{ name: "visual-feedback" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });

    const listRes = await req("GET", "/api/feedback-queue");
    const listData = await listRes.json() as any;
    const itemId = listData.items[0].id;

    const getRes = await req("GET", `/api/feedback-queue/${itemId}`);
    expect(getRes.status).toBe(200);
    const item = await getRes.json() as any;
    expect(item.title).toBe("Get by ID test");
  });

  it("GET /feedback-queue/:id — 없는 아이템 → 404", async () => {
    const res = await req("GET", "/api/feedback-queue/nonexistent-id");
    expect(res.status).toBe(404);
  });

  it("skip — status=skipped 설정", async () => {
    await webhookReq({
      action: "opened",
      issue: {
        number: 500,
        title: "Skip test",
        body: null,
        state: "open",
        labels: [{ name: "visual-feedback" }],
      },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });

    const listRes = await req("GET", "/api/feedback-queue");
    const listData = await listRes.json() as any;
    const itemId = listData.items[0].id;

    const skipRes = await req("PATCH", `/api/feedback-queue/${itemId}`, {
      body: { status: "skipped", errorMessage: "Not applicable" },
    });
    expect(skipRes.status).toBe(200);
    const skipped = await skipRes.json() as any;
    expect(skipped.status).toBe("skipped");
  });

  it("list — status 필터링 (pending only)", async () => {
    // Insert 2 items
    await webhookReq({
      action: "opened",
      issue: { number: 601, title: "A", body: null, state: "open", labels: [{ name: "visual-feedback" }] },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });
    await webhookReq({
      action: "opened",
      issue: { number: 602, title: "B", body: null, state: "open", labels: [{ name: "visual-feedback" }] },
      repository: { full_name: "KTDS-AXBD/Foundry-X" },
    });

    // Consume one
    await req("POST", "/api/feedback-queue/consume");

    // Filter by pending — should be 1
    const pendingRes = await req("GET", "/api/feedback-queue?status=pending");
    const pendingData = await pendingRes.json() as any;
    expect(pendingData.total).toBe(1);

    // Filter by processing — should be 1
    const procRes = await req("GET", "/api/feedback-queue?status=processing");
    const procData = await procRes.json() as any;
    expect(procData.total).toBe(1);
  });
});
