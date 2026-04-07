import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";

// Mock external services before importing route
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock the agent runner factory
vi.mock("../core/agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "test" },
      tokensUsed: 10,
      model: "mock",
      duration: 5,
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    supportsTaskType: vi.fn().mockReturnValue(true),
  }),
}));

// Mock LLM and Reviewer
vi.mock("../services/llm.js", () => ({
  LLMService: vi.fn().mockImplementation(() => ({})),
}));
vi.mock("../core/agent/services/reviewer-agent.js", () => ({
  ReviewerAgent: vi.fn().mockImplementation(() => ({
    reviewPullRequest: vi.fn().mockResolvedValue({
      decision: "approve",
      summary: "OK",
      comments: [],
      sddScore: 90,
      qualityScore: 85,
      securityIssues: [],
    }),
  })),
}));

import { agentRoute } from "../core/agent/routes/agent.js";

describe("Agent Queue Routes (F68)", () => {
  let db: ReturnType<typeof createMockD1>;
  const env = {
    DB: null as any,
    GITHUB_TOKEN: "test-token",
    GITHUB_REPO: "KTDS-AXBD/Foundry-X",
    JWT_SECRET: "test",
    CACHE: {} as any,
    AI: {} as any,
    ANTHROPIC_API_KEY: "test-key",
  };

  beforeEach(() => {
    mockFetch.mockReset();
    db = createMockD1();
    env.DB = db as any;
  });

  it("GET /agents/queue returns empty queue", async () => {
    // Mock GitHub getModifiedFiles (won't be called for empty queue)
    const res = await agentRoute.request("/agents/queue", { method: "GET" }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: unknown[]; conflicts: { conflicting: unknown[] } };
    expect(body.entries).toEqual([]);
    expect(body.conflicts.conflicting).toEqual([]);
  });

  it("PATCH /agents/queue/:id/priority updates priority", async () => {
    // Seed a queue entry
    await db.prepare(
      `INSERT INTO merge_queue (id, pr_record_id, pr_number, agent_id, priority, position, modified_files, status, created_at, updated_at)
       VALUES ('mq-1', 'pr-1', 10, 'agent-1', 1, 1, '["src/a.ts"]', 'queued', datetime('now'), datetime('now'))`,
    ).run();

    const res = await agentRoute.request("/agents/queue/mq-1/priority", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: 5 }),
    }, env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { updated: boolean };
    expect(body.updated).toBe(true);
  });

  it("POST /agents/queue/process returns empty queue error", async () => {
    const res = await agentRoute.request("/agents/queue/process", {
      method: "POST",
    }, env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { merged: boolean; error?: string };
    expect(body.merged).toBe(false);
    expect(body.error).toBe("Queue is empty");
  });

  it("GET /agents/parallel/:id returns 404 for missing execution", async () => {
    const res = await agentRoute.request("/agents/parallel/nonexistent", {
      method: "GET",
    }, env);

    expect(res.status).toBe(404);
  });

  it("POST /agents/parallel executes tasks in parallel", async () => {
    const res = await agentRoute.request("/agents/parallel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: [
          { agentId: "agent-1", taskType: "code-review", context: { repoUrl: "https://github.com/test", branch: "main" } },
          { agentId: "agent-2", taskType: "code-review", context: { repoUrl: "https://github.com/test", branch: "main" } },
        ],
        createPrs: false,
      }),
    }, env);

    expect(res.status).toBe(200);
    const body = (await res.json()) as { executionId: string; results: unknown[]; durationMs: number };
    expect(body.executionId).toMatch(/^pexec-/);
    expect(body.results).toHaveLength(2);
  });
});
