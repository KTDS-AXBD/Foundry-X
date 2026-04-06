import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { EvaluationReportService } from "../modules/gate/services/evaluation-report-service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT ''
  );
  INSERT OR IGNORE INTO organizations (id, name) VALUES ('org_test', 'Test Org');

  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL,
    stage_id TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL DEFAULT '',
    output_text TEXT,
    model TEXT NOT NULL DEFAULT 'test',
    tokens_used INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    created_by TEXT NOT NULL DEFAULT 'user-1',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS evaluation_reports (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    org_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    skill_scores TEXT NOT NULL DEFAULT '{}',
    traffic_light TEXT NOT NULL DEFAULT 'yellow' CHECK(traffic_light IN ('green','yellow','red')),
    traffic_light_history TEXT NOT NULL DEFAULT '[]',
    recommendation TEXT,
    generated_by TEXT NOT NULL DEFAULT 'ai',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );
`;

let seedCounter = 0;
function seedArtifacts(db: D1Database, bizItemId: string, skills: string[]) {
  const exec = (db as unknown as { exec: (q: string) => Promise<void> }).exec.bind(db);
  const promises = skills.map((skillId) => {
    const id = `art-${++seedCounter}`;
    return exec(
      `INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, output_text, status, created_by)
       VALUES ('${id}', 'org_test', '${bizItemId}', '${skillId}', '2-3', '${"A".repeat(600)}', 'completed', 'user-test')`,
    );
  });
  return Promise.all(promises);
}

describe("EvaluationReportService (F296)", () => {
  let db: D1Database;
  let service: EvaluationReportService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    service = new EvaluationReportService(db);
  });

  describe("generate()", () => {
    it("creates a report from biz-item artifacts", async () => {
      await seedArtifacts(db, "biz-1", ["2-1", "2-2", "2-3"]);

      const report = await service.generate("org_test", "user-1", {
        bizItemId: "biz-1",
      });

      expect(report.id).toBeTruthy();
      expect(report.orgId).toBe("org_test");
      expect(report.bizItemId).toBe("biz-1");
      expect(report.generatedBy).toBe("ai");
      expect(Object.keys(report.skillScores)).toHaveLength(3);
      expect(report.skillScores["2-1"]).toMatchObject({
        label: "시장 규모 분석",
      });
      expect(report.trafficLight).toBe("green");
      expect(report.trafficLightHistory).toHaveLength(1);
    });

    it("uses custom title when provided", async () => {
      await seedArtifacts(db, "biz-2", ["2-1"]);

      const report = await service.generate("org_test", "user-1", {
        bizItemId: "biz-2",
        title: "Custom Report Title",
      });

      expect(report.title).toBe("Custom Report Title");
    });

    it("returns red traffic light when no artifacts exist", async () => {
      const report = await service.generate("org_test", "user-1", {
        bizItemId: "biz-empty",
      });

      expect(report.trafficLight).toBe("red");
      expect(Object.keys(report.skillScores)).toHaveLength(0);
    });
  });

  describe("getById()", () => {
    it("returns report by id", async () => {
      await seedArtifacts(db, "biz-1", ["2-1"]);
      const created = await service.generate("org_test", "user-1", {
        bizItemId: "biz-1",
      });

      const found = await service.getById("org_test", created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it("returns null for wrong org", async () => {
      await seedArtifacts(db, "biz-1", ["2-1"]);
      const created = await service.generate("org_test", "user-1", {
        bizItemId: "biz-1",
      });

      const found = await service.getById("other_org", created.id);
      expect(found).toBeNull();
    });

    it("returns null for non-existent id", async () => {
      const found = await service.getById("org_test", "nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("list()", () => {
    it("returns paginated list", async () => {
      await seedArtifacts(db, "biz-1", ["2-1"]);
      await service.generate("org_test", "user-1", { bizItemId: "biz-1" });
      await service.generate("org_test", "user-1", { bizItemId: "biz-1" });

      const result = await service.list("org_test", { limit: 20, offset: 0 });
      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(2);
    });

    it("filters by bizItemId", async () => {
      await seedArtifacts(db, "biz-1", ["2-1"]);
      await seedArtifacts(db, "biz-2", ["2-2"]);
      await service.generate("org_test", "user-1", { bizItemId: "biz-1" });
      await service.generate("org_test", "user-1", { bizItemId: "biz-2" });

      const result = await service.list("org_test", {
        bizItemId: "biz-1",
        limit: 20,
        offset: 0,
      });
      expect(result.total).toBe(1);
      expect(result.items[0]!.bizItemId).toBe("biz-1");
    });

    it("respects pagination", async () => {
      await seedArtifacts(db, "biz-1", ["2-1"]);
      await service.generate("org_test", "user-1", { bizItemId: "biz-1" });
      await service.generate("org_test", "user-1", { bizItemId: "biz-1" });
      await service.generate("org_test", "user-1", { bizItemId: "biz-1" });

      const page = await service.list("org_test", { limit: 2, offset: 0 });
      expect(page.items).toHaveLength(2);
      expect(page.total).toBe(3);
    });

    it("isolates by org", async () => {
      await seedArtifacts(db, "biz-1", ["2-1"]);
      await service.generate("org_test", "user-1", { bizItemId: "biz-1" });

      const result = await service.list("other_org", { limit: 20, offset: 0 });
      expect(result.total).toBe(0);
    });
  });
});
