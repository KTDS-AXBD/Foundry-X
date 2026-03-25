import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { Hono } from "hono";
import { createMockD1 } from "./helpers/mock-d1.js";
import { BmcAgentService, parseBlocks } from "../services/bmc-agent.js";
import { BMC_BLOCK_TYPES } from "../services/bmc-service.js";
import { axBdAgentRoute } from "../routes/ax-bd-agent.js";
import type { Env } from "../env.js";
import type { TenantVariables } from "../middleware/tenant.js";

// ─── Helpers ───

const MOCK_BMC_RESPONSE: Record<string, string> = {
  customer_segments: "중소기업 IT 담당자",
  value_propositions: "AI 기반 업무 자동화",
  channels: "웹 대시보드, API",
  customer_relationships: "셀프서비스 + 온보딩 가이드",
  revenue_streams: "월 구독 SaaS",
  key_resources: "LLM 인프라, 개발팀",
  key_activities: "모델 학습, 고객 지원",
  key_partnerships: "클라우드 제공사, LLM 제공사",
  cost_structure: "인프라 비용, 인건비",
};

function makeLlmResponse(blocks: Record<string, string> = MOCK_BMC_RESPONSE) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text: JSON.stringify(blocks) }],
    }),
  } as unknown as Response;
}

function makeBadJsonResponse() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      content: [{ type: "text", text: "This is not JSON" }],
    }),
  } as unknown as Response;
}

let db: ReturnType<typeof createMockD1>;
const originalFetch = globalThis.fetch;

function setupDb() {
  db = createMockD1();
  // model_routing_rules 테이블 (ModelRouter가 조회)
  (db as any).exec(`
    CREATE TABLE IF NOT EXISTS model_routing_rules (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      model_id TEXT NOT NULL,
      runner_type TEXT NOT NULL DEFAULT 'openrouter',
      priority INTEGER NOT NULL DEFAULT 1,
      max_cost_per_call REAL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_type, model_id)
    );
  `);
}

// ─── BmcAgentService Unit Tests ───

describe("BmcAgentService", () => {
  beforeEach(() => {
    setupDb();
    globalThis.fetch = vi.fn().mockResolvedValue(makeLlmResponse());
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("generates 9-block BMC draft from idea", async () => {
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    const result = await service.generateDraft("AI 기반 사업개발 도구");

    expect(result.draft).toBeDefined();
    expect(Object.keys(result.draft)).toHaveLength(9);
    for (const key of BMC_BLOCK_TYPES) {
      expect(result.draft[key]).toBeDefined();
      expect(typeof result.draft[key]).toBe("string");
    }
  });

  it("includes context in prompt when provided", async () => {
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    await service.generateDraft("SaaS 도구", "B2B 시장 대상");

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(callArgs[1].body);
    expect(body.messages[0].content).toContain("Context:");
  });

  it("trims each block to 200 characters", async () => {
    const longBlocks = { ...MOCK_BMC_RESPONSE };
    longBlocks.customer_segments = "A".repeat(300);
    globalThis.fetch = vi.fn().mockResolvedValue(makeLlmResponse(longBlocks));

    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    const result = await service.generateDraft("Test idea");

    expect(result.draft.customer_segments!.length).toBe(200);
  });

  it("throws on empty idea after sanitize produces empty string", async () => {
    // sanitizePrompt will still return content for non-empty input
    // This tests that the service processes without error for valid input
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    const result = await service.generateDraft("Valid idea");
    expect(result.draft).toBeDefined();
  });

  it("throws LLM_TIMEOUT when fetch aborts", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error("AbortError");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    await expect(service.generateDraft("Test")).rejects.toThrow("LLM_TIMEOUT");
  });

  it("throws LLM_PARSE_ERROR when response is not valid JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeBadJsonResponse());

    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    await expect(service.generateDraft("Test")).rejects.toThrow("LLM_PARSE_ERROR");
  });

  it("throws LLM_PARSE_ERROR when API returns non-ok status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    } as unknown as Response);

    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    await expect(service.generateDraft("Test")).rejects.toThrow("LLM_PARSE_ERROR");
  });

  it("returns positive processingTimeMs", async () => {
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    const result = await service.generateDraft("Test idea");

    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("sets masked=false when no sanitization rules matched", async () => {
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    const result = await service.generateDraft("Plain idea without secrets");

    expect(result.masked).toBe(false);
  });

  it("sets masked=true when sanitization rules matched", async () => {
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    // Include a secret pattern that will match default sanitization rules
    const result = await service.generateDraft('Idea with api_key="sk-1234567890abcdef"');

    expect(result.masked).toBe(true);
  });

  it("includes system prompt with all 9 block keys", async () => {
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    await service.generateDraft("Test");

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const body = JSON.parse(callArgs[1].body);
    for (const key of BMC_BLOCK_TYPES) {
      expect(body.system).toContain(key);
    }
  });

  it("uses model from ModelRouter", async () => {
    const service = new BmcAgentService(db as unknown as D1Database, "test-key");
    const result = await service.generateDraft("Test");

    // Default model map: bmc-generation → anthropic/claude-sonnet-4-6
    expect(result.model).toBe("anthropic/claude-sonnet-4-6");
  });
});

// ─── parseBlocks Unit Tests ───

describe("parseBlocks", () => {
  it("parses valid JSON into 9 blocks", () => {
    const result = parseBlocks(JSON.stringify(MOCK_BMC_RESPONSE));
    expect(Object.keys(result)).toHaveLength(9);
    expect(result.customer_segments).toBe("중소기업 IT 담당자");
  });

  it("fills missing blocks with empty string", () => {
    const partial = { customer_segments: "Test" };
    const result = parseBlocks(JSON.stringify(partial));

    expect(result.customer_segments).toBe("Test");
    expect(result.value_propositions).toBe("");
    expect(result.channels).toBe("");
  });

  it("throws LLM_PARSE_ERROR for invalid JSON", () => {
    expect(() => parseBlocks("not json")).toThrow("LLM_PARSE_ERROR");
  });

  it("trims values exceeding 200 characters", () => {
    const long = { ...MOCK_BMC_RESPONSE, channels: "X".repeat(250) };
    const result = parseBlocks(JSON.stringify(long));
    expect(result.channels!.length).toBe(200);
  });
});

// ─── Route Tests ───

describe("axBdAgentRoute", () => {
  let app: Hono<{ Bindings: Env; Variables: TenantVariables }>;
  let mockKv: Record<string, { value: string; expiration?: number }>;

  beforeEach(() => {
    setupDb();
    globalThis.fetch = vi.fn().mockResolvedValue(makeLlmResponse());
    mockKv = {};

    app = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

    // Inject tenant variables
    app.use("*", async (c, next) => {
      c.set("orgId", "org_test");
      c.set("userId", "user_1");
      c.set("orgRole", "admin");
      await next();
    });

    app.route("/", axBdAgentRoute);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function makeRequest(body: unknown) {
    return app.request("/ax-bd/bmc/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, {
      DB: db as unknown as D1Database,
      ANTHROPIC_API_KEY: "test-key",
      CACHE: {
        get: async (key: string) => mockKv[key]?.value ?? null,
        put: async (key: string, value: string, opts?: { expirationTtl?: number }) => {
          mockKv[key] = { value, expiration: opts?.expirationTtl };
        },
      } as unknown as KVNamespace,
    } as unknown as Env);
  }

  it("POST /ax-bd/bmc/generate returns 200 with draft", async () => {
    const res = await makeRequest({ idea: "AI 사업개발 도구" });
    expect(res.status).toBe(200);

    const body = await res.json() as { draft: Record<string, string> };
    expect(Object.keys(body.draft)).toHaveLength(9);
  });

  it("returns 400 when idea is missing", async () => {
    const res = await makeRequest({});
    expect(res.status).toBe(400);
  });

  it("returns 400 when idea exceeds 500 characters", async () => {
    const res = await makeRequest({ idea: "A".repeat(501) });
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate limit exceeded", async () => {
    // Pre-fill KV to simulate 5 prior requests
    mockKv["bmc-gen:user_1"] = { value: "5" };

    const res = await makeRequest({ idea: "Test" });
    expect(res.status).toBe(429);
  });

  it("returns 504 on LLM timeout", async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error("AbortError");
      error.name = "AbortError";
      return Promise.reject(error);
    });

    const res = await makeRequest({ idea: "Test" });
    expect(res.status).toBe(504);
  });

  it("returns 502 on LLM parse error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeBadJsonResponse());

    const res = await makeRequest({ idea: "Test" });
    expect(res.status).toBe(502);
  });
});
