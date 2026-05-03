import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import {
  parseSimpleYaml,
  parseAgentDefinition,
  exportToYaml,
} from "../agent/services/agent-definition-loader.js";
import { CustomRoleManager } from "../core/harness/services/custom-role-manager.js";

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

describe("parseSimpleYaml", () => {
  it("parses scalar values", () => {
    const result = parseSimpleYaml("name: reviewer\ntask_type: code-review\n");
    expect(result.name).toBe("reviewer");
    expect(result.task_type).toBe("code-review");
  });

  it("parses multi-line string with |", () => {
    const yaml = `persona: |
  You are a senior reviewer.
  Focus on security.
name: test`;
    const result = parseSimpleYaml(yaml);
    expect(result.persona).toBe("You are a senior reviewer.\nFocus on security.");
    expect(result.name).toBe("test");
  });

  it("parses array items", () => {
    const yaml = `allowed_tools:
  - eslint
  - prettier
  - ast-grep`;
    const result = parseSimpleYaml(yaml);
    expect(result.allowed_tools).toEqual(["eslint", "prettier", "ast-grep"]);
  });

  it("parses inline array", () => {
    const result = parseSimpleYaml("tools: [eslint, prettier]");
    expect(result.tools).toEqual(["eslint", "prettier"]);
  });

  it("parses null and boolean scalars", () => {
    const result = parseSimpleYaml("model: null\nenabled: true\ncount: 42");
    expect(result.model).toBeNull();
    expect(result.enabled).toBe(true);
    expect(result.count).toBe(42);
  });

  it("parses array of objects", () => {
    const yaml = `menu:
  - action: review-pr
    label: PR Review
  - action: scan
    label: Security Scan`;
    const result = parseSimpleYaml(yaml);
    expect(result.menu).toEqual([
      { action: "review-pr", label: "PR Review" },
      { action: "scan", label: "Security Scan" },
    ]);
  });

  it("ignores comments", () => {
    const yaml = `# This is a comment
name: test
# Another comment
task_type: review`;
    const result = parseSimpleYaml(yaml);
    expect(result.name).toBe("test");
    expect(result.task_type).toBe("review");
  });

  it("parses quoted strings", () => {
    const result = parseSimpleYaml('name: "my agent"\ndesc: \'hello\'');
    expect(result.name).toBe("my agent");
    expect(result.desc).toBe("hello");
  });
});

describe("parseAgentDefinition", () => {
  it("parses valid YAML agent definition", () => {
    const yaml = `name: reviewer
system_prompt: You are a code reviewer.
task_type: code-review
allowed_tools:
  - eslint
  - prettier
persona: |
  Senior code reviewer focused on security.
dependencies:
  - eslint
  - prettier`;

    const def = parseAgentDefinition(yaml, "yaml");
    expect(def.name).toBe("reviewer");
    expect(def.systemPrompt).toBe("You are a code reviewer.");
    expect(def.taskType).toBe("code-review");
    expect(def.allowedTools).toEqual(["eslint", "prettier"]);
    expect(def.persona).toBe("Senior code reviewer focused on security.");
    expect(def.dependencies).toEqual(["eslint", "prettier"]);
  });

  it("parses valid JSON agent definition", () => {
    const json = JSON.stringify({
      name: "tester",
      systemPrompt: "You are a test agent.",
      dependencies: ["vitest"],
      menu: [{ action: "run-tests", label: "Run Tests" }],
    });

    const def = parseAgentDefinition(json, "json");
    expect(def.name).toBe("tester");
    expect(def.dependencies).toEqual(["vitest"]);
    expect(def.menu).toEqual([{ action: "run-tests", label: "Run Tests" }]);
  });

  it("throws on missing required field (name)", () => {
    const yaml = "system_prompt: hello";
    expect(() => parseAgentDefinition(yaml, "yaml")).toThrow();
  });

  it("throws on missing required field (systemPrompt)", () => {
    const yaml = "name: test";
    expect(() => parseAgentDefinition(yaml, "yaml")).toThrow();
  });

  it("normalizes snake_case to camelCase", () => {
    const yaml = `name: test
system_prompt: hello
allowed_tools:
  - eslint
preferred_model: null
preferred_runner_type: claude-api
task_type: review`;

    const def = parseAgentDefinition(yaml, "yaml");
    expect(def.systemPrompt).toBe("hello");
    expect(def.allowedTools).toEqual(["eslint"]);
    expect(def.preferredModel).toBeNull();
    expect(def.preferredRunnerType).toBe("claude-api");
    expect(def.taskType).toBe("review");
  });
});

describe("exportToYaml", () => {
  it("exports basic definition", () => {
    const yaml = exportToYaml({
      name: "reviewer",
      systemPrompt: "Review code changes.",
      allowedTools: ["eslint"],
      taskType: "code-review",
    });

    expect(yaml).toContain("name: reviewer");
    expect(yaml).toContain('system_prompt: "Review code changes."');
    expect(yaml).toContain("  - eslint");
    expect(yaml).toContain("task_type: code-review");
  });

  it("exports persona as multi-line block", () => {
    const yaml = exportToYaml({
      name: "test",
      systemPrompt: "Test.",
      persona: "Line 1\nLine 2",
    });

    expect(yaml).toContain("persona: |");
    expect(yaml).toContain("  Line 1");
    expect(yaml).toContain("  Line 2");
  });

  it("exports menu items", () => {
    const yaml = exportToYaml({
      name: "test",
      systemPrompt: "Test.",
      menu: [
        { action: "run", label: "Run Tests", description: "Execute test suite" },
      ],
    });

    expect(yaml).toContain("menu:");
    expect(yaml).toContain("  - action: run");
    expect(yaml).toContain('    label: "Run Tests"');
    expect(yaml).toContain('    description: "Execute test suite"');
  });
});

describe("CustomRoleManager import/export", () => {
  let db: D1Database;
  let mgr: CustomRoleManager;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(CUSTOM_ROLES_DDL);
    db = mockDb as unknown as D1Database;
    mgr = new CustomRoleManager(db);
  });

  it("importFromDefinition creates role from YAML", async () => {
    const yaml = `name: yaml-agent
system_prompt: YAML imported agent.
persona: |
  I am a YAML agent.
dependencies:
  - tool-a
  - tool-b
menu:
  - action: do-thing
    label: Do Thing`;

    const role = await mgr.importFromDefinition(yaml, "yaml", "org-1");
    expect(role.id).toMatch(/^role-/);
    expect(role.name).toBe("yaml-agent");
    expect(role.systemPrompt).toBe("YAML imported agent.");
    expect(role.persona).toBe("I am a YAML agent.");
    expect(role.dependencies).toEqual(["tool-a", "tool-b"]);
    expect(role.menuConfig).toEqual([{ action: "do-thing", label: "Do Thing" }]);
    expect(role.orgId).toBe("org-1");
  });

  it("importFromDefinition creates role from JSON", async () => {
    const json = JSON.stringify({
      name: "json-agent",
      systemPrompt: "JSON agent.",
      dependencies: ["dep-1"],
    });

    const role = await mgr.importFromDefinition(json, "json");
    expect(role.name).toBe("json-agent");
    expect(role.dependencies).toEqual(["dep-1"]);
  });

  it("exportAsYaml returns valid YAML string", async () => {
    const role = await mgr.createRole({
      name: "export-test",
      systemPrompt: "Test agent.",
      persona: "A test persona.",
      dependencies: ["tool-x"],
      menuConfig: [{ action: "test", label: "Test" }],
    });

    const yaml = await mgr.exportAsYaml(role.id);
    expect(yaml).toContain("name: export-test");
    expect(yaml).toContain("persona: |");
    expect(yaml).toContain("  - tool-x");
    expect(yaml).toContain("  - action: test");
  });

  it("exportAsJson returns valid JSON string", async () => {
    const role = await mgr.createRole({
      name: "json-export",
      systemPrompt: "Test.",
    });

    const jsonStr = await mgr.exportAsJson(role.id);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.name).toBe("json-export");
    expect(parsed.systemPrompt).toBe("Test.");
  });

  it("round-trip: YAML import → export → re-import preserves data", async () => {
    const originalYaml = `name: roundtrip
system_prompt: Round-trip test agent.
persona: |
  I test round-trips.
dependencies:
  - dep-a
  - dep-b`;

    const role1 = await mgr.importFromDefinition(originalYaml, "yaml");
    const exportedYaml = await mgr.exportAsYaml(role1.id);

    // Delete first role to avoid unique constraint
    await mgr.deleteRole(role1.id);

    const role2 = await mgr.importFromDefinition(exportedYaml, "yaml");
    expect(role2.name).toBe("roundtrip");
    expect(role2.systemPrompt).toBe("Round-trip test agent.");
    expect(role2.persona).toBe("I test round-trips.");
    expect(role2.dependencies).toEqual(["dep-a", "dep-b"]);
  });

  it("exportAsYaml throws for non-existent role", async () => {
    await expect(mgr.exportAsYaml("nonexistent")).rejects.toThrow("Role not found");
  });

  it("createRole with new F221 fields persists correctly", async () => {
    const role = await mgr.createRole({
      name: "full-f221",
      systemPrompt: "Full F221 agent.",
      persona: "I have all F221 fields.",
      dependencies: ["a", "b"],
      customizationSchema: { severity: { type: "string", default: "warning" } },
      menuConfig: [{ action: "act", label: "Act" }],
    });

    const fetched = await mgr.getRole(role.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.persona).toBe("I have all F221 fields.");
    expect(fetched!.dependencies).toEqual(["a", "b"]);
    expect(fetched!.customizationSchema).toEqual({ severity: { type: "string", default: "warning" } });
    expect(fetched!.menuConfig).toEqual([{ action: "act", label: "Act" }]);
  });
});
