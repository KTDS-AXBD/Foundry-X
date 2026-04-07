import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { irProposalsRoute } from "../core/discovery/routes/ir-proposals.js";
import { Hono } from "hono";
import type { Env } from "../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'REGISTERED',
    entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT,
    entered_by TEXT NOT NULL,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS ir_proposals (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL
      CHECK(category IN ('technology','market','process','partnership','other')),
    rationale TEXT,
    expected_impact TEXT,
    status TEXT NOT NULL DEFAULT 'submitted'
      CHECK(status IN ('submitted','under_review','approved','rejected')),
    submitted_by TEXT NOT NULL,
    reviewed_by TEXT,
    review_comment TEXT,
    biz_item_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    type TEXT NOT NULL,
    biz_item_id TEXT,
    title TEXT NOT NULL,
    body TEXT,
    actor_id TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_ir_proposals_org ON ir_proposals(org_id, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_ir_proposals_submitter ON ir_proposals(submitted_by, created_at DESC);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", irProposalsRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

const validProposal = {
  title: "AI-powered customer service",
  description: "Implement an AI chatbot to reduce customer service costs by 40%.",
  category: "technology" as const,
  rationale: "Growing customer service costs",
  expectedImpact: "40% cost reduction within 6 months",
};

async function seedProposal(app: ReturnType<typeof createApp>): Promise<string> {
  const res = await app.request("/api/ir-proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validProposal),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

describe("IR Proposals Routes (F240)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/ir-proposals", () => {
    it("submits proposal with status submitted (201)", async () => {
      const res = await app.request("/api/ir-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validProposal),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        status: string;
        title: string;
        category: string;
        submittedBy: string;
      };
      expect(body.status).toBe("submitted");
      expect(body.title).toBe(validProposal.title);
      expect(body.category).toBe("technology");
      expect(body.submittedBy).toBe("test-user");
    });

    it("submits proposal with market category", async () => {
      const res = await app.request("/api/ir-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validProposal, category: "market" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { category: string };
      expect(body.category).toBe("market");
    });

    it("returns 400 for description shorter than 10 characters", async () => {
      const res = await app.request("/api/ir-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validProposal, description: "Too short" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing title", async () => {
      const { title: _, ...noTitle } = validProposal;
      const res = await app.request("/api/ir-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noTitle),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid category", async () => {
      const res = await app.request("/api/ir-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validProposal, category: "unknown_category" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/ir-proposals", () => {
    it("returns empty list when no proposals exist", async () => {
      const res = await app.request("/api/ir-proposals");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    it("lists submitted proposals", async () => {
      await seedProposal(app);

      const res = await app.request("/api/ir-proposals");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });

    it("filters by status", async () => {
      await seedProposal(app);

      const resSubmitted = await app.request("/api/ir-proposals?status=submitted");
      expect(resSubmitted.status).toBe(200);
      const bodySubmitted = (await resSubmitted.json()) as unknown[];
      expect(bodySubmitted).toHaveLength(1);

      const resApproved = await app.request("/api/ir-proposals?status=approved");
      expect(resApproved.status).toBe(200);
      const bodyApproved = (await resApproved.json()) as unknown[];
      expect(bodyApproved).toHaveLength(0);
    });

    it("filters by category", async () => {
      await seedProposal(app);
      await app.request("/api/ir-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validProposal, category: "market" }),
      });

      const resTech = await app.request("/api/ir-proposals?category=technology");
      expect(resTech.status).toBe(200);
      const bodyTech = (await resTech.json()) as unknown[];
      expect(bodyTech).toHaveLength(1);

      const resAll = await app.request("/api/ir-proposals");
      const bodyAll = (await resAll.json()) as unknown[];
      expect(bodyAll).toHaveLength(2);
    });
  });

  describe("GET /api/ir-proposals/:id", () => {
    it("returns proposal detail", async () => {
      const id = await seedProposal(app);

      const res = await app.request(`/api/ir-proposals/${id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; title: string };
      expect(body.id).toBe(id);
      expect(body.title).toBe(validProposal.title);
    });

    it("returns 404 for unknown proposal", async () => {
      const res = await app.request("/api/ir-proposals/unknown-id");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/ir-proposals/:id/approve", () => {
    it("approves proposal and creates biz-item", async () => {
      const id = await seedProposal(app);

      const res = await app.request(`/api/ir-proposals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "Great idea, let's move forward." }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        proposal: { status: string; reviewedBy: string };
        bizItemId: string;
      };
      expect(body.proposal.status).toBe("approved");
      expect(body.proposal.reviewedBy).toBe("test-user");
      expect(body.bizItemId).toBeTruthy();
    });

    it("approves proposal without comment", async () => {
      const id = await seedProposal(app);

      const res = await app.request(`/api/ir-proposals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { proposal: { status: string }; bizItemId: string };
      expect(body.proposal.status).toBe("approved");
      expect(body.bizItemId).toBeTruthy();
    });

    it("returns 404 for unknown proposal", async () => {
      const res = await app.request("/api/ir-proposals/unknown-id/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });

    it("creates biz_item record on approval", async () => {
      const id = await seedProposal(app);

      const approveRes = await app.request(`/api/ir-proposals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "Approved" }),
      });
      const approveBody = (await approveRes.json()) as { bizItemId: string };

      const bizItem = await (
        db as unknown as {
          prepare: (q: string) => {
            bind: (...v: unknown[]) => { first: <T>() => Promise<T | null> };
          };
        }
      )
        .prepare(`SELECT id, title FROM biz_items WHERE id = ?`)
        .bind(approveBody.bizItemId)
        .first<{ id: string; title: string }>();

      expect(bizItem).not.toBeNull();
      expect(bizItem?.id).toBe(approveBody.bizItemId);
    });
  });

  describe("POST /api/ir-proposals/:id/reject", () => {
    it("rejects proposal with comment", async () => {
      const id = await seedProposal(app);

      const res = await app.request(`/api/ir-proposals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "Not aligned with current strategy." }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string; reviewComment: string; reviewedBy: string };
      expect(body.status).toBe("rejected");
      expect(body.reviewComment).toBe("Not aligned with current strategy.");
      expect(body.reviewedBy).toBe("test-user");
    });

    it("rejects proposal without comment", async () => {
      const id = await seedProposal(app);

      const res = await app.request(`/api/ir-proposals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("rejected");
    });

    it("returns 404 for unknown proposal", async () => {
      const res = await app.request("/api/ir-proposals/unknown-id/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });
  });
});
