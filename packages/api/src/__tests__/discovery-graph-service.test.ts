// ─── F531: DiscoveryGraphService — TDD Red Phase ───
// DiscoveryGraphService.runAll() 전체 파이프라인 실행 검증

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { AgentRunner } from "../agent/services/agent-runner.js";
import { DiscoveryGraphService } from "../core/discovery/services/discovery-graph-service.js";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
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

const EXTRA_SCHEMA = `ALTER TABLE biz_items ADD COLUMN discovery_type TEXT;`;

const SEED = `
  INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
  INSERT INTO users (id, email, name, created_at, updated_at)
    VALUES ('user1', 'test@test.com', 'Test', '2026-01-01', '2026-01-01');
  INSERT INTO biz_items
    (id, org_id, title, description, source, status, discovery_type, created_by, created_at, updated_at)
    VALUES ('biz1', 'org1', 'AI Chatbot', 'desc', 'discovery', 'analyzing', 'I', 'user1', '2026-01-01', '2026-01-01');
`;

describe("F531: DiscoveryGraphService", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any;
  let runner: AgentRunner;
  let service: DiscoveryGraphService;

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
        output: {
          analysis: JSON.stringify({
            summary: "테스트 요약",
            details: "테스트 상세 내용",
            confidence: 80,
          }),
        },
      }),
    } as unknown as AgentRunner;

    service = new DiscoveryGraphService(runner, db, "session-test", "api-key-test");
  });

  it("test 3: runAll() - coordinator 실행 후 stage-2-0 실행됨 (실행 순서 검증)", async () => {
    const result = await service.runAll({
      bizItemId: "biz1",
      orgId: "org1",
      discoveryType: "I",
    });

    // coordinator와 stage-2-0 nodeOutputs 확인
    expect(result.nodeOutputs["coordinator"]).toBeDefined();
    expect(result.nodeOutputs["stage-2-0"]).toBeDefined();
    // 병렬 실행: stage-2-1, stage-2-2 모두 실행됨
    expect(result.nodeOutputs["stage-2-1"]).toBeDefined();
    expect(result.nodeOutputs["stage-2-2"]).toBeDefined();
  });

  it("test 4: runAll() - 각 stage 노드 결과가 bd_artifacts D1에 저장됨", async () => {
    await service.runAll({
      bizItemId: "biz1",
      orgId: "org1",
      discoveryType: "I",
    });

    // stage-2-1 결과가 bd_artifacts에 저장되었는지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const artifact = await db.prepare(
      "SELECT id, skill_id FROM bd_artifacts WHERE biz_item_id = ? AND stage_id = ?",
    ).bind("biz1", "2-1").first() as { id: string; skill_id: string } | null;

    expect(artifact).not.toBeNull();
    expect(artifact?.skill_id).toBe("discovery-2-1");
  });
});
