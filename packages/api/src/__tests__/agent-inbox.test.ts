import { describe, it, expect, vi, beforeEach } from "vitest";
import { AgentInbox } from "../services/agent-inbox.js";

function createMockDb() {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
    first: vi.fn().mockResolvedValue(null),
    all: vi.fn().mockResolvedValue({ results: [] }),
  } as any;
}

function createMockSSE() {
  return { pushEvent: vi.fn() } as any;
}

describe("AgentInbox", () => {
  let db: ReturnType<typeof createMockDb>;
  let sse: ReturnType<typeof createMockSSE>;
  let inbox: AgentInbox;

  beforeEach(() => {
    db = createMockDb();
    sse = createMockSSE();
    inbox = new AgentInbox({ db, sse });
  });

  // ─── send ───

  it("sends a message and returns AgentMessage", async () => {
    const msg = await inbox.send(
      "leader", "worker-1", "task_assign",
      "Implement F70", { files: ["a.ts"] },
    );

    expect(msg.id).toMatch(/^msg-/);
    expect(msg.fromAgentId).toBe("leader");
    expect(msg.toAgentId).toBe("worker-1");
    expect(msg.type).toBe("task_assign");
    expect(msg.acknowledged).toBe(false);
    expect(db.prepare).toHaveBeenCalled();
  });

  it("emits SSE agent.message.received event", async () => {
    await inbox.send(
      "leader", "worker-1", "task_assign", "test", {},
    );

    expect(sse.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "agent.message.received",
        data: expect.objectContaining({
          fromAgentId: "leader",
          toAgentId: "worker-1",
          type: "task_assign",
        }),
      }),
    );
  });

  it("sends a threaded message with parentMessageId", async () => {
    const msg = await inbox.send(
      "worker-1", "leader", "task_result",
      "Done", { result: "ok" }, "msg-parent",
    );

    expect(msg.parentMessageId).toBe("msg-parent");
  });

  // ─── list ───

  it("lists unread messages only", async () => {
    db.all.mockResolvedValueOnce({
      results: [{
        id: "msg-1", from_agent_id: "leader", to_agent_id: "worker-1",
        type: "task_assign", subject: "test", payload: "{}",
        acknowledged: 0, parent_message_id: null,
        created_at: "2026-03-18T00:00:00Z", acknowledged_at: null,
      }],
    });

    const messages = await inbox.list("worker-1", { unreadOnly: true });
    expect(messages).toHaveLength(1);
    expect(messages[0]!.acknowledged).toBe(false);
  });

  it("lists all messages with limit", async () => {
    db.all.mockResolvedValueOnce({ results: [] });
    const messages = await inbox.list("worker-1", { limit: 10 });
    expect(messages).toHaveLength(0);
  });

  // ─── ack ───

  it("acknowledges a message (changes > 0)", async () => {
    db.run.mockResolvedValueOnce({ meta: { changes: 1 } });
    const result = await inbox.ack("msg-1");
    expect(result).toBe(true);
  });

  it("returns false when already acknowledged (changes = 0)", async () => {
    db.run.mockResolvedValueOnce({ meta: { changes: 0 } });
    const result = await inbox.ack("msg-already");
    expect(result).toBe(false);
  });

  // ─── getThread ───

  it("retrieves thread messages", async () => {
    db.all.mockResolvedValueOnce({
      results: [
        {
          id: "msg-parent", from_agent_id: "leader", to_agent_id: "worker-1",
          type: "task_assign", subject: "original", payload: "{}",
          acknowledged: 1, parent_message_id: null,
          created_at: "2026-03-18T00:00:00Z", acknowledged_at: "2026-03-18T00:01:00Z",
        },
        {
          id: "msg-reply", from_agent_id: "worker-1", to_agent_id: "leader",
          type: "task_result", subject: "reply", payload: '{"done":true}',
          acknowledged: 0, parent_message_id: "msg-parent",
          created_at: "2026-03-18T00:05:00Z", acknowledged_at: null,
        },
      ],
    });

    const thread = await inbox.getThread("msg-parent");
    expect(thread).toHaveLength(2);
    expect(thread[0]!.id).toBe("msg-parent");
    expect(thread[1]!.parentMessageId).toBe("msg-parent");
  });

  // ─── ackThread ───

  describe("ackThread", () => {
    it("acknowledges all messages in thread", async () => {
      db.run.mockResolvedValueOnce({ meta: { changes: 3 } });
      db.all.mockResolvedValueOnce({
        results: [
          {
            id: "msg-parent", from_agent_id: "a", to_agent_id: "b",
            type: "task_assign", subject: "Root", payload: "{}",
            acknowledged: 1, parent_message_id: null,
            created_at: "2026-03-18T00:00:00Z", acknowledged_at: "2026-03-18T00:01:00Z",
          },
          {
            id: "msg-r1", from_agent_id: "b", to_agent_id: "a",
            type: "task_result", subject: "Reply1", payload: "{}",
            acknowledged: 1, parent_message_id: "msg-parent",
            created_at: "2026-03-18T00:01:00Z", acknowledged_at: "2026-03-18T00:01:00Z",
          },
          {
            id: "msg-r2", from_agent_id: "a", to_agent_id: "b",
            type: "task_question", subject: "Reply2", payload: "{}",
            acknowledged: 1, parent_message_id: "msg-parent",
            created_at: "2026-03-18T00:02:00Z", acknowledged_at: "2026-03-18T00:01:00Z",
          },
        ],
      });

      const count = await inbox.ackThread("msg-parent");
      expect(count).toBe(3);

      const thread = await inbox.getThread("msg-parent");
      expect(thread.every(m => m.acknowledged)).toBe(true);
    });

    it("returns 0 when all already acknowledged", async () => {
      db.run.mockResolvedValueOnce({ meta: { changes: 0 } });
      const count = await inbox.ackThread("msg-parent");
      expect(count).toBe(0);
    });
  });

  // ─── SSE thread_reply ───

  it("emits thread_reply SSE event for threaded messages", async () => {
    await inbox.send(
      "worker-1", "leader", "task_result",
      "Reply", { result: "ok" }, "msg-parent",
    );

    expect(sse.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "agent.message.thread_reply",
        data: expect.objectContaining({
          parentMessageId: "msg-parent",
          fromAgentId: "worker-1",
          toAgentId: "leader",
        }),
      }),
    );
  });

  it("does not emit thread_reply for root messages", async () => {
    await inbox.send(
      "leader", "worker-1", "task_assign", "Root", {},
    );

    const calls = sse.pushEvent.mock.calls;
    const threadReplyCalls = calls.filter(
      (c: any) => c[0]?.event === "agent.message.thread_reply",
    );
    expect(threadReplyCalls).toHaveLength(0);
  });
});
