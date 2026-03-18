import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { app } from "../../app.js";
import { createTestEnv, createAuthHeaders } from "../helpers/test-app.js";
import { createMockD1 } from "../helpers/mock-d1.js";

describe("integration: agent session → GET /agents", () => {
  let env: ReturnType<typeof createTestEnv>;
  let authHeader: Record<string, string>;

  beforeAll(async () => {
    authHeader = await createAuthHeaders({ role: "admin" });
  });

  beforeEach(() => {
    env = createTestEnv();
  });

  it("insert agent_session → GET /agents returns it instead of mocks", async () => {
    const now = new Date().toISOString();
    // Insert an active agent session directly into D1
    await (env.DB as any)
      .prepare(
        "INSERT INTO agent_sessions (id, project_id, agent_name, branch, status, started_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind("sess-int-1", "default", "agent-code-review", "feat/integration", "active", now)
      .run();

    const res = await app.request("/api/agents", { headers: authHeader }, env);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data.length).toBeGreaterThanOrEqual(1);
    // Should contain our session-derived agent, not just mock data
    const found = data.find((a: any) => a.id === "agent-code-review");
    expect(found).toBeDefined();
    expect(found.activity.status).toBe("running");
  });

  it("GET /agents/stream returns SSE with active session data", async () => {
    const now = new Date().toISOString();
    await (env.DB as any)
      .prepare(
        "INSERT INTO agent_sessions (id, project_id, agent_name, branch, status, started_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .bind("sess-int-2", "default", "agent-test-writer", "feat/sse-test", "active", now)
      .run();

    const res = await app.request("/api/agents/stream", { headers: authHeader }, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const reader = res.body!.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    expect(text).toContain("agent-test-writer");
    reader.cancel();
  });

  it("constraint check endpoint works end-to-end", async () => {
    // Seed constraints via migration SQL
    await (env.DB as any)
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-int-01", "never", "push-to-main", "Forbidden", "block")
      .run();

    const res = await app.request(
      "/api/agents/constraints/check",
      {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "agent-1", action: "push-to-main" }),
      },
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.allowed).toBe(false);
    expect(data.tier).toBe("never");
  });
});
