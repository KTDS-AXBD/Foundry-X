import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { createTestEnv } from "./helpers/test-app.js";
import { agentDefinitionRoute } from "../src/routes/agent-definition.js";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "../src/env.js";

const CUSTOM_ROLES_DDL = `
  CREATE TABLE IF NOT EXISTS custom_agent_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    system_prompt TEXT NOT NULL DEFAULT '',
    allowed_tools TEXT NOT NULL DEFAULT '[]',
    preferred_model TEXT,
    preferred_runner_type TEXT DEFAULT 'openrouter',
    task_type TEXT NOT NULL DEFAULT 'code-review',
    org_id TEXT NOT NULL DEFAULT '',
    is_builtin INTEGER NOT NULL DEFAULT 0,
    enabled INTEGER NOT NULL DEFAULT 1,
    persona TEXT NOT NULL DEFAULT '',
    dependencies TEXT NOT NULL DEFAULT '[]',
    customization_schema TEXT NOT NULL DEFAULT '{}',
    menu_config TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function createApp(db: D1Database) {
  const app = new OpenAPIHono<{ Bindings: Env }>();
  app.route("/api", agentDefinitionRoute);

  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, { DB: db } as unknown as Env),
  };
}

describe("Agent Definition Routes", () => {
  let db: D1Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(CUSTOM_ROLES_DDL);
    db = mockDb as unknown as D1Database;
    app = createApp(db);
  });

  describe("POST /api/agent-definitions/import", () => {
    it("imports YAML definition", async () => {
      const res = await app.request("/api/agent-definitions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "name: yaml-test\nsystem_prompt: Test agent.",
          format: "yaml",
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.name).toBe("yaml-test");
      expect(body.systemPrompt).toBe("Test agent.");
    });

    it("imports JSON definition", async () => {
      const res = await app.request("/api/agent-definitions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify({ name: "json-test", systemPrompt: "JSON agent." }),
          format: "json",
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.name).toBe("json-test");
    });

    it("returns 400 for invalid definition", async () => {
      const res = await app.request("/api/agent-definitions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "invalid: yaml\nno_name: here",
          format: "yaml",
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/agent-definitions/:roleId/export", () => {
    it("exports as YAML by default", async () => {
      // First import
      const importRes = await app.request("/api/agent-definitions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "name: export-yaml\nsystem_prompt: Exportable.",
          format: "yaml",
        }),
      });
      const { id } = (await importRes.json()) as { id: string };

      const res = await app.request(`/api/agent-definitions/${id}/export`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("name: export-yaml");
    });

    it("exports as JSON when format=json", async () => {
      const importRes = await app.request("/api/agent-definitions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: JSON.stringify({ name: "export-json", systemPrompt: "JSON." }),
          format: "json",
        }),
      });
      const { id } = (await importRes.json()) as { id: string };

      const res = await app.request(`/api/agent-definitions/${id}/export?format=json`);
      expect(res.status).toBe(200);
      const text = await res.text();
      const parsed = JSON.parse(text);
      expect(parsed.name).toBe("export-json");
    });

    it("returns 404 for non-existent role", async () => {
      const res = await app.request("/api/agent-definitions/nonexistent/export");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/agent-definitions/schema", () => {
    it("returns schema info", async () => {
      const res = await app.request("/api/agent-definitions/schema");
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.schema.fields.name.required).toBe(true);
      expect(body.schema.fields.persona.required).toBe(false);
    });
  });
});
