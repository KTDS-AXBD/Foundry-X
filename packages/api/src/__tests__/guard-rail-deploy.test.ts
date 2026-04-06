// ─── F359: GuardRailDeployService 단위 테스트 (Sprint 162) ───

import { describe, it, expect, beforeEach } from "vitest";
import { GuardRailDeployService, DeployError } from "../services/guard-rail-deploy-service.js";
import { createMockD1 } from "./helpers/mock-d1.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS failure_patterns (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    occurrence_count INTEGER NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    sample_event_ids TEXT,
    sample_payloads TEXT,
    status TEXT NOT NULL DEFAULT 'detected',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_fp_pattern ON failure_patterns(tenant_id, pattern_key);
  CREATE TABLE IF NOT EXISTS guard_rail_proposals (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    pattern_id TEXT NOT NULL,
    rule_content TEXT NOT NULL,
    rule_filename TEXT NOT NULL,
    rationale TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TEXT,
    reviewed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_grp_tenant ON guard_rail_proposals(tenant_id, status);
`;

const SEED_PATTERN = `
  INSERT INTO failure_patterns (id, tenant_id, pattern_key, occurrence_count, first_seen, last_seen, status, created_at, updated_at)
  VALUES ('fp-1', 'org_test', 'hook:error', 5, '2026-03-01', '2026-04-06', 'resolved', datetime('now'), datetime('now'))
`;

function seedProposal(
  id: string,
  status: "pending" | "approved" | "rejected" | "modified",
) {
  return `INSERT INTO guard_rail_proposals (id, tenant_id, pattern_id, rule_content, rule_filename, rationale, llm_model, status, reviewed_at, reviewed_by, created_at)
    VALUES ('${id}', 'org_test', 'fp-1', '# No direct DB in routes\n\nAlways use service layer.', 'auto-guard-001.md', 'Pattern hook:error detected 5 times', 'haiku', '${status}', ${status === "approved" ? "'2026-04-06T10:00:00Z'" : "NULL"}, ${status === "approved" ? "'user-1'" : "NULL"}, datetime('now'))`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("GuardRailDeployService", () => {
  let db: D1Database;
  let svc: GuardRailDeployService;

  beforeEach(async () => {
    const mock = createMockD1();
    await (mock as any).exec(DDL);
    await (mock as any).exec(SEED_PATTERN);
    db = mock as unknown as D1Database;
    svc = new GuardRailDeployService(db);
  });

  describe("generateRuleFile", () => {
    it("approved proposal → 정상 배치 결과", async () => {
      await (db as any).exec(seedProposal("gp-1", "approved"));

      const result = await svc.generateRuleFile("gp-1", "org_test");

      expect(result.filename).toMatch(/^auto-guard-\d{3}\.md$/);
      expect(result.content).toContain("---");
      expect(result.content).toContain("source: auto-generated");
      expect(result.content).toContain("pattern_id: fp-1");
      expect(result.content).toContain("llm_model: haiku");
      expect(result.content).toContain("# No direct DB in routes");
      expect(result.content).toContain("## 근거");
      expect(result.proposalId).toBe("gp-1");
      expect(result.patternId).toBe("fp-1");
    });

    it("pending proposal → DeployError 400", async () => {
      await (db as any).exec(seedProposal("gp-2", "pending"));

      await expect(
        svc.generateRuleFile("gp-2", "org_test"),
      ).rejects.toThrow(DeployError);

      try {
        await svc.generateRuleFile("gp-2", "org_test");
      } catch (err) {
        expect((err as DeployError).statusCode).toBe(400);
      }
    });

    it("rejected proposal → DeployError 400", async () => {
      await (db as any).exec(seedProposal("gp-3", "rejected"));

      await expect(
        svc.generateRuleFile("gp-3", "org_test"),
      ).rejects.toThrow(DeployError);
    });

    it("존재하지 않는 ID → DeployError 404", async () => {
      await expect(
        svc.generateRuleFile("nonexistent", "org_test"),
      ).rejects.toThrow(DeployError);

      try {
        await svc.generateRuleFile("nonexistent", "org_test");
      } catch (err) {
        expect((err as DeployError).statusCode).toBe(404);
      }
    });

    it("파일명 순번 — 이미 1개 approved 존재 시 001", async () => {
      await (db as any).exec(seedProposal("gp-a", "approved"));

      const result = await svc.generateRuleFile("gp-a", "org_test");
      // 1개 approved → nextRuleNumber returns 1
      expect(result.filename).toBe("auto-guard-001.md");
    });

    it("파일명 순번 — 2개 approved 존재 시 002", async () => {
      await (db as any).exec(seedProposal("gp-b1", "approved"));
      await (db as any).exec(
        `INSERT INTO guard_rail_proposals (id, tenant_id, pattern_id, rule_content, rule_filename, rationale, llm_model, status, reviewed_at, created_at)
         VALUES ('gp-b2', 'org_test', 'fp-1', '# Rule 2', 'auto-guard-002.md', 'test', 'haiku', 'approved', '2026-04-06', datetime('now'))`,
      );

      const result = await svc.generateRuleFile("gp-b1", "org_test");
      expect(result.filename).toBe("auto-guard-002.md");
    });

    it("YAML frontmatter에 approved_at 포함", async () => {
      await (db as any).exec(seedProposal("gp-c", "approved"));

      const result = await svc.generateRuleFile("gp-c", "org_test");
      expect(result.content).toContain("approved_at: 2026-04-06T10:00:00Z");
    });
  });
});
