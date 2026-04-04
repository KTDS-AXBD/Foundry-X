import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

const TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

describe("POST /api/skills/metrics/record (F305)", () => {
  let env: ReturnType<typeof createTestEnv>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    (env.DB as any).exec(TABLES);
    headers = await createAuthHeaders();
  });

  it("records execution and returns 201 with id", async () => {
    const res = await app.request(
      "/api/skills/metrics/record",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "ax-session-start",
          status: "completed",
          durationMs: 5000,
          model: "claude-sonnet-4-20250514",
          inputTokens: 1000,
          outputTokens: 2000,
          costUsd: 0.015,
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe("string");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await app.request(
      "/api/skills/metrics/record",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "test" }),
      },
      env,
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Invalid input");
  });

  it("returns 401 without auth", async () => {
    const res = await app.request(
      "/api/skills/metrics/record",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "test",
          status: "completed",
          durationMs: 100,
        }),
      },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status enum", async () => {
    const res = await app.request(
      "/api/skills/metrics/record",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "test",
          status: "invalid-status",
          durationMs: 100,
        }),
      },
      env,
    );
    expect(res.status).toBe(400);
  });

  it("accepts durationMs = 0", async () => {
    const res = await app.request(
      "/api/skills/metrics/record",
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: "ax-daily-check",
          status: "completed",
          durationMs: 0,
        }),
      },
      env,
    );
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.id).toBeDefined();
  });
});
