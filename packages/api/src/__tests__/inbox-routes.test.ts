import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

describe("inbox routes (D1)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    headers = {
      ...(await createAuthHeaders()),
      "Content-Type": "application/json",
    };
  });

  // ─── POST /send ───

  it("POST /api/agents/inbox/send creates message (201)", async () => {
    const res = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Implement feature",
          payload: { files: ["a.ts"] },
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.id).toMatch(/^msg-/);
    expect(data.fromAgentId).toBe("leader");
    expect(data.toAgentId).toBe("worker-1");
    expect(data.acknowledged).toBe(false);
  });

  it("POST /api/agents/inbox/send with parentMessageId (201)", async () => {
    // Create parent first
    const parentRes = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Root task",
          payload: {},
        }),
      },
      env,
    );
    const parent = (await parentRes.json()) as any;

    // Reply
    const res = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "worker-1",
          toAgentId: "leader",
          type: "task_result",
          subject: "Done",
          payload: { result: "ok" },
          parentMessageId: parent.id,
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.parentMessageId).toBe(parent.id);
  });

  it("POST /api/agents/inbox/send missing fields (400)", async () => {
    const res = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ fromAgentId: "leader" }),
      },
      env,
    );
    // Zod parse throws → Hono returns 400 or 500 depending on error handler
    expect([400, 500]).toContain(res.status);
  });

  // ─── GET /:agentId ───

  it("GET /api/agents/inbox/:agentId returns messages (200)", async () => {
    // Seed messages
    await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Task A",
          payload: {},
        }),
      },
      env,
    );

    const res = await app.request(
      "/api/agents/inbox/worker-1",
      { headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].toAgentId).toBe("worker-1");
  });

  it("GET /api/agents/inbox/:agentId?unreadOnly=true filters unread (200)", async () => {
    // Create and ack one message
    const sendRes = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Read this",
          payload: {},
        }),
      },
      env,
    );
    const msg = (await sendRes.json()) as any;

    await app.request(
      `/api/agents/inbox/${msg.id}/ack`,
      { method: "POST", headers },
      env,
    );

    // Create another unread message
    await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Unread",
          payload: {},
        }),
      },
      env,
    );

    const res = await app.request(
      "/api/agents/inbox/worker-1?unreadOnly=true",
      { headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].subject).toBe("Unread");
  });

  // ─── GET /:parentMessageId/thread ───

  it("GET /api/agents/inbox/:parentMessageId/thread returns thread (200)", async () => {
    const parentRes = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Root",
          payload: {},
        }),
      },
      env,
    );
    const parent = (await parentRes.json()) as any;

    await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "worker-1",
          toAgentId: "leader",
          type: "task_result",
          subject: "Reply",
          payload: {},
          parentMessageId: parent.id,
        }),
      },
      env,
    );

    const res = await app.request(
      `/api/agents/inbox/${parent.id}/thread`,
      { headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.thread).toHaveLength(2);
    expect(data.parentMessageId).toBe(parent.id);
  });

  it("GET /api/agents/inbox/nonexistent/thread returns 404", async () => {
    const res = await app.request(
      "/api/agents/inbox/nonexistent/thread",
      { headers },
      env,
    );
    expect(res.status).toBe(404);
  });

  // ─── POST /:id/ack ───

  it("POST /api/agents/inbox/:id/ack acknowledges message (200)", async () => {
    const sendRes = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Ack me",
          payload: {},
        }),
      },
      env,
    );
    const msg = (await sendRes.json()) as any;

    const res = await app.request(
      `/api/agents/inbox/${msg.id}/ack`,
      { method: "POST", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.acknowledged).toBe(true);
  });

  it("POST /api/agents/inbox/:id/ack already acknowledged (404)", async () => {
    const sendRes = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Already acked",
          payload: {},
        }),
      },
      env,
    );
    const msg = (await sendRes.json()) as any;

    // First ack
    await app.request(
      `/api/agents/inbox/${msg.id}/ack`,
      { method: "POST", headers },
      env,
    );

    // Second ack
    const res = await app.request(
      `/api/agents/inbox/${msg.id}/ack`,
      { method: "POST", headers },
      env,
    );
    expect(res.status).toBe(404);
  });

  // ─── POST /:parentMessageId/ack-thread ───

  it("POST /api/agents/inbox/:parentMessageId/ack-thread batch acknowledges (200)", async () => {
    // Create thread
    const parentRes = await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
          subject: "Thread root",
          payload: {},
        }),
      },
      env,
    );
    const parent = (await parentRes.json()) as any;

    await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "worker-1",
          toAgentId: "leader",
          type: "task_result",
          subject: "Reply 1",
          payload: {},
          parentMessageId: parent.id,
        }),
      },
      env,
    );

    await app.request(
      "/api/agents/inbox/send",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_feedback",
          subject: "Reply 2",
          payload: {},
          parentMessageId: parent.id,
        }),
      },
      env,
    );

    // Ack thread
    const res = await app.request(
      `/api/agents/inbox/${parent.id}/ack-thread`,
      { method: "POST", headers },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.acknowledged).toBe(true);
    expect(data.count).toBe(3);

    // Verify all acknowledged via thread endpoint
    const threadRes = await app.request(
      `/api/agents/inbox/${parent.id}/thread`,
      { headers },
      env,
    );
    const threadData = (await threadRes.json()) as any;
    expect(threadData.thread.every((m: any) => m.acknowledged)).toBe(true);
  });
});
