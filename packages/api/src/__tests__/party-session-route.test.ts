import { describe, it, expect, beforeEach } from "vitest";
import { OpenAPIHono } from "@hono/zod-openapi";
import { createMockD1 } from "./helpers/mock-d1.js";
import { partySessionRoute } from "../routes/party-session.js";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS party_sessions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'free-form' CHECK(mode IN ('free-form', 'round-robin', 'moderated')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'concluded', 'cancelled')),
    max_participants INTEGER NOT NULL DEFAULT 10,
    created_by TEXT NOT NULL,
    summary TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    concluded_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_party_sessions_org ON party_sessions(org_id, status);

  CREATE TABLE IF NOT EXISTS party_participants (
    session_id TEXT NOT NULL,
    agent_role TEXT NOT NULL,
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (session_id, agent_role),
    FOREIGN KEY (session_id) REFERENCES party_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS party_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_role TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'opinion' CHECK(message_type IN ('opinion', 'question', 'answer', 'summary')),
    reply_to TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES party_sessions(id)
  );
  CREATE INDEX IF NOT EXISTS idx_party_messages_session ON party_messages(session_id, created_at);
`;

function createApp(db: D1Database) {
  const app = new OpenAPIHono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("userId" as never, "test-user");
    await next();
  });
  app.route("/api", partySessionRoute);

  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("Party Session Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  it("POST /api/party-sessions: creates session", async () => {
    const res = await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Architecture review" }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.id).toMatch(/^party-/);
    expect(data.topic).toBe("Architecture review");
    expect(data.mode).toBe("free-form");
    expect(data.status).toBe("active");
  });

  it("GET /api/party-sessions: lists sessions", async () => {
    await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Session 1" }),
    });

    const res = await app.request("/api/party-sessions");
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
    expect(data[0].topic).toBe("Session 1");
  });

  it("GET /api/party-sessions/:id: returns session", async () => {
    const createRes = await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Test" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/party-sessions/${id}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.id).toBe(id);
  });

  it("GET /api/party-sessions/:id: 404 for unknown", async () => {
    const res = await app.request("/api/party-sessions/nonexistent");
    expect(res.status).toBe(404);
  });

  it("POST /api/party-sessions/:id/join: adds participant", async () => {
    const createRes = await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Test" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/party-sessions/${id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentRole: "reviewer" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.agentRole).toBe("reviewer");
  });

  it("POST /api/party-sessions/:id/messages: adds message", async () => {
    const createRes = await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Test" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/party-sessions/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentRole: "dev", content: "Hello world" }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.content).toBe("Hello world");
    expect(data.messageType).toBe("opinion");
  });

  it("GET /api/party-sessions/:id/messages: lists messages", async () => {
    const createRes = await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Test" }),
    });
    const { id } = (await createRes.json()) as any;

    await app.request(`/api/party-sessions/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentRole: "dev", content: "Message 1" }),
    });

    const res = await app.request(`/api/party-sessions/${id}/messages`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
  });

  it("PATCH /api/party-sessions/:id/conclude: concludes session", async () => {
    const createRes = await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Test" }),
    });
    const { id } = (await createRes.json()) as any;

    const res = await app.request(`/api/party-sessions/${id}/conclude`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: "Decided on approach A" }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe("concluded");
    expect(data.summary).toBe("Decided on approach A");
  });

  it("GET /api/party-sessions/:id/participants: lists participants", async () => {
    const createRes = await app.request("/api/party-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Test" }),
    });
    const { id } = (await createRes.json()) as any;

    await app.request(`/api/party-sessions/${id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentRole: "dev" }),
    });

    const res = await app.request(`/api/party-sessions/${id}/participants`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any[];
    expect(data).toHaveLength(1);
    expect(data[0].agentRole).toBe("dev");
  });
});
