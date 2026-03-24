import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";

// Mock agent-runner for TrendDataService + CompetitorScanner
vi.mock("../services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockImplementation((request) => {
      const agentId = request.agentId as string;

      if (agentId === "trend-analyzer") {
        return Promise.resolve({
          status: "success",
          output: {
            analysis: JSON.stringify({
              marketSummary: "AI 기반 손해사정 시장은 보험 디지털 전환과 함께 성장 중",
              marketSizeEstimate: {
                tam: "5조원",
                sam: "8000억원",
                som: "200억원",
                currency: "KRW",
                year: 2026,
                confidence: "medium",
              },
              competitors: [
                { name: "CompanyA", description: "AI 손해사정", url: "https://a.com", relevance: "high" },
                { name: "CompanyB", description: "보험 RPA", relevance: "medium" },
              ],
              trends: [
                { title: "보험업 GenAI 도입 가속", description: "대형 보험사 GenAI 파일럿", impact: "high", timeframe: "2026-2027" },
              ],
            }),
          },
          tokensUsed: 1200,
          model: "mock-model",
          duration: 3000,
        });
      }

      if (agentId === "competitor-scanner") {
        return Promise.resolve({
          status: "success",
          output: {
            analysis: JSON.stringify({
              competitors: [
                { name: "CompanyA", description: "AI 손해사정", url: "https://a.com", relevance: "high", strengths: ["기술력"], weaknesses: ["가격"] },
              ],
              marketPosition: "KT DS는 통신·보험 도메인 전문성으로 차별화 가능",
            }),
          },
          tokensUsed: 800,
          model: "mock-model",
          duration: 2000,
        });
      }

      // default mock for other agents
      return Promise.resolve({
        status: "success",
        output: { analysis: "{}" },
        tokensUsed: 100,
        model: "mock",
        duration: 500,
      });
    }),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  }),
  createRoutedRunner: () => Promise.resolve({
    type: "mock",
    execute: vi.fn(),
    isAvailable: () => Promise.resolve(true),
    supportsTaskType: () => true,
  }),
}));

let env: ReturnType<typeof createTestEnv>;

function req(method: string, path: string, opts?: { body?: unknown; headers?: Record<string, string> }) {
  const url = `http://localhost${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  };
  if (opts?.body) init.body = JSON.stringify(opts.body);
  return app.request(url, init, env);
}

function execSql(sql: string) {
  (env.DB as any).exec(sql);
}

function seedDb(sql: string) {
  (env.DB as any).prepare(sql).run();
}

const TREND_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'field',
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_classifications (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL UNIQUE,
    item_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    turn_1_answer TEXT,
    turn_2_answer TEXT,
    turn_3_answer TEXT,
    analysis_weights TEXT NOT NULL DEFAULT '{}',
    classified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS biz_item_trend_reports (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    market_summary TEXT,
    market_size_estimate TEXT,
    competitors TEXT,
    trends TEXT,
    keywords_used TEXT,
    model_used TEXT,
    tokens_used INTEGER DEFAULT 0,
    analyzed_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
  );
`;

const SEED_ITEM = `
  INSERT INTO biz_items (id, org_id, title, description, source, status, created_by)
  VALUES ('item-1', 'org_test', 'AI 손해사정 자동화', '보험 손해사정을 AI로 자동화', 'field', 'draft', 'test-user');
`;

describe("Trend Data API (F190)", () => {
  let headers: Record<string, string>;

  beforeEach(async () => {
    env = createTestEnv();
    headers = await createAuthHeaders();
    execSql(TREND_TABLES_SQL);
    seedDb(SEED_ITEM);
  });

  // ─── POST /biz-items/:id/trend-report ───

  describe("POST /api/biz-items/:id/trend-report", () => {
    it("should generate trend report for existing item", async () => {
      const res = await req("POST", "/api/biz-items/item-1/trend-report", {
        headers,
        body: {},
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.marketSummary).toBeTruthy();
      expect(data.marketSizeEstimate).toBeTruthy();
      expect(data.marketSizeEstimate.tam).toBe("5조원");
      expect(data.competitors).toHaveLength(2);
      expect(data.trends).toHaveLength(1);
      expect(data.analyzedAt).toBeTruthy();
      expect(data.expiresAt).toBeTruthy();
    });

    it("should return cached report on second call", async () => {
      await req("POST", "/api/biz-items/item-1/trend-report", {
        headers,
        body: {},
      });
      const res = await req("POST", "/api/biz-items/item-1/trend-report", {
        headers,
        body: {},
      });
      expect(res.status).toBe(200); // cached
    });

    it("should force refresh with forceRefresh=true", async () => {
      await req("POST", "/api/biz-items/item-1/trend-report", {
        headers,
        body: {},
      });
      const res = await req("POST", "/api/biz-items/item-1/trend-report", {
        headers,
        body: { forceRefresh: true },
      });
      expect(res.status).toBe(201); // new report
    });

    it("should return 404 for non-existent item", async () => {
      const res = await req("POST", "/api/biz-items/nonexistent/trend-report", {
        headers,
        body: {},
      });
      expect(res.status).toBe(404);
    });

    it("should return 401 without auth", async () => {
      const res = await req("POST", "/api/biz-items/item-1/trend-report", {
        body: {},
      });
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /biz-items/:id/trend-report ───

  describe("GET /api/biz-items/:id/trend-report", () => {
    it("should return 404 when no report exists", async () => {
      const res = await req("GET", "/api/biz-items/item-1/trend-report", { headers });
      expect(res.status).toBe(404);
    });

    it("should return report after generation", async () => {
      await req("POST", "/api/biz-items/item-1/trend-report", {
        headers,
        body: {},
      });
      const res = await req("GET", "/api/biz-items/item-1/trend-report", { headers });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.marketSummary).toBeTruthy();
      expect(data.competitors).toHaveLength(2);
    });

    it("should return 404 for non-existent item", async () => {
      const res = await req("GET", "/api/biz-items/nonexistent/trend-report", { headers });
      expect(res.status).toBe(404);
    });
  });

  // ─── POST /biz-items/:id/competitor-scan ───

  describe("POST /api/biz-items/:id/competitor-scan", () => {
    it("should scan competitors for existing item", async () => {
      const res = await req("POST", "/api/biz-items/item-1/competitor-scan", {
        headers,
        body: {},
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.competitors).toHaveLength(1);
      expect(data.competitors[0].name).toBe("CompanyA");
      expect(data.competitors[0].strengths).toHaveLength(1);
      expect(data.marketPosition).toBeTruthy();
    });

    it("should return 404 for non-existent item", async () => {
      const res = await req("POST", "/api/biz-items/nonexistent/competitor-scan", {
        headers,
        body: {},
      });
      expect(res.status).toBe(404);
    });

    it("should return 401 without auth", async () => {
      const res = await req("POST", "/api/biz-items/item-1/competitor-scan", {
        body: {},
      });
      expect(res.status).toBe(401);
    });
  });
});
