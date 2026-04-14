/**
 * F535: GraphSessionService TDD Red Phase
 * Sprint 288
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { GraphSessionService } from "../core/discovery/services/graph-session-service.js";

const GRAPH_SCHEMA = `
  CREATE TABLE IF NOT EXISTS graph_sessions (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    discovery_type TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    error_msg TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_graph_sessions_biz_item ON graph_sessions(biz_item_id, started_at DESC);
`;

const SEED = `
  INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
  INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
    VALUES ('biz1', 'org1', 'AI Chatbot', 'desc', 'discovery', 'analyzing', 'user1', '2026-01-01', '2026-01-01');
`;

// F535: GraphSessionService 단위 테스트
describe("F535: GraphSessionService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: GraphSessionService;

  beforeEach(() => {
    db = createMockD1();
    db.exec(GRAPH_SCHEMA);
    db.exec(SEED);
    service = new GraphSessionService(db as unknown as D1Database);
  });

  it("createSession() — DB에 running 상태로 저장됨", async () => {
    await service.createSession("biz1", "org1", "graph-biz1-001", "I");

    const row = await (db as unknown as D1Database)
      .prepare("SELECT * FROM graph_sessions WHERE id = ?")
      .bind("graph-biz1-001")
      .first<{ id: string; status: string; biz_item_id: string; discovery_type: string }>();

    expect(row).not.toBeNull();
    expect(row!.status).toBe("running");
    expect(row!.biz_item_id).toBe("biz1");
    expect(row!.discovery_type).toBe("I");
  });

  it("updateStatus(completed) — completedAt 기록됨", async () => {
    await service.createSession("biz1", "org1", "graph-biz1-002");
    await service.updateStatus("graph-biz1-002", "completed");

    const row = await (db as unknown as D1Database)
      .prepare("SELECT status, completed_at FROM graph_sessions WHERE id = ?")
      .bind("graph-biz1-002")
      .first<{ status: string; completed_at: string | null }>();

    expect(row!.status).toBe("completed");
    expect(row!.completed_at).not.toBeNull();
  });

  it("updateStatus(failed, msg) — errorMsg 저장됨", async () => {
    await service.createSession("biz1", "org1", "graph-biz1-003");
    await service.updateStatus("graph-biz1-003", "failed", "Graph engine timeout");

    const row = await (db as unknown as D1Database)
      .prepare("SELECT status, error_msg FROM graph_sessions WHERE id = ?")
      .bind("graph-biz1-003")
      .first<{ status: string; error_msg: string | null }>();

    expect(row!.status).toBe("failed");
    expect(row!.error_msg).toBe("Graph engine timeout");
  });

  it("listSessions() — bizItemId로 필터링, 최신순", async () => {
    await service.createSession("biz1", "org1", "graph-biz1-t1");
    await service.createSession("biz1", "org1", "graph-biz1-t2");

    const sessions = await service.listSessions("biz1", "org1");

    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.every((s) => s.bizItemId === "biz1")).toBe(true);
  });

  it("getLatest() — 가장 최근 session 반환", async () => {
    await service.createSession("biz1", "org1", "graph-biz1-old");
    await service.createSession("biz1", "org1", "graph-biz1-new");
    await service.updateStatus("graph-biz1-new", "completed");

    const latest = await service.getLatest("biz1", "org1");

    expect(latest).not.toBeNull();
    expect(latest!.id).toBe("graph-biz1-new");
  });

  it("listSessions() — 없으면 빈 배열", async () => {
    const sessions = await service.listSessions("no-such-item", "org1");
    expect(sessions).toEqual([]);
  });
});
