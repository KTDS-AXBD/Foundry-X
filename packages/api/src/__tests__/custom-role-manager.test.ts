import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { CustomRoleManager, BUILTIN_ROLES } from "../core/harness/services/custom-role-manager.js";
import { agentRoute } from "../agent/routes/agent.js";
import { createTestEnv } from "./helpers/test-app.js";

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
  CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_agent_roles(org_id);
  CREATE INDEX IF NOT EXISTS idx_custom_roles_task ON custom_agent_roles(task_type);
  CREATE INDEX IF NOT EXISTS idx_custom_roles_name ON custom_agent_roles(name);
`;

describe("CustomRoleManager", () => {
  let db: D1Database;
  let mgr: CustomRoleManager;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(CUSTOM_ROLES_DDL);
    db = mockDb as unknown as D1Database;
    mgr = new CustomRoleManager(db);
  });

  // 1. createRole creates a custom role
  it("createRole creates a custom role with generated id", async () => {
    const role = await mgr.createRole({
      name: "my-role",
      systemPrompt: "You are a custom agent.",
      allowedTools: ["eslint"],
      taskType: "code-review",
    });

    expect(role.id).toMatch(/^role-/);
    expect(role.name).toBe("my-role");
    expect(role.systemPrompt).toBe("You are a custom agent.");
    expect(role.allowedTools).toEqual(["eslint"]);
    expect(role.isBuiltin).toBe(false);
    expect(role.enabled).toBe(true);
  });

  // 2. createRole with minimal input uses defaults
  it("createRole uses defaults for optional fields", async () => {
    const role = await mgr.createRole({
      name: "minimal",
      systemPrompt: "Minimal agent.",
    });

    expect(role.description).toBe("");
    expect(role.allowedTools).toEqual([]);
    expect(role.preferredModel).toBeNull();
    expect(role.preferredRunnerType).toBe("openrouter");
    expect(role.taskType).toBe("code-review");
    expect(role.orgId).toBe("");
  });

  // 3. createRole with duplicate name fails
  it("createRole throws on duplicate name", async () => {
    await mgr.createRole({ name: "unique-name", systemPrompt: "A" });
    await expect(
      mgr.createRole({ name: "unique-name", systemPrompt: "B" }),
    ).rejects.toThrow();
  });

  // 4. getRole returns builtin role
  it("getRole returns builtin role by id", async () => {
    const role = await mgr.getRole("builtin-reviewer");
    expect(role).not.toBeNull();
    expect(role!.name).toBe("reviewer");
    expect(role!.isBuiltin).toBe(true);
  });

  // 5. getRole returns custom role from D1
  it("getRole returns custom role from D1", async () => {
    const created = await mgr.createRole({
      name: "custom-one",
      systemPrompt: "Custom prompt.",
    });
    const fetched = await mgr.getRole(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe("custom-one");
    expect(fetched!.isBuiltin).toBe(false);
  });

  // 6. getRole returns null for non-existent id
  it("getRole returns null for unknown id", async () => {
    const role = await mgr.getRole("role-nonexistent");
    expect(role).toBeNull();
  });

  // 7. listRoles returns builtins + custom
  it("listRoles returns builtins + custom roles", async () => {
    await mgr.createRole({ name: "extra-role", systemPrompt: "Extra." });
    const roles = await mgr.listRoles();

    expect(roles.length).toBe(BUILTIN_ROLES.length + 1);
    const names = roles.map((r) => r.name);
    expect(names).toContain("reviewer");
    expect(names).toContain("extra-role");
  });

  // 8. listRoles filters by orgId
  it("listRoles filters by orgId", async () => {
    await mgr.createRole({ name: "org-a-role", systemPrompt: "A", orgId: "org-a" });
    await mgr.createRole({ name: "org-b-role", systemPrompt: "B", orgId: "org-b" });

    const roles = await mgr.listRoles("org-a");
    const customNames = roles.filter((r) => !r.isBuiltin).map((r) => r.name);
    expect(customNames).toEqual(["org-a-role"]);
  });

  // 9. listRoles excludes disabled by default
  it("listRoles excludes disabled roles by default", async () => {
    const created = await mgr.createRole({ name: "to-disable", systemPrompt: "D" });
    await mgr.updateRole(created.id, { enabled: false });

    const roles = await mgr.listRoles();
    const names = roles.map((r) => r.name);
    expect(names).not.toContain("to-disable");
  });

  // 10. listRoles includes disabled when flag is set
  it("listRoles includes disabled roles when includeDisabled=true", async () => {
    const created = await mgr.createRole({ name: "disabled-one", systemPrompt: "D" });
    await mgr.updateRole(created.id, { enabled: false });

    const roles = await mgr.listRoles(undefined, true);
    const names = roles.map((r) => r.name);
    expect(names).toContain("disabled-one");
  });

  // 11. updateRole updates fields
  it("updateRole updates specified fields", async () => {
    const created = await mgr.createRole({ name: "updatable", systemPrompt: "Old" });
    const updated = await mgr.updateRole(created.id, {
      name: "updated-name",
      systemPrompt: "New prompt",
      allowedTools: ["prettier"],
    });

    expect(updated.name).toBe("updated-name");
    expect(updated.systemPrompt).toBe("New prompt");
    expect(updated.allowedTools).toEqual(["prettier"]);
  });

  // 12. updateRole throws on builtin
  it("updateRole throws on builtin role", async () => {
    await expect(
      mgr.updateRole("builtin-reviewer", { name: "hacked" }),
    ).rejects.toThrow("Cannot modify builtin role");
  });

  // 13. updateRole throws on non-existent
  it("updateRole throws on non-existent role", async () => {
    await expect(
      mgr.updateRole("role-missing", { name: "nope" }),
    ).rejects.toThrow("Role not found");
  });

  // 14. deleteRole deletes custom role
  it("deleteRole removes custom role", async () => {
    const created = await mgr.createRole({ name: "deletable", systemPrompt: "D" });
    await mgr.deleteRole(created.id);
    const fetched = await mgr.getRole(created.id);
    expect(fetched).toBeNull();
  });

  // 15. deleteRole throws on builtin
  it("deleteRole throws on builtin role", async () => {
    await expect(mgr.deleteRole("builtin-reviewer")).rejects.toThrow(
      "Cannot delete builtin role",
    );
  });

  // 16. deleteRole throws on non-existent
  it("deleteRole throws on non-existent role", async () => {
    await expect(mgr.deleteRole("role-ghost")).rejects.toThrow("Role not found");
  });

  // 17. BUILTIN_ROLES has 7 entries
  it("BUILTIN_ROLES contains 7 entries", () => {
    expect(BUILTIN_ROLES).toHaveLength(7);
    const names = BUILTIN_ROLES.map((r) => r.name);
    expect(names).toEqual(["reviewer", "planner", "architect", "test", "security", "qa", "infra"]);
  });
});

describe("CustomRole API", () => {
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(async () => {
    env = createTestEnv();
    await (env.DB as unknown as { exec: (q: string) => Promise<void> }).exec(CUSTOM_ROLES_DDL);
  });

  // 18. POST /agents/roles creates role (201)
  it("POST /agents/roles creates custom role", async () => {
    const res = await agentRoute.request(
      "/agents/roles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "api-role",
          systemPrompt: "You are a test agent.",
        }),
      },
      env,
    );

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.id).toMatch(/^role-/);
    expect(data.name).toBe("api-role");
    expect(data.isBuiltin).toBe(false);
  });

  // 19. GET /agents/roles returns builtin + custom
  it("GET /agents/roles returns builtin + custom roles", async () => {
    // Create a custom role first
    await agentRoute.request(
      "/agents/roles",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "listed-role", systemPrompt: "Listed." }),
      },
      env,
    );

    const res = await agentRoute.request("/agents/roles", {}, env);
    expect(res.status).toBe(200);
    const data = await res.json() as any[];
    expect(data.length).toBeGreaterThanOrEqual(8); // 7 builtins + 1 custom
  });

  // 20. GET /agents/roles/:id returns 404 for unknown
  it("GET /agents/roles/:id returns 404 for unknown role", async () => {
    const res = await agentRoute.request("/agents/roles/role-unknown", {}, env);
    expect(res.status).toBe(404);
  });

  // 21. PUT /agents/roles/:id returns 403 for builtin
  it("PUT /agents/roles/:id returns 403 for builtin role", async () => {
    const res = await agentRoute.request(
      "/agents/roles/builtin-reviewer",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "hacked" }),
      },
      env,
    );
    expect(res.status).toBe(403);
  });

  // 22. DELETE /agents/roles/:id returns 403 for builtin
  it("DELETE /agents/roles/:id returns 403 for builtin role", async () => {
    const res = await agentRoute.request(
      "/agents/roles/builtin-reviewer",
      { method: "DELETE" },
      env,
    );
    expect(res.status).toBe(403);
  });
});
