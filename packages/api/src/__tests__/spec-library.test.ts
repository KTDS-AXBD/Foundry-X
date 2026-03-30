import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { SpecLibraryService } from "../services/spec-library.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS spec_library (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK(category IN ('feature', 'api', 'component', 'integration', 'other')),
    tags TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'active', 'deprecated')),
    author TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_spec_library_org ON spec_library(org_id, category, status);
  CREATE INDEX IF NOT EXISTS idx_spec_library_search ON spec_library(org_id, title);
`;

describe("SpecLibraryService", () => {
  let db: D1Database;
  let svc: SpecLibraryService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    svc = new SpecLibraryService(db);
  });

  it("create: returns spec with defaults", async () => {
    const spec = await svc.create("org_test", "user1", { title: "Auth Spec", content: "JWT flow" });
    expect(spec.id).toMatch(/^spec-/);
    expect(spec.orgId).toBe("org_test");
    expect(spec.title).toBe("Auth Spec");
    expect(spec.category).toBe("other");
    expect(spec.tags).toEqual([]);
    expect(spec.content).toBe("JWT flow");
    expect(spec.version).toBe("1.0.0");
    expect(spec.status).toBe("draft");
    expect(spec.author).toBe("user1");
  });

  it("create: respects custom fields", async () => {
    const spec = await svc.create("org_test", "user1", {
      title: "API Gateway",
      category: "api",
      tags: ["gateway", "proxy"],
      content: "Proxy configuration",
      version: "2.0.0",
      status: "active",
    });
    expect(spec.category).toBe("api");
    expect(spec.tags).toEqual(["gateway", "proxy"]);
    expect(spec.version).toBe("2.0.0");
    expect(spec.status).toBe("active");
  });

  it("getById: returns spec or null", async () => {
    const created = await svc.create("org_test", "user1", { title: "Test", content: "Body" });
    const spec = await svc.getById(created.id);
    expect(spec).not.toBeNull();
    expect(spec!.title).toBe("Test");

    const missing = await svc.getById("nonexistent");
    expect(missing).toBeNull();
  });

  it("list: returns all specs for org", async () => {
    await svc.create("org_test", "user1", { title: "Spec A", content: "A" });
    await svc.create("org_test", "user1", { title: "Spec B", content: "B" });
    await svc.create("org_other", "user2", { title: "Spec C", content: "C" });

    const specs = await svc.list("org_test");
    expect(specs).toHaveLength(2);
  });

  it("list: filters by category", async () => {
    await svc.create("org_test", "user1", { title: "Feature", content: "F", category: "feature" });
    await svc.create("org_test", "user1", { title: "API", content: "A", category: "api" });

    const filtered = await svc.list("org_test", { category: "feature" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.title).toBe("Feature");
  });

  it("list: filters by tag using LIKE", async () => {
    await svc.create("org_test", "user1", { title: "Tagged", content: "T", tags: ["auth", "jwt"] });
    await svc.create("org_test", "user1", { title: "No tag", content: "N", tags: [] });

    const filtered = await svc.list("org_test", { tag: "auth" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.title).toBe("Tagged");
  });

  it("list: filters by status", async () => {
    await svc.create("org_test", "user1", { title: "Draft", content: "D" });
    await svc.create("org_test", "user1", { title: "Active", content: "A", status: "active" });

    const filtered = await svc.list("org_test", { status: "active" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.title).toBe("Active");
  });

  it("update: updates partial fields", async () => {
    const spec = await svc.create("org_test", "user1", { title: "Original", content: "Body" });
    const updated = await svc.update(spec.id, { title: "Updated Title", tags: ["new"] });

    expect(updated!.title).toBe("Updated Title");
    expect(updated!.tags).toEqual(["new"]);
    expect(updated!.content).toBe("Body"); // unchanged
  });

  it("remove: deletes spec", async () => {
    const spec = await svc.create("org_test", "user1", { title: "To delete", content: "Body" });
    await svc.remove(spec.id);

    const result = await svc.getById(spec.id);
    expect(result).toBeNull();
  });

  it("search: finds by title or content", async () => {
    await svc.create("org_test", "user1", { title: "Auth Flow", content: "JWT tokens" });
    await svc.create("org_test", "user1", { title: "Database", content: "SQLite auth" });
    await svc.create("org_test", "user1", { title: "UI", content: "React components" });

    const results = await svc.search("org_test", "auth");
    expect(results).toHaveLength(2);
  });

  it("listCategories: returns distinct categories", async () => {
    await svc.create("org_test", "user1", { title: "A", content: "A", category: "feature" });
    await svc.create("org_test", "user1", { title: "B", content: "B", category: "api" });
    await svc.create("org_test", "user1", { title: "C", content: "C", category: "feature" });

    const categories = await svc.listCategories("org_test");
    expect(categories.sort()).toEqual(["api", "feature"]);
  });
});
