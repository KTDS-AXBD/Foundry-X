import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { mvpTrackingRoute } from "../modules/launch/routes/mvp-tracking.js";
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
  CREATE TABLE IF NOT EXISTS mvp_tracking (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'in_dev'
      CHECK(status IN ('in_dev','testing','released')),
    repo_url TEXT,
    deploy_url TEXT,
    tech_stack TEXT,
    assigned_to TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
  );
  CREATE TABLE IF NOT EXISTS mvp_status_history (
    id TEXT PRIMARY KEY,
    mvp_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (mvp_id) REFERENCES mvp_tracking(id) ON DELETE CASCADE
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
  CREATE INDEX IF NOT EXISTS idx_mvp_tracking_biz_item ON mvp_tracking(biz_item_id);
  CREATE INDEX IF NOT EXISTS idx_mvp_tracking_org ON mvp_tracking(org_id, status);
  CREATE INDEX IF NOT EXISTS idx_mvp_status_history_mvp ON mvp_status_history(mvp_id, created_at DESC);
`;

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", mvpTrackingRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

async function seedBizItem(db: D1Database, id: string = "biz-1") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('${id}', 'org_test', 'Test BizItem', 'test-user')`,
  );
}

async function seedMvp(
  app: ReturnType<typeof createApp>,
  bizItemId: string = "biz-1",
  title: string = "Test MVP",
): Promise<string> {
  const res = await app.request("/api/mvp-tracking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bizItemId, title }),
  });
  const body = (await res.json()) as { id: string };
  return body.id;
}

describe("MVP Tracking Routes (F238)", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/mvp-tracking", () => {
    it("creates MVP with status in_dev (201)", async () => {
      await seedBizItem(db);

      const res = await app.request("/api/mvp-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-1", title: "MVP v1" }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { status: string; title: string; createdBy: string };
      expect(body.status).toBe("in_dev");
      expect(body.title).toBe("MVP v1");
      expect(body.createdBy).toBe("test-user");
    });

    it("creates MVP with optional repo and deploy urls", async () => {
      await seedBizItem(db);

      const res = await app.request("/api/mvp-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bizItemId: "biz-1",
          title: "MVP with URLs",
          repoUrl: "https://github.com/org/repo",
          deployUrl: "https://mvp.example.com",
          techStack: "Next.js, Hono, D1",
        }),
      });
      expect(res.status).toBe(201);
      const body = (await res.json()) as { repoUrl: string; techStack: string };
      expect(body.repoUrl).toBe("https://github.com/org/repo");
      expect(body.techStack).toBe("Next.js, Hono, D1");
    });

    it("returns 400 for missing title", async () => {
      await seedBizItem(db);

      const res = await app.request("/api/mvp-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bizItemId: "biz-1" }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing bizItemId", async () => {
      const res = await app.request("/api/mvp-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "No BizItem" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/mvp-tracking", () => {
    it("returns empty list when no MVPs exist", async () => {
      const res = await app.request("/api/mvp-tracking");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    it("lists created MVPs", async () => {
      await seedBizItem(db);
      await seedMvp(app);

      const res = await app.request("/api/mvp-tracking");
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(body).toHaveLength(1);
    });

    it("filters by status", async () => {
      await seedBizItem(db);
      await seedMvp(app, "biz-1", "In-dev MVP");

      const resInDev = await app.request("/api/mvp-tracking?status=in_dev");
      expect(resInDev.status).toBe(200);
      const bodyInDev = (await resInDev.json()) as unknown[];
      expect(bodyInDev).toHaveLength(1);

      const resTesting = await app.request("/api/mvp-tracking?status=testing");
      expect(resTesting.status).toBe(200);
      const bodyTesting = (await resTesting.json()) as unknown[];
      expect(bodyTesting).toHaveLength(0);
    });
  });

  describe("GET /api/mvp-tracking/:id", () => {
    it("returns MVP detail", async () => {
      await seedBizItem(db);
      const mvpId = await seedMvp(app);

      const res = await app.request(`/api/mvp-tracking/${mvpId}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string; status: string };
      expect(body.id).toBe(mvpId);
      expect(body.status).toBe("in_dev");
    });

    it("returns 404 for unknown MVP", async () => {
      const res = await app.request("/api/mvp-tracking/unknown-id");
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/mvp-tracking/:id/status", () => {
    it("advances in_dev to testing", async () => {
      await seedBizItem(db);
      const mvpId = await seedMvp(app);

      const res = await app.request(`/api/mvp-tracking/${mvpId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "testing", reason: "Ready for QA" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("testing");
    });

    it("advances in_dev to released", async () => {
      await seedBizItem(db);
      const mvpId = await seedMvp(app);

      const res = await app.request(`/api/mvp-tracking/${mvpId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "released" }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe("released");
    });

    it("returns 404 for unknown MVP", async () => {
      const res = await app.request("/api/mvp-tracking/unknown-id/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "testing" }),
      });
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid status value", async () => {
      await seedBizItem(db);
      const mvpId = await seedMvp(app);

      const res = await app.request(`/api/mvp-tracking/${mvpId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/mvp-tracking/:id/history", () => {
    it("returns empty history for new MVP", async () => {
      await seedBizItem(db);
      const mvpId = await seedMvp(app);

      const res = await app.request(`/api/mvp-tracking/${mvpId}/history`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      expect(Array.isArray(body)).toBe(true);
    });

    it("records status change in history", async () => {
      await seedBizItem(db);
      const mvpId = await seedMvp(app);

      await app.request(`/api/mvp-tracking/${mvpId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "testing", reason: "QA ready" }),
      });

      const res = await app.request(`/api/mvp-tracking/${mvpId}/history`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Array<{ toStatus: string; reason: string | null }>;
      // 2 entries: initial (in_dev) + status change (testing), ordered DESC
      expect(body).toHaveLength(2);
      // Find the testing entry (order may vary with same-second timestamps)
      const testingEntry = body.find((e) => e.toStatus === "testing");
      expect(testingEntry).toBeDefined();
      expect(testingEntry!.reason).toBe("QA ready");
    });

    it("accumulates multiple status changes", async () => {
      await seedBizItem(db);
      const mvpId = await seedMvp(app);

      await app.request(`/api/mvp-tracking/${mvpId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "testing" }),
      });
      await app.request(`/api/mvp-tracking/${mvpId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "released" }),
      });

      const res = await app.request(`/api/mvp-tracking/${mvpId}/history`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as unknown[];
      // 3 entries: initial (in_dev) + testing + released
      expect(body).toHaveLength(3);
    });
  });
});
