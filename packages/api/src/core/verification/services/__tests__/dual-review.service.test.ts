/**
 * F552 TDD Red Phase — DualReviewService
 * Sprint 303 | FX-REQ-589
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../../../../__tests__/helpers/mock-d1.js";
import { DualReviewService } from "../dual-review.service.js";
import type { DualReviewInsert } from "../../types.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS dual_ai_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id INTEGER NOT NULL,
    claude_verdict TEXT,
    codex_verdict TEXT,
    codex_json TEXT NOT NULL,
    divergence_score REAL DEFAULT 0.0,
    decision TEXT,
    degraded INTEGER DEFAULT 0,
    degraded_reason TEXT,
    model TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_dual_ai_reviews_sprint ON dual_ai_reviews(sprint_id);
`;

const SAMPLE_CODEX_JSON = JSON.stringify({
  verdict: "PASS",
  prd_coverage: { covered: ["FX-REQ-589"], missing: [] },
  phase_exit_checklist: { D1: "PASS", D2: "PASS", D3: "PASS", D4: "PASS" },
  code_issues: [],
  over_engineering: [],
  divergence_score: 0.0,
  model: "codex-cli",
  timestamp: "2026-04-16T12:00:00Z",
  degraded: false,
  summary_ko: "모든 항목 PASS",
});

function makeSample(overrides: Partial<DualReviewInsert> = {}): DualReviewInsert {
  return {
    sprint_id: 303,
    claude_verdict: "PASS",
    codex_verdict: "PASS",
    codex_json: SAMPLE_CODEX_JSON,
    divergence_score: 0.0,
    decision: "PASS",
    degraded: false,
    degraded_reason: null,
    model: "codex-cli",
    ...overrides,
  };
}

describe("F552 DualReviewService", () => {
  let db: D1Database;
  let svc: DualReviewService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    svc = new DualReviewService(db);
  });

  describe("insert()", () => {
    it("inserts a review and returns the id", async () => {
      const result = await svc.insert(makeSample());
      expect(result).toHaveProperty("id");
      expect(result.id).toBeGreaterThan(0);
    });

    it("stores all fields correctly", async () => {
      const data = makeSample({
        sprint_id: 300,
        claude_verdict: "WARN",
        codex_verdict: "BLOCK",
        divergence_score: 0.75,
        decision: "BLOCK",
        degraded: true,
        degraded_reason: "codex_empty_response",
        model: "mock",
      });
      const { id } = await svc.insert(data);
      const rows = await svc.list(1);
      const row = rows.find((r) => r.id === id);
      expect(row).toBeDefined();
      expect(row!.sprint_id).toBe(300);
      expect(row!.claude_verdict).toBe("WARN");
      expect(row!.codex_verdict).toBe("BLOCK");
      expect(row!.divergence_score).toBe(0.75);
      expect(row!.decision).toBe("BLOCK");
      expect(row!.degraded).toBe(true);
      expect(row!.degraded_reason).toBe("codex_empty_response");
      expect(row!.model).toBe("mock");
    });

    it("allows multiple reviews per sprint (append model)", async () => {
      await svc.insert(makeSample({ sprint_id: 303, codex_verdict: "PASS" }));
      await svc.insert(makeSample({ sprint_id: 303, codex_verdict: "BLOCK" }));
      const rows = await svc.list();
      const sprint303 = rows.filter((r) => r.sprint_id === 303);
      expect(sprint303.length).toBe(2);
    });
  });

  describe("list()", () => {
    it("returns empty array when no reviews exist", async () => {
      const rows = await svc.list();
      expect(rows).toEqual([]);
    });

    it("returns reviews ordered by created_at DESC", async () => {
      await svc.insert(makeSample({ sprint_id: 300 }));
      await svc.insert(makeSample({ sprint_id: 301 }));
      await svc.insert(makeSample({ sprint_id: 302 }));
      const rows = await svc.list();
      expect(rows.length).toBe(3);
      expect(rows[0].sprint_id).toBe(302);
    });

    it("respects limit parameter", async () => {
      await svc.insert(makeSample({ sprint_id: 300 }));
      await svc.insert(makeSample({ sprint_id: 301 }));
      await svc.insert(makeSample({ sprint_id: 302 }));
      const rows = await svc.list(2);
      expect(rows.length).toBe(2);
    });
  });

  describe("stats()", () => {
    it("returns zero stats when no reviews exist", async () => {
      const s = await svc.stats();
      expect(s.total).toBe(0);
      expect(s.concordance_rate).toBe(0);
      expect(s.block_rate).toBe(0);
      expect(s.degraded_rate).toBe(0);
      expect(s.block_reasons).toEqual([]);
      expect(s.recent_reviews).toEqual([]);
    });

    it("calculates concordance rate correctly", async () => {
      await svc.insert(makeSample({ sprint_id: 300, claude_verdict: "PASS", codex_verdict: "PASS" }));
      await svc.insert(makeSample({ sprint_id: 301, claude_verdict: "PASS", codex_verdict: "PASS" }));
      await svc.insert(makeSample({ sprint_id: 302, claude_verdict: "PASS", codex_verdict: "PASS" }));
      await svc.insert(makeSample({ sprint_id: 303, claude_verdict: "PASS", codex_verdict: "BLOCK", decision: "BLOCK" }));
      const s = await svc.stats();
      expect(s.total).toBe(4);
      expect(s.concordance_rate).toBe(75);
    });

    it("calculates block rate correctly", async () => {
      await svc.insert(makeSample({ sprint_id: 300, decision: "PASS" }));
      await svc.insert(makeSample({ sprint_id: 301, decision: "BLOCK" }));
      await svc.insert(makeSample({ sprint_id: 302, decision: "PASS" }));
      await svc.insert(makeSample({ sprint_id: 303, decision: "BLOCK" }));
      const s = await svc.stats();
      expect(s.block_rate).toBe(50);
    });

    it("calculates degraded rate correctly", async () => {
      await svc.insert(makeSample({ sprint_id: 300, degraded: false }));
      await svc.insert(makeSample({ sprint_id: 301, degraded: true, degraded_reason: "codex_unavailable" }));
      const s = await svc.stats();
      expect(s.degraded_rate).toBe(50);
    });

    it("extracts block reasons from codex_json code_issues", async () => {
      const jsonWithIssues = JSON.stringify({
        verdict: "BLOCK",
        code_issues: [
          { file: "a.ts", line: 1, severity: "high", msg: "Missing null check" },
          { file: "b.ts", line: 5, severity: "high", msg: "Missing null check" },
          { file: "c.ts", line: 10, severity: "high", msg: "SQL injection risk" },
        ],
      });
      await svc.insert(makeSample({
        sprint_id: 300,
        codex_verdict: "BLOCK",
        decision: "BLOCK",
        codex_json: jsonWithIssues,
      }));
      const s = await svc.stats();
      expect(s.block_reasons.length).toBeGreaterThanOrEqual(1);
      const nullCheck = s.block_reasons.find((r) => r.reason === "Missing null check");
      expect(nullCheck).toBeDefined();
      expect(nullCheck!.count).toBe(2);
    });

    it("includes recent reviews in stats", async () => {
      await svc.insert(makeSample({ sprint_id: 300 }));
      await svc.insert(makeSample({ sprint_id: 301 }));
      const s = await svc.stats();
      expect(s.recent_reviews.length).toBe(2);
      expect(s.recent_reviews[0]).toHaveProperty("sprint_id");
      expect(s.recent_reviews[0]).toHaveProperty("claude_verdict");
      expect(s.recent_reviews[0]).toHaveProperty("codex_verdict");
      expect(s.recent_reviews[0]).toHaveProperty("decision");
      expect(s.recent_reviews[0]).toHaveProperty("divergence_score");
      expect(s.recent_reviews[0]).toHaveProperty("degraded");
      expect(s.recent_reviews[0]).toHaveProperty("created_at");
    });
  });
});
