import { describe, it, expect, vi, afterEach } from "vitest";
import { SSEManager } from "../core/infra/sse-manager.js";
import { createMockD1 } from "./helpers/mock-d1.js";

function createManager(): SSEManager {
  const db = createMockD1() as unknown as D1Database;
  return new SSEManager(db);
}

describe("SSEManager.pushEvent", () => {
  let manager: SSEManager;

  afterEach(() => {
    manager?.dispose();
  });

  it("delivers event to all active subscribers", () => {
    manager = createManager();
    const received: string[] = [];

    const sub1 = (payload: string): boolean => { received.push(`s1:${payload}`); return true; };
    const sub2 = (payload: string): boolean => { received.push(`s2:${payload}`); return true; };
    manager.subscribers.add(sub1);
    manager.subscribers.add(sub2);

    manager.pushEvent({
      event: "agent.task.started",
      data: {
        taskId: "task-001",
        agentId: "agent-review",
        taskType: "code-review",
        runnerType: "mock",
        startedAt: "2026-03-18T00:00:00Z",
      },
    });

    expect(received).toHaveLength(2);
    // agent.task.* events are wrapped as "status" for SSEClient compatibility
    expect(received[0]).toContain("event: status");
    expect(received[0]).toContain("task-001");
    expect(received[1]).toContain("event: status");
  });

  it("removes subscriber when send returns false", () => {
    manager = createManager();

    const deadSub = (_payload: string): boolean => false;
    const aliveSub = (_payload: string): boolean => true;
    manager.subscribers.add(deadSub);
    manager.subscribers.add(aliveSub);

    manager.pushEvent({
      event: "agent.task.started",
      data: {
        taskId: "task-002",
        agentId: "agent-test",
        taskType: "spec-analysis",
        runnerType: "mock",
        startedAt: "2026-03-18T00:00:00Z",
      },
    });

    expect(manager.subscribers.size).toBe(1);
    expect(manager.subscribers.has(aliveSub)).toBe(true);
    expect(manager.subscribers.has(deadSub)).toBe(false);
  });

  it("deduplicates same taskId+event combination", () => {
    manager = createManager();
    let count = 0;

    const sub = (_payload: string): boolean => { count++; return true; };
    manager.subscribers.add(sub);

    const event = {
      event: "agent.task.completed" as const,
      data: {
        taskId: "task-003",
        agentId: "agent-gen",
        status: "success" as const,
        tokensUsed: 100,
        durationMs: 500,
        completedAt: "2026-03-18T00:01:00Z",
      },
    };

    manager.pushEvent(event);
    manager.pushEvent(event); // duplicate — should be ignored

    expect(count).toBe(1);
  });
});
