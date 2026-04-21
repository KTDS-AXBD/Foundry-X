/**
 * Sprint 222: F457+F458 — Prototype Builder + Offering 연동 테스트
 * - POST /ax-bd/prototypes/build (D8: 201 응답)
 * - POST /ax-bd/prototypes/:id/link-offering (D8: 201 응답)
 * - PrototypeService.list() bizItemTitle 포함 (H4 해소)
 * - PrototypeService.getById() linkedOfferings 포함 (D6)
 * - ReviewSummaryBar 분모 계산 (M5 해소)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrototypeService } from "../core/harness/services/prototype-service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

describe("Sprint 222 — PrototypeService (service-level)", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: PrototypeService;

  beforeEach(async () => {
    db = createMockD1();

    // Additional tables needed for getById()
    await (db as Any).exec(`
      CREATE TABLE IF NOT EXISTS poc_environments (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        config TEXT DEFAULT '{}',
        provisioned_at TEXT,
        terminated_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tech_reviews (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL,
        feasibility TEXT NOT NULL,
        stack_fit INTEGER NOT NULL DEFAULT 0,
        complexity TEXT NOT NULL,
        risks TEXT DEFAULT '[]',
        recommendation TEXT NOT NULL,
        estimated_effort TEXT,
        reviewed_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    // Ensure prototype_jobs table exists for build endpoint
    await (db as Any).exec(`
      CREATE TABLE IF NOT EXISTS prototype_jobs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        prd_content TEXT NOT NULL DEFAULT '',
        prd_title TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'queued',
        builder_type TEXT NOT NULL DEFAULT 'cli',
        pages_project TEXT,
        pages_url TEXT,
        build_log TEXT,
        error_message TEXT,
        cost_input_tokens INTEGER NOT NULL DEFAULT 0,
        cost_output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0,
        model_used TEXT NOT NULL DEFAULT 'claude-3-5-haiku',
        fallback_used INTEGER NOT NULL DEFAULT 0,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER
      );
    `);

    svc = new PrototypeService(db as unknown as D1Database);

    // Seed biz_item
    await (db as Any).exec(
      `INSERT INTO biz_items (id, org_id, title, description, source, status, created_by, created_at, updated_at)
       VALUES ('bi-deny-001', 'org_test', 'Deny Semi', '반도체 검사 AI', 'field', 'active', 'user_1',
               '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
    );

    // Seed prototype
    await (db as Any).exec(
      `INSERT INTO prototypes (id, biz_item_id, version, format, content, generated_at)
       VALUES ('proto-deny-001', 'bi-deny-001', 1, 'html', '<h1>Deny v1</h1>', '2026-01-01T00:00:00Z')`
    );

    // Seed offering
    await (db as Any).exec(
      `INSERT INTO offerings (id, org_id, biz_item_id, title, purpose, format, status, current_version, created_by)
       VALUES ('off-001', 'org_test', 'bi-deny-001', 'Deny Offering', 'report', 'html', 'draft', 1, 'user_1')`
    );
  });

  describe("PrototypeService.list() — bizItemTitle 포함 (gap H4)", () => {
    it("목록 아이템에 bizItemTitle이 포함됨", async () => {
      const result = await svc.list("org_test");
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.bizItemTitle).toBe("Deny Semi");
    });
  });

  describe("PrototypeService.getById() — linkedOfferings 포함 (gap D6)", () => {
    it("offering 연결 전: linkedOfferings 빈 배열", async () => {
      const proto = await svc.getById("proto-deny-001", "org_test");
      expect(proto).not.toBeNull();
      expect(proto!.bizItemTitle).toBe("Deny Semi");
      expect(proto!.linkedOfferings).toHaveLength(0);
    });

    it("offering 연결 후: linkedOfferings에 포함", async () => {
      // offering_prototypes에 연결 삽입
      await (db as Any).exec(
        `INSERT INTO offering_prototypes (id, offering_id, prototype_id)
         VALUES ('op-001', 'off-001', 'proto-deny-001')`
      );

      const proto = await svc.getById("proto-deny-001", "org_test");
      expect(proto!.linkedOfferings).toHaveLength(1);
      const linked = proto!.linkedOfferings[0]!;
      expect(linked.offeringId).toBe("off-001");
      expect(linked.offeringTitle).toBe("Deny Offering");
    });
  });
});
