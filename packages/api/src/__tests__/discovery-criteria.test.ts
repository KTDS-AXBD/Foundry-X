import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { DiscoveryCriteriaService, DISCOVERY_CRITERIA } from "../services/discovery-criteria.js";

const TABLES_SQL = `
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
  CREATE TABLE IF NOT EXISTS biz_discovery_criteria (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    criterion_id INTEGER NOT NULL CHECK (criterion_id BETWEEN 1 AND 9),
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'in_progress', 'completed', 'needs_revision')),
    evidence TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE,
    UNIQUE(biz_item_id, criterion_id)
  );
`;

let db: D1Database;

function getDb() {
  const mockDb = createMockD1();
  void mockDb.exec(TABLES_SQL);
  void mockDb.exec("INSERT INTO biz_items (id, org_id, title, created_by) VALUES ('item-1', 'org-1', 'Test Item', 'user-1')");
  return mockDb as unknown as D1Database;
}

describe("DiscoveryCriteriaService (F183)", () => {
  let service: DiscoveryCriteriaService;

  beforeEach(() => {
    db = getDb();
    service = new DiscoveryCriteriaService(db);
  });

  it("DISCOVERY_CRITERIA — 9개 정적 데이터", () => {
    expect(DISCOVERY_CRITERIA).toHaveLength(9);
    expect(DISCOVERY_CRITERIA[0].name).toBe("문제/고객 정의");
    expect(DISCOVERY_CRITERIA[8].name).toBe("검증 실험 계획");
  });

  it("initialize — 9기준 행 생성", async () => {
    await service.initialize("item-1");
    const progress = await service.getAll("item-1");
    expect(progress.criteria).toHaveLength(9);
    expect(progress.pending).toBe(9);
    expect(progress.completed).toBe(0);
    expect(progress.gateStatus).toBe("blocked");
  });

  it("initialize — 멱등 (두 번 호출해도 중복 없음)", async () => {
    await service.initialize("item-1");
    await service.initialize("item-1");
    const progress = await service.getAll("item-1");
    expect(progress.criteria).toHaveLength(9);
  });

  it("getAll — 미초기화 시 빈 배열 with 9 pending", async () => {
    const progress = await service.getAll("item-1");
    expect(progress.criteria).toHaveLength(9);
    expect(progress.pending).toBe(9);
    expect(progress.gateStatus).toBe("blocked");
  });

  it("update — 상태 변경 + evidence", async () => {
    await service.initialize("item-1");
    const updated = await service.update("item-1", 1, {
      status: "completed",
      evidence: "고객 세그먼트 3개 정의 완료",
    });
    expect(updated.status).toBe("completed");
    expect(updated.evidence).toBe("고객 세그먼트 3개 정의 완료");
    expect(updated.completedAt).toBeTruthy();
    expect(updated.name).toBe("문제/고객 정의");
  });

  it("update — in_progress 상태", async () => {
    await service.initialize("item-1");
    const updated = await service.update("item-1", 2, { status: "in_progress" });
    expect(updated.status).toBe("in_progress");
    expect(updated.completedAt).toBeNull();
  });

  it("checkGate — blocked (< 7 completed)", async () => {
    await service.initialize("item-1");
    for (let i = 1; i <= 5; i++) {
      await service.update("item-1", i, { status: "completed", evidence: `근거 ${i}` });
    }
    const gate = await service.checkGate("item-1");
    expect(gate.gateStatus).toBe("blocked");
    expect(gate.completedCount).toBe(5);
    expect(gate.missingCriteria).toHaveLength(4);
  });

  it("checkGate — warning (7-8 completed)", async () => {
    await service.initialize("item-1");
    for (let i = 1; i <= 7; i++) {
      await service.update("item-1", i, { status: "completed", evidence: `근거 ${i}` });
    }
    const gate = await service.checkGate("item-1");
    expect(gate.gateStatus).toBe("warning");
    expect(gate.completedCount).toBe(7);
    expect(gate.missingCriteria).toHaveLength(2);
  });

  it("checkGate — ready (9 completed)", async () => {
    await service.initialize("item-1");
    for (let i = 1; i <= 9; i++) {
      await service.update("item-1", i, { status: "completed", evidence: `근거 ${i}` });
    }
    const gate = await service.checkGate("item-1");
    expect(gate.gateStatus).toBe("ready");
    expect(gate.completedCount).toBe(9);
    expect(gate.missingCriteria).toHaveLength(0);
  });

  it("suggestFromStep — 미완료 기준만 반환", async () => {
    await service.initialize("item-1");
    await service.update("item-1", 1, { status: "completed", evidence: "done" });

    const suggestions = await service.suggestFromStep("item-1", [1, 4]);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.criterionId).toBe(4);
    expect(suggestions[0]!.currentStatus).toBe("pending");
  });

  it("suggestFromStep — 빈 매핑은 빈 배열", async () => {
    await service.initialize("item-1");
    const suggestions = await service.suggestFromStep("item-1", []);
    expect(suggestions).toHaveLength(0);
  });

  it("getAll — criteria에 정적 메타데이터 포함", async () => {
    await service.initialize("item-1");
    const progress = await service.getAll("item-1");
    const first = progress.criteria[0];
    expect(first!.name).toBe("문제/고객 정의");
    expect(first!.condition).toContain("JTBD");
  });
});
