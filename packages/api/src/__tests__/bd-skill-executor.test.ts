import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BdSkillExecutor } from "../core/shaping/services/bd-skill-executor.js";

const TABLES = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS biz_items (id TEXT PRIMARY KEY, org_id TEXT, title TEXT, description TEXT, source TEXT, status TEXT, created_by TEXT, created_at TEXT, updated_at TEXT);
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL,
    output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
  CREATE TABLE IF NOT EXISTS prompt_sanitization_rules (
    id TEXT PRIMARY KEY,
    pattern TEXT NOT NULL,
    replacement TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT,
    event_type TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function mockAnthropicResponse(text: string) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      content: [{ type: "text", text }],
      usage: { input_tokens: 100, output_tokens: 200 },
    }),
  };
}

function mockFailedResponse() {
  return { ok: false, status: 429, statusText: "Too Many Requests" };
}

describe("BdSkillExecutor", () => {
  let db: ReturnType<typeof createMockD1>;
  let executor: BdSkillExecutor;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    (db as any).exec(`
      INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
      INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Test User', '2026-01-01', '2026-01-01');
      INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
        VALUES ('biz1', 'org1', 'AI Chatbot', 'Customer support chatbot', 'discovery', 'draft', 'user1', '2026-01-01', '2026-01-01');
    `);
    executor = new BdSkillExecutor(db as unknown as D1Database, "test-api-key");
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("executes a skill and creates completed artifact", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockAnthropicResponse("## Ecosystem Map\nAnalysis of AI chatbot ecosystem..."),
    ));

    const result = await executor.execute("org1", "user1", "ai-biz:ecosystem-map", {
      bizItemId: "biz1",
      stageId: "2-1",
      inputText: "Analyze the AI chatbot market ecosystem",
    });

    expect(result.status).toBe("completed");
    expect(result.version).toBe(1);
    expect(result.outputText).toContain("Ecosystem Map");
    expect(result.tokensUsed).toBe(300);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("auto-increments version on re-execution", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      mockAnthropicResponse("v1 output"),
    ));

    const v1 = await executor.execute("org1", "user1", "ai-biz:ecosystem-map", {
      bizItemId: "biz1",
      stageId: "2-1",
      inputText: "First analysis",
    });
    expect(v1.version).toBe(1);

    const v2 = await executor.execute("org1", "user1", "ai-biz:ecosystem-map", {
      bizItemId: "biz1",
      stageId: "2-1",
      inputText: "Second analysis with more context",
    });
    expect(v2.version).toBe(2);
  });

  it("handles API failure gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockFailedResponse()));

    const result = await executor.execute("org1", "user1", "ai-biz:moat-analysis", {
      bizItemId: "biz1",
      stageId: "2-3",
      inputText: "Analyze competitive moat",
    });

    expect(result.status).toBe("failed");
    expect(result.outputText).toContain("Anthropic API error");
  });

  it("throws for unsupported skill ID", async () => {
    await expect(
      executor.execute("org1", "user1", "nonexistent:skill", {
        bizItemId: "biz1",
        stageId: "2-1",
        inputText: "test",
      }),
    ).rejects.toThrow("Unsupported skill: nonexistent:skill");
  });

  it("handles network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network timeout")));

    const result = await executor.execute("org1", "user1", "ai-biz:feasibility-study", {
      bizItemId: "biz1",
      stageId: "2-4",
      inputText: "Feasibility analysis",
    });

    expect(result.status).toBe("failed");
    expect(result.outputText).toContain("Network timeout");
  });

  it("includes biz-item context in the prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockAnthropicResponse("Analysis result"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await executor.execute("org1", "user1", "ai-biz:ecosystem-map", {
      bizItemId: "biz1",
      stageId: "2-1",
      inputText: "Market analysis",
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(callBody.messages[0].content).toContain("AI Chatbot");
    expect(callBody.messages[0].content).toContain("Customer support chatbot");
    expect(callBody.system).toContain("생태계");
  });

  it("sanitizes user input before sending to LLM", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockAnthropicResponse("Clean analysis"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await executor.execute("org1", "user1", "ai-biz:ecosystem-map", {
      bizItemId: "biz1",
      stageId: "2-1",
      inputText: 'My api_key = "sk-secret-12345678" analyze this',
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(callBody.messages[0].content).toContain("[REDACTED_SECRET]");
    expect(callBody.messages[0].content).not.toContain("sk-secret-12345678");
  });

  it("uses correct model and max_tokens from prompt definition", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockAnthropicResponse("Result"),
    );
    vi.stubGlobal("fetch", fetchMock);

    await executor.execute("org1", "user1", "ai-biz:ir-deck", {
      bizItemId: "biz1",
      stageId: "2-8",
      inputText: "Generate IR deck",
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(callBody.model).toBe("claude-haiku-4-5");
    expect(callBody.max_tokens).toBe(4096);
  });
});
