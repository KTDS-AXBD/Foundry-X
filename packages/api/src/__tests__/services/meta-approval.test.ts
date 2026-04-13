// F530 Meta Layer (L4) — Human Approval API TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "../helpers/mock-d1.js";
import { metaRoute } from "../../core/agent/routes/meta.js";
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../../env.js";

const DDL = `
CREATE TABLE IF NOT EXISTS agent_improvement_proposals (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL,
  agent_id         TEXT NOT NULL,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  reasoning        TEXT NOT NULL,
  yaml_diff        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", metaRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedProposal(db: D1Database, id: string, status = "pending") {
  await db.prepare(
    `INSERT INTO agent_improvement_proposals
     (id, session_id, agent_id, type, title, reasoning, yaml_diff, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, "sess-test", "agent-test", "prompt",
    "Add tool priority guide", "ToolEffectiveness score is low",
    "+ systemPrompt: Tool Priority: prefer search", status,
  ).run();
}

describe("F530 Human Approval API (metaRoute)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  it("GET /api/meta/proposals — 목록을 반환한다", async () => {
    await seedProposal(db, "p1", "pending");
    await seedProposal(db, "p2", "approved");

    const res = await app.request("/api/meta/proposals");
    expect(res.status).toBe(200);
    const body = await res.json() as { proposals: unknown[] };
    expect(body.proposals.length).toBe(2);
  });

  it("GET /api/meta/proposals?status=pending — 상태 필터가 동작한다", async () => {
    await seedProposal(db, "p1", "pending");
    await seedProposal(db, "p2", "approved");
    await seedProposal(db, "p3", "pending");

    const res = await app.request("/api/meta/proposals?status=pending");
    expect(res.status).toBe(200);
    const body = await res.json() as { proposals: { status: string }[] };
    expect(body.proposals.length).toBe(2);
    expect(body.proposals.every((p) => p.status === "pending")).toBe(true);
  });

  it("POST /api/meta/proposals/:id/approve — status가 approved로 변경된다", async () => {
    await seedProposal(db, "p1", "pending");

    const res = await app.request("/api/meta/proposals/p1/approve", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json() as { proposal: { status: string } };
    expect(body.proposal.status).toBe("approved");
  });

  it("POST /api/meta/proposals/:id/reject — status가 rejected, rejectionReason이 저장된다", async () => {
    await seedProposal(db, "p2", "pending");

    const res = await app.request("/api/meta/proposals/p2/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cost 개선이 더 시급함" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { proposal: { status: string; rejectionReason: string } };
    expect(body.proposal.status).toBe("rejected");
    expect(body.proposal.rejectionReason).toBe("Cost 개선이 더 시급함");
  });

  it("존재하지 않는 ID approve → 404 반환", async () => {
    const res = await app.request("/api/meta/proposals/nonexistent/approve", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("존재하지 않는 ID reject → 404 반환", async () => {
    const res = await app.request("/api/meta/proposals/ghost/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "test" }),
    });
    expect(res.status).toBe(404);
  });
});
