import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { SkillMetricsService } from "../core/agent/services/skill-metrics.js";

const TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  max_tokens INTEGER NOT NULL DEFAULT 4096,
  changelog TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, skill_id, version)
);

CREATE TABLE IF NOT EXISTS skill_lineage (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL,
  child_skill_id TEXT NOT NULL,
  derivation_type TEXT NOT NULL DEFAULT 'manual',
  description TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

describe("SkillMetricsService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: SkillMetricsService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    svc = new SkillMetricsService(db as any);
  });

  describe("recordExecution", () => {
    it("should record execution and return id", async () => {
      const result = await svc.recordExecution({
        tenantId: "org_test",
        skillId: "cost-model",
        version: 1,
        bizItemId: "biz1",
        artifactId: "art1",
        model: "claude-haiku-4-5-20251001",
        status: "completed",
        inputTokens: 500,
        outputTokens: 1500,
        costUsd: 0.0064,
        durationMs: 3200,
        executedBy: "user1",
      });

      expect(result.id).toMatch(/^se_/);

      // DB에 기록 확인
      const row = await (db as any)
        .prepare("SELECT * FROM skill_executions WHERE id = ?")
        .bind(result.id)
        .first();
      expect(row.skill_id).toBe("cost-model");
      expect(row.status).toBe("completed");
      expect(row.input_tokens).toBe(500);
    });

    it("should also create audit log entry", async () => {
      const result = await svc.recordExecution({
        tenantId: "org_test",
        skillId: "cost-model",
        version: 1,
        model: "claude-haiku-4-5-20251001",
        status: "completed",
        inputTokens: 500,
        outputTokens: 1500,
        costUsd: 0.0064,
        durationMs: 3200,
        executedBy: "user1",
      });

      const audit = await (db as any)
        .prepare("SELECT * FROM skill_audit_log WHERE entity_id = ?")
        .bind(result.id)
        .first();
      expect(audit.action).toBe("executed");
      expect(audit.entity_type).toBe("execution");
    });

    it("should handle failed executions", async () => {
      const result = await svc.recordExecution({
        tenantId: "org_test",
        skillId: "cost-model",
        version: 1,
        model: "claude-haiku-4-5-20251001",
        status: "failed",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        durationMs: 100,
        executedBy: "user1",
        errorMessage: "API error",
      });

      const row = await (db as any)
        .prepare("SELECT * FROM skill_executions WHERE id = ?")
        .bind(result.id)
        .first();
      expect(row.status).toBe("failed");
      expect(row.error_message).toBe("API error");
    });
  });

  describe("getSkillMetricsSummary", () => {
    beforeEach(async () => {
      // Seed 3 executions for cost-model, 1 for feasibility
      for (let i = 0; i < 3; i++) {
        await svc.recordExecution({
          tenantId: "org_test",
          skillId: "cost-model",
          version: 1,
          model: "claude-haiku-4-5-20251001",
          status: i < 2 ? "completed" : "failed",
          inputTokens: 500,
          outputTokens: 1500,
          costUsd: 0.0064,
          durationMs: 3000 + i * 100,
          executedBy: "user1",
        });
      }
      await svc.recordExecution({
        tenantId: "org_test",
        skillId: "feasibility-study",
        version: 1,
        model: "claude-haiku-4-5-20251001",
        status: "completed",
        inputTokens: 800,
        outputTokens: 2000,
        costUsd: 0.0086,
        durationMs: 4500,
        executedBy: "user1",
      });
    });

    it("should return summary grouped by skill_id", async () => {
      const result = await svc.getSkillMetricsSummary("org_test");
      expect(result.length).toBe(2);

      const costModel = result.find((r) => r.skillId === "cost-model");
      expect(costModel).toBeDefined();
      expect(costModel!.totalExecutions).toBe(3);
      expect(costModel!.successCount).toBe(2);
      expect(costModel!.failedCount).toBe(1);
      expect(costModel!.successRate).toBe(67);
    });

    it("should filter by status", async () => {
      const result = await svc.getSkillMetricsSummary("org_test", { status: "completed" });
      const costModel = result.find((r) => r.skillId === "cost-model");
      expect(costModel!.totalExecutions).toBe(2);
    });

    it("should isolate by tenant", async () => {
      const result = await svc.getSkillMetricsSummary("other_org");
      expect(result.length).toBe(0);
    });
  });

  describe("getSkillDetailMetrics", () => {
    it("should return detail with recent executions and cost trend", async () => {
      await svc.recordExecution({
        tenantId: "org_test",
        skillId: "cost-model",
        version: 1,
        model: "claude-haiku-4-5-20251001",
        status: "completed",
        inputTokens: 500,
        outputTokens: 1500,
        costUsd: 0.0064,
        durationMs: 3200,
        executedBy: "user1",
      });

      const detail = await svc.getSkillDetailMetrics("org_test", "cost-model");
      expect(detail.skillId).toBe("cost-model");
      expect(detail.totalExecutions).toBe(1);
      expect(detail.recentExecutions.length).toBe(1);
      expect(detail.recentExecutions[0]!.status).toBe("completed");
    });
  });

  describe("registerVersion", () => {
    it("should register a version and create audit log", async () => {
      const result = await svc.registerVersion({
        tenantId: "org_test",
        skillId: "cost-model",
        version: 1,
        promptHash: "abc123",
        model: "claude-haiku-4-5-20251001",
        maxTokens: 4096,
        changelog: "Initial version",
        createdBy: "user1",
      });

      expect(result.id).toMatch(/^sv_/);

      const versions = await svc.getSkillVersions("org_test", "cost-model");
      expect(versions.length).toBe(1);
      expect(versions[0]!.promptHash).toBe("abc123");
    });
  });

  describe("getSkillLineage", () => {
    it("should return lineage tree", async () => {
      // Seed lineage
      await (db as any)
        .prepare(
          "INSERT INTO skill_lineage (id, tenant_id, parent_skill_id, child_skill_id, derivation_type, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind("lin1", "org_test", "cost-model", "cost-model-v2", "derived", "user1")
        .run();

      const lineage = await svc.getSkillLineage("org_test", "cost-model");
      expect(lineage.skillId).toBe("cost-model");
      expect(lineage.children.length).toBe(1);
      expect(lineage.children[0]!.skillId).toBe("cost-model-v2");
      expect(lineage.children[0]!.derivationType).toBe("derived");
    });
  });

  describe("getAuditLog", () => {
    it("should return audit entries", async () => {
      await svc.logAudit({
        tenantId: "org_test",
        entityType: "skill",
        entityId: "cost-model",
        action: "created",
        actorId: "user1",
        details: "Initial creation",
      });

      const entries = await svc.getAuditLog("org_test");
      expect(entries.length).toBe(1);
      expect(entries[0]!.action).toBe("created");
      expect(entries[0]!.entityType).toBe("skill");
    });

    it("should filter by entityType", async () => {
      await svc.logAudit({
        tenantId: "org_test",
        entityType: "skill",
        entityId: "cost-model",
        action: "created",
        actorId: "user1",
      });
      await svc.logAudit({
        tenantId: "org_test",
        entityType: "version",
        entityId: "sv1",
        action: "versioned",
        actorId: "user1",
      });

      const skillOnly = await svc.getAuditLog("org_test", { entityType: "skill" });
      expect(skillOnly.length).toBe(1);
    });

    it("should respect limit and offset", async () => {
      for (let i = 0; i < 5; i++) {
        await svc.logAudit({
          tenantId: "org_test",
          entityType: "skill",
          entityId: `s${i}`,
          action: "created",
          actorId: "user1",
        });
      }

      const page1 = await svc.getAuditLog("org_test", { limit: 2, offset: 0 });
      expect(page1.length).toBe(2);

      const page2 = await svc.getAuditLog("org_test", { limit: 2, offset: 2 });
      expect(page2.length).toBe(2);
    });
  });
});
