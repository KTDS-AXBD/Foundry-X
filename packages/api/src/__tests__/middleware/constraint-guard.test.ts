import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "../helpers/mock-d1.js";
import { constraintGuard } from "../../middleware/constraint-guard.js";
import type { Env } from "../../env.js";

describe("constraintGuard middleware", () => {
  let db: ReturnType<typeof createMockD1>;
  let app: Hono<{ Bindings: Env }>;

  beforeEach(async () => {
    db = createMockD1();

    // Seed constraints
    await db
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-01", "always", "read-specs", "Must read specs", "log")
      .run();
    await db
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-02", "ask", "add-dependency", "Requires approval", "warn")
      .run();
    await db
      .prepare("INSERT INTO agent_constraints (id, tier, action, description, enforcement_mode) VALUES (?, ?, ?, ?, ?)")
      .bind("c-03", "never", "push-to-main", "Forbidden", "block")
      .run();

    app = new Hono<{ Bindings: Env }>();
    app.use("*", constraintGuard);
    app.get("/test", (c) => c.json({ ok: true }));
  });

  const env = () =>
    ({
      DB: db as unknown as D1Database,
      JWT_SECRET: "test",
      GITHUB_TOKEN: "",
      GITHUB_REPO: "",
      CACHE: {} as KVNamespace,
      AI: {} as Ai,
    }) satisfies Env;

  it("passes through when no agent headers", async () => {
    const res = await app.request("/test", {}, env());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it("passes through for 'always' tier actions", async () => {
    const res = await app.request(
      "/test",
      { headers: { "X-Agent-Id": "agent-1", "X-Agent-Action": "read-specs" } },
      env(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Constraint-Tier")).toBe("always");
    expect(res.headers.get("X-Constraint-Allowed")).toBe("true");
  });

  it("returns 403 for 'never' tier with block mode", async () => {
    const res = await app.request(
      "/test",
      { headers: { "X-Agent-Id": "agent-1", "X-Agent-Action": "push-to-main" } },
      env(),
    );
    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Constraint violation");
    expect(data.tier).toBe("never");
  });

  it("sets constraint headers on response", async () => {
    const res = await app.request(
      "/test",
      { headers: { "X-Agent-Id": "agent-1", "X-Agent-Action": "read-specs" } },
      env(),
    );
    expect(res.headers.get("X-Constraint-Tier")).toBe("always");
    expect(res.headers.get("X-Constraint-Allowed")).toBe("true");
  });

  it("passes through for 'ask' tier with warn mode", async () => {
    const res = await app.request(
      "/test",
      { headers: { "X-Agent-Id": "agent-1", "X-Agent-Action": "add-dependency" } },
      env(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Constraint-Tier")).toBe("ask");
    expect(res.headers.get("X-Constraint-Allowed")).toBe("true");
  });
});
