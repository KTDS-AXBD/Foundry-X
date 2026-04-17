// ─── F531: Discovery Graph Integration — TDD Red Phase ───
// createDiscoveryGraph(runner, db) stub 핸들러 → 실제 StageRunnerService 연동 검증

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { AgentRunner } from "../core/agent/services/agent-runner.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bd_artifacts_version ON bd_artifacts(biz_item_id, skill_id, version);
  CREATE TABLE IF NOT EXISTS biz_item_discovery_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_discovery_stages_item_stage
    ON biz_item_discovery_stages(biz_item_id, stage);
  CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, decision TEXT NOT NULL, question TEXT, reason TEXT,
    decided_by TEXT NOT NULL DEFAULT 'system', decided_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, criterion_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', evidence TEXT, completed_at TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_biz_discovery_criteria
    ON biz_discovery_criteria(biz_item_id, criterion_id);
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY, biz_item_id TEXT NOT NULL, org_id TEXT NOT NULL,
    stage TEXT NOT NULL, entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT, entered_by TEXT NOT NULL, notes TEXT
  );
`;

// biz_items에 discovery_type 컬럼 추가 (mock-d1 기본 스키마에 없음)
const EXTRA_SCHEMA = `ALTER TABLE biz_items ADD COLUMN discovery_type TEXT;`;

const SEED = `
  INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
  INSERT INTO users (id, email, name, created_at, updated_at)
    VALUES ('user1', 'test@test.com', 'Test', '2026-01-01', '2026-01-01');
  INSERT INTO biz_items
    (id, org_id, title, description, source, status, discovery_type, created_by, created_at, updated_at)
    VALUES ('biz1', 'org1', 'AI Chatbot', 'desc', 'discovery', 'analyzing', 'I', 'user1', '2026-01-01', '2026-01-01');
  INSERT INTO biz_item_discovery_stages
    (id, biz_item_id, org_id, stage, status, created_at, updated_at)
    VALUES ('s1', 'biz1', 'org1', '2-1', 'pending', '2026-01-01', '2026-01-01');
`;

const MOCK_AI_RESULT = {
  summary: "테스트 요약",
  details: "테스트 상세",
  confidence: 85,
};

describe("F531: createDiscoveryGraph — 실제 핸들러 연동", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let runner: AgentRunner;

  beforeEach(async () => {
    const mockD1 = createMockD1();
    const execFn = (mockD1 as unknown as { exec: (q: string) => Promise<void> }).exec.bind(mockD1);
    await execFn(SCHEMA);
    await execFn(EXTRA_SCHEMA);
    await execFn(SEED);
    db = mockD1 as unknown as D1Database;

    runner = {
      type: "direct" as const,
      execute: vi.fn().mockResolvedValue({
        status: "completed",
        output: { analysis: JSON.stringify(MOCK_AI_RESULT) },
      }),
    } as unknown as AgentRunner;
  });

  it("test 1: createDiscoveryGraph(runner, db) - stage-2-1 노드 실행 시 LLM runner.execute() 호출됨", async () => {
    // F531: createDiscoveryGraph must accept runner + db and wire real LLM calls
    const { createDiscoveryGraph } = await import(
      "../core/agent/orchestration/graphs/discovery-graph.js"
    );

    // 실제 핸들러가 연결된 graph 생성
    const graph = createDiscoveryGraph(runner, db);

    // GraphEngine으로 실행 — stage-2-1 노드 실행 시 runner.execute 호출되어야 함
    const { GraphEngine } = await import(
      "../core/agent/orchestration/graph-engine.js"
    );
    const engine = new GraphEngine();
    for (const node of graph.nodes) engine.addNode(node);
    for (const edge of graph.edges) engine.addEdge(edge);
    engine.setEntryPoint(graph.entryPoint);
    if (graph.maxExecutions) engine.setMaxExecutions(graph.maxExecutions);

    const input = { bizItemId: "biz1", orgId: "org1", discoveryType: "I" };
    await engine.run(input, "session-1", "test-api-key", db);

    // stage-2-1 핸들러가 runner.execute를 1회 이상 호출해야 함
    expect(runner.execute).toHaveBeenCalled();
  });

  it("test 2: createDiscoveryGraph(runner, db) - coordinator 노드 실행 후 stage-2-0 실행됨", async () => {
    const { createDiscoveryGraph } = await import(
      "../core/agent/orchestration/graphs/discovery-graph.js"
    );
    const graph = createDiscoveryGraph(runner, db);

    const { GraphEngine } = await import("../core/agent/orchestration/graph-engine.js");
    const engine = new GraphEngine();
    for (const node of graph.nodes) engine.addNode(node);
    for (const edge of graph.edges) engine.addEdge(edge);
    engine.setEntryPoint(graph.entryPoint);
    if (graph.maxExecutions) engine.setMaxExecutions(graph.maxExecutions);

    const input = { bizItemId: "biz1", orgId: "org1", discoveryType: "I" };
    const result = await engine.run(input, "session-1", "test-api-key", db);

    // coordinator → stage-2-0 순서로 실행됨
    expect(result.nodeOutputs["coordinator"]).toBeDefined();
    expect(result.nodeOutputs["stage-2-0"]).toBeDefined();
    // stage-2-0 이후 stage-2-1, stage-2-2 (병렬) 실행됨
    expect(result.nodeOutputs["stage-2-1"]).toBeDefined();
  });
});
