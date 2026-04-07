import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BmcInsightService, parseInsights } from "../core/shaping/services/bmc-insight-service.js";
import { InsightAgentService, parseMarketSummary } from "../core/shaping/services/insight-agent-service.js";

// ── Helpers ──

function createAnthropicResponse(content: string) {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: "text", text: content }],
    }),
  };
}

function createFailedResponse() {
  return { ok: false, status: 500, json: async () => ({}) };
}

const MOCK_INSIGHTS = JSON.stringify([
  { title: "Improve clarity", description: "Make value prop clearer", suggestedContent: "AI-powered automation for SMBs" },
  { title: "Add metrics", description: "Include measurable outcomes", suggestedContent: "Reduce costs by 30%" },
  { title: "Target focus", description: "Narrow customer segment", suggestedContent: "Mid-size tech companies" },
]);

const MOCK_MARKET_SUMMARY = JSON.stringify({
  summary: "AI market is growing rapidly with focus on automation",
  trends: ["LLM adoption", "Agent frameworks", "RAG pipelines"],
  opportunities: ["SMB automation", "Vertical SaaS AI", "Code generation"],
  risks: ["Regulation", "Cost of compute", "Data privacy"],
});

// ── Tables Setup ──

const INSIGHT_JOBS_TABLE = `
  CREATE TABLE IF NOT EXISTS ax_insight_jobs (
    id          TEXT PRIMARY KEY,
    org_id      TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    keywords    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    result      TEXT,
    error       TEXT,
    created_at  INTEGER NOT NULL,
    completed_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_insight_jobs_org ON ax_insight_jobs(org_id);
  CREATE INDEX IF NOT EXISTS idx_insight_jobs_user ON ax_insight_jobs(user_id, status);
`;

const GATEWAY_TABLES = `
  CREATE TABLE IF NOT EXISTS prompt_sanitization_rules (
    id TEXT PRIMARY KEY,
    pattern TEXT NOT NULL,
    replacement TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS model_routing_rules (
    id TEXT PRIMARY KEY,
    task_type TEXT NOT NULL,
    model_id TEXT NOT NULL,
    runner_type TEXT NOT NULL DEFAULT 'claude-api',
    priority INTEGER NOT NULL DEFAULT 1,
    max_cost_per_call REAL,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

// ═══════════════════════════════════════════════════
// F201: BmcInsightService
// ═══════════════════════════════════════════════════

describe("BmcInsightService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: BmcInsightService;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(GATEWAY_TABLES);
    service = new BmcInsightService(db as unknown as D1Database, "test-api-key");
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("generates insights for a BMC block", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createAnthropicResponse(MOCK_INSIGHTS)));

    const result = await service.generateInsights(
      "value_propositions",
      "Our platform helps businesses automate workflows",
    );

    expect(result.insights).toHaveLength(3);
    expect(result.insights[0]!.title).toBe("Improve clarity");
    expect(result.insights[0]!.description).toBe("Make value prop clearer");
    expect(result.insights[0]!.suggestedContent).toBe("AI-powered automation for SMBs");
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.model).toContain("anthropic/");
    expect(result.masked).toBe(false);
  });

  it("includes bmcContext in prompt when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createAnthropicResponse(MOCK_INSIGHTS));
    vi.stubGlobal("fetch", fetchMock);

    await service.generateInsights(
      "customer_segments",
      "SMBs in the tech industry need automation",
      { value_propositions: "AI automation platform" },
    );

    const callBody = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(callBody.messages[0].content).toContain("BMC Context");
  });

  it("passes tenantId to PromptGateway for sanitization", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createAnthropicResponse(MOCK_INSIGHTS)));

    const result = await service.generateInsights(
      "channels",
      "Direct sales and online marketing channels",
      undefined,
      "tenant_123",
    );

    expect(result.insights).toHaveLength(3);
  });

  it("throws LLM_TIMEOUT on fetch abort", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(
      service.generateInsights("key_resources", "Engineers and cloud infrastructure for AI"),
    ).rejects.toThrow("LLM_TIMEOUT");
  });

  it("throws LLM_PARSE_ERROR on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFailedResponse()));

    await expect(
      service.generateInsights("cost_structure", "Cloud hosting and engineering salaries cost"),
    ).rejects.toThrow("LLM_PARSE_ERROR");
  });

  it("throws LLM_PARSE_ERROR when response has no text block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ type: "image" }] }),
      }),
    );

    await expect(
      service.generateInsights("revenue_streams", "Subscription model with tiered pricing plan"),
    ).rejects.toThrow("LLM_PARSE_ERROR");
  });

  it("throws LLM_PARSE_ERROR on invalid JSON from LLM", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createAnthropicResponse("not json")));

    await expect(
      service.generateInsights("key_partnerships", "Cloud providers and enterprise clients partners"),
    ).rejects.toThrow("LLM_PARSE_ERROR");
  });
});

// ═══════════════════════════════════════════════════
// F201: parseInsights
// ═══════════════════════════════════════════════════

describe("parseInsights", () => {
  it("parses valid JSON array", () => {
    const result = parseInsights(MOCK_INSIGHTS);
    expect(result).toHaveLength(3);
    expect(result[0]!.title).toBe("Improve clarity");
  });

  it("truncates long fields", () => {
    const longInsight = JSON.stringify([
      { title: "x".repeat(100), description: "y".repeat(300), suggestedContent: "z".repeat(400) },
    ]);
    const result = parseInsights(longInsight);
    expect(result[0]!.title).toHaveLength(50);
    expect(result[0]!.description).toHaveLength(200);
    expect(result[0]!.suggestedContent).toHaveLength(300);
  });

  it("throws on non-array JSON", () => {
    expect(() => parseInsights('{"key": "value"}')).toThrow("LLM_PARSE_ERROR");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseInsights("broken")).toThrow("LLM_PARSE_ERROR");
  });

  it("handles missing fields gracefully", () => {
    const result = parseInsights('[{"title": "only title"}]');
    expect(result[0]!.title).toBe("only title");
    expect(result[0]!.description).toBe("");
    expect(result[0]!.suggestedContent).toBe("");
  });
});

// ═══════════════════════════════════════════════════
// F202: InsightAgentService
// ═══════════════════════════════════════════════════

describe("InsightAgentService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: InsightAgentService;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(INSIGHT_JOBS_TABLE);
    (db as any).exec(GATEWAY_TABLES);
    service = new InsightAgentService(db as unknown as D1Database, "test-api-key");
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ── createJob ──

  it("creates a job with pending status", async () => {
    const job = await service.createJob("org_1", "user_1", ["AI", "SaaS"]);

    expect(job.id).toBeTruthy();
    expect(job.orgId).toBe("org_1");
    expect(job.userId).toBe("user_1");
    expect(job.keywords).toEqual(["AI", "SaaS"]);
    expect(job.status).toBe("pending");
    expect(job.result).toBeNull();
    expect(job.error).toBeNull();
    expect(job.createdAt).toBeGreaterThan(0);
    expect(job.completedAt).toBeNull();
  });

  // ── getJob ──

  it("retrieves a job by id and orgId", async () => {
    const created = await service.createJob("org_1", "user_1", ["fintech"]);
    const found = await service.getJob(created.id, "org_1");

    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.keywords).toEqual(["fintech"]);
  });

  it("returns null for non-existent job", async () => {
    const found = await service.getJob("nonexistent", "org_1");
    expect(found).toBeNull();
  });

  it("returns null for wrong org", async () => {
    const created = await service.createJob("org_1", "user_1", ["edtech"]);
    const found = await service.getJob(created.id, "org_2");
    expect(found).toBeNull();
  });

  // ── executeJob ──

  it("executes a job and marks as completed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createAnthropicResponse(MOCK_MARKET_SUMMARY)));

    const job = await service.createJob("org_1", "user_1", ["AI", "automation"]);
    await service.executeJob(job.id);

    const completed = await service.getJob(job.id, "org_1");
    expect(completed!.status).toBe("completed");
    expect(completed!.result).not.toBeNull();
    expect(completed!.result!.summary).toContain("AI market");
    expect(completed!.result!.trends).toHaveLength(3);
    expect(completed!.result!.opportunities).toHaveLength(3);
    expect(completed!.result!.risks).toHaveLength(3);
    expect(completed!.completedAt).toBeGreaterThan(0);
  });

  it("marks job as failed on LLM error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createFailedResponse()));

    const job = await service.createJob("org_1", "user_1", ["blockchain"]);
    await service.executeJob(job.id);

    const failed = await service.getJob(job.id, "org_1");
    expect(failed!.status).toBe("failed");
    expect(failed!.error).toBe("LLM_PARSE_ERROR");
    expect(failed!.completedAt).toBeGreaterThan(0);
  });

  it("marks job as failed on invalid JSON from LLM", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createAnthropicResponse("not valid json")));

    const job = await service.createJob("org_1", "user_1", ["quantum"]);
    await service.executeJob(job.id);

    const failed = await service.getJob(job.id, "org_1");
    expect(failed!.status).toBe("failed");
    expect(failed!.error).toBe("LLM_PARSE_ERROR");
  });

  it("marks job as failed on timeout", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const job = await service.createJob("org_1", "user_1", ["robotics"]);
    await service.executeJob(job.id);

    const failed = await service.getJob(job.id, "org_1");
    expect(failed!.status).toBe("failed");
    expect(failed!.error).toBe("LLM_TIMEOUT");
  });

  it("handles executeJob for non-existent job gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn());
    // Should not throw
    await service.executeJob("nonexistent_id");
  });
});

// ═══════════════════════════════════════════════════
// F202: parseMarketSummary
// ═══════════════════════════════════════════════════

describe("parseMarketSummary", () => {
  it("parses valid market summary JSON", () => {
    const result = parseMarketSummary(MOCK_MARKET_SUMMARY);
    expect(result.summary).toContain("AI market");
    expect(result.trends).toHaveLength(3);
    expect(result.opportunities).toHaveLength(3);
    expect(result.risks).toHaveLength(3);
  });

  it("truncates long summary", () => {
    const long = JSON.stringify({
      summary: "x".repeat(600),
      trends: [],
      opportunities: [],
      risks: [],
    });
    const result = parseMarketSummary(long);
    expect(result.summary).toHaveLength(500);
  });

  it("truncates long trend items", () => {
    const long = JSON.stringify({
      summary: "ok",
      trends: ["x".repeat(200)],
      opportunities: [],
      risks: [],
    });
    const result = parseMarketSummary(long);
    expect(result.trends[0]).toHaveLength(100);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseMarketSummary("broken")).toThrow("LLM_PARSE_ERROR");
  });

  it("handles missing arrays gracefully", () => {
    const result = parseMarketSummary('{"summary": "test"}');
    expect(result.summary).toBe("test");
    expect(result.trends).toEqual([]);
    expect(result.opportunities).toEqual([]);
    expect(result.risks).toEqual([]);
  });

  it("filters out non-string items in arrays", () => {
    const result = parseMarketSummary(
      JSON.stringify({
        summary: "test",
        trends: ["valid", 123, null, "also valid"],
        opportunities: [],
        risks: [],
      }),
    );
    expect(result.trends).toEqual(["valid", "also valid"]);
  });
});
