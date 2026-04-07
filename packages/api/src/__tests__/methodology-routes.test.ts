/**
 * Sprint 59 F191: Methodology routes integration tests
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { app } from "../app.js";
import { createTestEnv, createAuthHeaders } from "./helpers/test-app.js";
import { MethodologyRegistry } from "../core/offering/services/methodology-registry.js";
import type { MethodologyModule } from "../core/offering/services/methodology-module.js";

// Mock agent-runner (avoid LLM calls)
vi.mock("../core/agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({ status: "success", output: {}, tokensUsed: 0, model: "mock", duration: 0 }),
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

const METHODOLOGY_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS methodology_modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '1.0.0',
    is_active INTEGER NOT NULL DEFAULT 1,
    config_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS methodology_selections (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    methodology_id TEXT NOT NULL,
    match_score REAL,
    selected_by TEXT NOT NULL DEFAULT 'auto',
    is_current INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(biz_item_id, methodology_id)
  );
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
  CREATE TABLE IF NOT EXISTS biz_starting_points (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL UNIQUE,
    starting_point TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    reasoning TEXT,
    needs_confirmation INTEGER NOT NULL DEFAULT 0,
    confirmed INTEGER NOT NULL DEFAULT 0,
    classified_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const SEED_BIZ_ITEM_SQL = `
  INSERT OR IGNORE INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
  VALUES ('item-1', 'org_test', 'AI 채팅봇', 'LLM 기반 고객지원 챗봇', 'field', 'classified', 'test-user', datetime('now'), datetime('now'));
`;

function createBdpMock(): MethodologyModule {
  return {
    id: "bdp",
    name: "BDP (Business Development Process)",
    description: "AX 사업개발 6단계 프로세스",
    version: "1.0.0",
    matchScore: vi.fn().mockResolvedValue(0.85),
    classifyItem: vi.fn(),
    getAnalysisSteps: () => [
      { order: 1, activity: "벤치마크 분석", toolIds: ["tool-1"], discoveryMapping: [2] },
    ],
    getCriteria: () => [
      { id: 1, name: "시장규모", condition: "TAM > 100억", relatedTools: ["market-tool"] },
      { id: 2, name: "경쟁우위", condition: "차별점 2개 이상", relatedTools: ["comp-tool"] },
    ],
    checkGate: vi.fn(),
    getReviewMethods: () => [
      { id: "ai-review", name: "다중 AI 검토", type: "ai-review" as const, description: "3개 AI 모델 교차 검토" },
    ],
  };
}

describe("Methodology Routes", () => {
  beforeEach(async () => {
    env = createTestEnv();
    await (env.DB as any).exec(METHODOLOGY_TABLES_SQL);
    await (env.DB as any).exec(SEED_BIZ_ITEM_SQL);
    MethodologyRegistry.resetForTest();
    const registry = MethodologyRegistry.getInstance();
    registry.register(createBdpMock());
  });

  it("GET /api/methodologies returns registered modules", async () => {
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/methodologies", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any[];
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("bdp");
    expect(data[0].criteriaCount).toBe(2);
    expect(data[0].reviewMethodCount).toBe(1);
  });

  it("GET /api/methodologies/bdp returns detail with criteria", async () => {
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/methodologies/bdp", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.id).toBe("bdp");
    expect(data.criteria).toHaveLength(2);
    expect(data.reviewMethods).toHaveLength(1);
  });

  it("GET /api/methodologies/unknown returns 404", async () => {
    const headers = await createAuthHeaders();
    const res = await req("GET", "/api/methodologies/unknown", { headers });
    expect(res.status).toBe(404);
  });

  it("POST /api/biz-items/:id/methodology/recommend returns recommendations", async () => {
    const headers = await createAuthHeaders();
    const res = await req("POST", "/api/biz-items/item-1/methodology/recommend", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.recommendations).toHaveLength(1);
    expect(data.recommendations[0].methodologyId).toBe("bdp");
    expect(data.recommendations[0].matchScore).toBe(0.85);
  });

  it("POST /api/biz-items/unknown/methodology/recommend returns 404", async () => {
    const headers = await createAuthHeaders();
    const res = await req("POST", "/api/biz-items/unknown/methodology/recommend", { headers });
    expect(res.status).toBe(404);
  });

  it("POST /api/biz-items/:id/methodology/select creates selection", async () => {
    const headers = await createAuthHeaders();
    const res = await req("POST", "/api/biz-items/item-1/methodology/select", {
      headers,
      body: { methodologyId: "bdp" },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.bizItemId).toBe("item-1");
    expect(data.methodologyId).toBe("bdp");
    expect(data.selectedBy).toBe("manual");
    expect(data.isCurrent).toBe(true);
  });

  it("POST /api/biz-items/unknown/methodology/select returns 404", async () => {
    const headers = await createAuthHeaders();
    const res = await req("POST", "/api/biz-items/unknown/methodology/select", {
      headers,
      body: { methodologyId: "bdp" },
    });
    expect(res.status).toBe(404);
  });

  it("select overwrites previous selection", async () => {
    const headers = await createAuthHeaders();

    // 첫 선택
    await req("POST", "/api/biz-items/item-1/methodology/select", {
      headers,
      body: { methodologyId: "bdp" },
    });

    // pm-skills 모듈 추가 등록
    const pmMock: MethodologyModule = {
      ...createBdpMock(),
      id: "pm-skills",
      name: "PM Skills",
      description: "pm-skills 방법론",
    };
    MethodologyRegistry.getInstance().register(pmMock);

    // 두 번째 선택 (pm-skills)
    const res = await req("POST", "/api/biz-items/item-1/methodology/select", {
      headers,
      body: { methodologyId: "pm-skills" },
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.methodologyId).toBe("pm-skills");
    expect(data.isCurrent).toBe(true);

    // 현재 선택 확인
    const cur = await req("GET", "/api/biz-items/item-1/methodology", { headers });
    const curData = await cur.json() as any;
    expect(curData.selection.methodologyId).toBe("pm-skills");
  });

  it("GET /api/biz-items/:id/methodology returns current selection", async () => {
    const headers = await createAuthHeaders();

    // 선택 없을 때
    const empty = await req("GET", "/api/biz-items/item-1/methodology", { headers });
    expect(empty.status).toBe(200);
    const emptyData = await empty.json() as any;
    expect(emptyData.selection).toBeNull();

    // 선택 후
    await req("POST", "/api/biz-items/item-1/methodology/select", {
      headers,
      body: { methodologyId: "bdp" },
    });
    const res = await req("GET", "/api/biz-items/item-1/methodology", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.selection.methodologyId).toBe("bdp");
  });

  it("GET /api/biz-items/:id/methodology/history returns all selections", async () => {
    const headers = await createAuthHeaders();

    await req("POST", "/api/biz-items/item-1/methodology/select", {
      headers,
      body: { methodologyId: "bdp" },
    });

    const res = await req("GET", "/api/biz-items/item-1/methodology/history", { headers });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.history).toHaveLength(1);
    expect(data.history[0].methodologyId).toBe("bdp");
  });
});
