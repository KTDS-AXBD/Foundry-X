import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { SSEManager } from "../../core/infra/sse-manager.js";

async function makeSessionsFetcher(db: ReturnType<typeof createMockD1>) {
  return async (_: unknown, since: string) => {
    const result = await (db as any)
      .prepare(
        `SELECT id, agent_name, status, branch, started_at, ended_at
         FROM agent_sessions
         WHERE started_at > ? OR ended_at > ?
         ORDER BY started_at DESC LIMIT 10`,
      )
      .bind(since, since)
      .all();
    return result.results ?? [];
  };
}

describe("SSEManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a readable stream and sends heartbeat when no sessions", async () => {
    const db = createMockD1();
    const manager = new SSEManager(db as any);
    const stream = manager.createStream();

    const reader = stream.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain(": heartbeat");
    reader.cancel();
  });

  it("emits activity event for active sessions", async () => {
    const db = createMockD1();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO agent_sessions (id, project_id, agent_name, branch, status, started_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind("sess-1", "default", "agent-code-review", "feat/test", "active", now)
      .run();

    const fetcher = await makeSessionsFetcher(db);
    const manager = new SSEManager(db as any, fetcher as any);
    const stream = manager.createStream();

    const reader = stream.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain("event: activity");
    expect(text).toContain("agent-code-review");
    reader.cancel();
  });

  it("emits status event for completed sessions", async () => {
    const db = createMockD1();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO agent_sessions (id, project_id, agent_name, branch, status, started_at, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind("sess-2", "default", "agent-test-writer", "feat/done", "completed", now, now)
      .run();

    const fetcher = await makeSessionsFetcher(db);
    const manager = new SSEManager(db as any, fetcher as any);
    const stream = manager.createStream();

    const reader = stream.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    expect(text).toContain("event: status");
    expect(text).toContain("agent-test-writer");
    expect(text).toContain("completed");
    reader.cancel();
  });
});
