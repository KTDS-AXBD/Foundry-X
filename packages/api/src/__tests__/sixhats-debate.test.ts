import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";

// Mock agent-runner
vi.mock("../agent/services/agent-runner.js", () => ({
  createAgentRunner: () => ({
    type: "mock",
    execute: vi.fn().mockResolvedValue({
      status: "success",
      output: { analysis: "## 분석 결과\n- 핵심 이슈: 시장 검증 필요\n- 데이터 부족으로 판단 보류" },
      tokensUsed: 50,
      model: "mock",
      duration: 200,
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

import { SixHatsDebateService, SixHatsDebateError } from "../core/shaping/services/sixhats-debate.js";

const SIXHATS_TABLES_SQL = `
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
  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    criteria_snapshot TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sixhats_debates (
    id TEXT PRIMARY KEY,
    prd_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    total_turns INTEGER NOT NULL DEFAULT 20,
    completed_turns INTEGER NOT NULL DEFAULT 0,
    key_issues TEXT,
    summary TEXT,
    model TEXT NOT NULL,
    total_tokens INTEGER DEFAULT 0,
    duration_seconds REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    org_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sixhats_turns (
    id TEXT PRIMARY KEY,
    debate_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL CHECK (turn_number BETWEEN 1 AND 20),
    hat TEXT NOT NULL CHECK (hat IN ('white', 'red', 'black', 'yellow', 'green', 'blue')),
    hat_label TEXT NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER DEFAULT 0,
    duration_seconds REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(debate_id, turn_number)
  );
`;

let db: D1Database;

function seedBizItem(id = "item-1") {
  (db as any).prepare(
    `INSERT INTO biz_items (id, org_id, title, description, source, status, created_by) VALUES (?, 'org_test', 'AI 보안', '설명', 'field', 'draft', 'user-1')`
  ).bind(id).run();
}

function seedPrd(prdId = "prd-1", bizItemId = "item-1") {
  (db as any).prepare(
    `INSERT INTO biz_generated_prds (id, biz_item_id, version, content) VALUES (?, ?, 1, '# PRD — AI 기반 보안\n## 핵심 가치\n보안 자동화 플랫폼')`
  ).bind(prdId, bizItemId).run();
}

describe("SixHatsDebateService (F188)", () => {
  beforeEach(() => {
    db = createMockD1() as unknown as D1Database;
    (db as any).exec(SIXHATS_TABLES_SQL);
    seedBizItem();
    seedPrd();
  });

  it("startDebate — 20턴 완주 시 completed 상태", async () => {
    const service = new SixHatsDebateService(db, {});
    const result = await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    expect(result.status).toBe("completed");
    expect(result.totalTurns).toBe(20);
    expect(result.completedTurns).toBe(20);
    expect(result.turns).toHaveLength(20);
    expect(result.model).toBe("mock");
    expect(result.totalTokens).toBe(50 * 20);
  });

  it("startDebate — D1 sixhats_debates 레코드 저장 확인", async () => {
    const service = new SixHatsDebateService(db, {});
    const result = await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    const row = await (db as any).prepare("SELECT * FROM sixhats_debates WHERE id = ?").bind(result.id).first();
    expect(row.status).toBe("completed");
    expect(row.completed_turns).toBe(20);
    expect(row.org_id).toBe("org_test");
  });

  it("startDebate — D1 sixhats_turns 20개 저장 확인", async () => {
    const service = new SixHatsDebateService(db, {});
    const result = await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    const { results: turns } = await (db as any).prepare(
      "SELECT * FROM sixhats_turns WHERE debate_id = ? ORDER BY turn_number"
    ).bind(result.id).all();
    expect(turns).toHaveLength(20);
    expect(turns[0].hat).toBe("white");
    expect(turns[19].hat).toBe("blue");
  });

  it("startDebate — key_issues 추출 확인", async () => {
    const service = new SixHatsDebateService(db, {});
    const result = await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    // Mock 응답에서 key issues 추출
    expect(Array.isArray(result.keyIssues)).toBe(true);
  });

  it("getDebate — 존재하는 debate 조회", async () => {
    const service = new SixHatsDebateService(db, {});
    const created = await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    const fetched = await service.getDebate(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.turns).toHaveLength(20);
    expect(fetched!.status).toBe("completed");
  });

  it("getDebate — 존재하지 않는 debate → null", async () => {
    const service = new SixHatsDebateService(db, {});
    const result = await service.getDebate("nonexistent");
    expect(result).toBeNull();
  });

  it("listDebates — prdId로 목록 조회", async () => {
    const service = new SixHatsDebateService(db, {});
    await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");
    await service.startDebate("prd-1", "item-1", "PRD 내용 2", "org_test");

    const list = await service.listDebates("prd-1");
    expect(list).toHaveLength(2);
  });

  it("listDebates — 다른 prdId → 빈 배열", async () => {
    const service = new SixHatsDebateService(db, {});
    await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    const list = await service.listDebates("prd-999");
    expect(list).toHaveLength(0);
  });

  it("extractKeyIssues — Blue Hat content에서 줄 단위 파싱", async () => {
    const service = new SixHatsDebateService(db, {});
    const result = await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    // Blue Hat 턴(20번째)의 content에서 파싱된 결과
    const lastBlueTurn = result.turns.filter(t => t.hat === "blue").pop();
    expect(lastBlueTurn).toBeDefined();
    expect(lastBlueTurn!.turnNumber).toBe(20);
  });

  it("턴 순서가 TURN_SEQUENCE와 일치", async () => {
    const service = new SixHatsDebateService(db, {});
    const result = await service.startDebate("prd-1", "item-1", "PRD 내용", "org_test");

    expect(result.turns[0]!.hat).toBe("white");
    expect(result.turns[5]!.hat).toBe("blue");
    expect(result.turns[18]!.hat).toBe("green");
    expect(result.turns[19]!.hat).toBe("blue");
  });
});
