import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { shardDocRoute } from "../routes/shard-doc.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../env.js";

const SHARDS_DDL = `
  CREATE TABLE IF NOT EXISTS document_shards (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    document_title TEXT NOT NULL DEFAULT '',
    section_index INTEGER NOT NULL,
    heading TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT NOT NULL DEFAULT '[]',
    agent_roles TEXT NOT NULL DEFAULT '[]',
    token_count INTEGER NOT NULL DEFAULT 0,
    org_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_shards_doc ON document_shards(document_id);
  CREATE INDEX IF NOT EXISTS idx_shards_org ON document_shards(org_id);
`;

function createApp(db: D1Database) {
  const app = new OpenAPIHono<{ Bindings: Env }>();
  app.route("/api", shardDocRoute);

  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("Shard Doc Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(SHARDS_DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/shard-doc", () => {
    it("shards a markdown document", async () => {
      const res = await app.request("/api/shard-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: "test-doc",
          title: "Test Document",
          content: "## Security\n\nOWASP vulnerability scanning.\n\n## Testing\n\nUnit test coverage.",
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.count).toBe(2);
      expect(body.shards[0].heading).toBe("Security");
      expect(body.shards[1].heading).toBe("Testing");
    });

    it("returns 400 for empty content", async () => {
      const res = await app.request("/api/shard-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: "empty",
          content: "",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/shard-doc/:documentId", () => {
    it("lists shards for a document", async () => {
      await app.request("/api/shard-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: "list-doc",
          content: "## A\n\nContent A.\n\n## B\n\nContent B.",
        }),
      });

      const res = await app.request("/api/shard-doc/list-doc");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.shards).toHaveLength(2);
    });

    it("returns empty array for non-existent document", async () => {
      const res = await app.request("/api/shard-doc/nonexistent");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.shards).toHaveLength(0);
    });
  });

  describe("GET /api/shard-doc/agent/:agentRole", () => {
    it("returns shards matching agent role", async () => {
      await app.request("/api/shard-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: "role-doc",
          content: "## Code Review\n\nLint and review PR changes.\n\n## Deployment\n\nDeploy to workers infrastructure.",
        }),
      });

      const res = await app.request("/api/shard-doc/agent/reviewer");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.role).toBe("reviewer");
      expect(body.shards.length).toBeGreaterThanOrEqual(1);
    });

    it("filters by documentId query param", async () => {
      await app.request("/api/shard-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "doc-x", content: "## Testing\n\nUnit test." }),
      });
      await app.request("/api/shard-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "doc-y", content: "## Testing\n\nMore test." }),
      });

      const res = await app.request("/api/shard-doc/agent/test?documentId=doc-x");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.shards.every((s: { documentId: string }) => s.documentId === "doc-x")).toBe(true);
    });
  });

  describe("DELETE /api/shard-doc/:documentId", () => {
    it("deletes all shards for a document", async () => {
      await app.request("/api/shard-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: "del-doc", content: "## X\n\nContent." }),
      });

      const delRes = await app.request("/api/shard-doc/del-doc", { method: "DELETE" });
      expect(delRes.status).toBe(200);
      const body = (await delRes.json()) as any;
      expect(body.deleted).toBe(true);

      const listRes = await app.request("/api/shard-doc/del-doc");
      const listBody = (await listRes.json()) as any;
      expect(listBody.shards).toHaveLength(0);
    });
  });
});
