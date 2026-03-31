import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { HitlReviewService } from "../services/hitl-review-service.js";

const TABLES = `
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, plan TEXT NOT NULL DEFAULT 'free', settings TEXT NOT NULL DEFAULT '{}');
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member', password_hash TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS bd_artifacts (
    id TEXT PRIMARY KEY, org_id TEXT NOT NULL, biz_item_id TEXT NOT NULL,
    skill_id TEXT NOT NULL, stage_id TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    input_text TEXT NOT NULL, output_text TEXT,
    model TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20250714',
    tokens_used INTEGER DEFAULT 0, duration_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS hitl_artifact_reviews (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    artifact_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('approved', 'modified', 'regenerated', 'rejected')),
    reason TEXT,
    modified_content TEXT,
    previous_version TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_hitl_artifact ON hitl_artifact_reviews(artifact_id, created_at);
`;

function seed(db: any) {
  (db as any).exec(`
    INSERT INTO organizations (id, name, slug) VALUES ('org1', 'Test Org', 'test-org');
    INSERT INTO users (id, email, name, created_at, updated_at) VALUES ('user1', 'test@test.com', 'Test User', '2026-01-01', '2026-01-01');
    INSERT INTO bd_artifacts (id, org_id, biz_item_id, skill_id, stage_id, version, input_text, output_text, status, created_by, tokens_used, duration_ms, model)
      VALUES ('art1', 'org1', 'biz1', 'ai-biz:ecosystem-map', '2-1', 1, 'input1', '## Ecosystem Map\nContent here', 'completed', 'user1', 300, 2500, 'claude-haiku-4-5-20250714');
  `);
}

describe("HitlReviewService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: HitlReviewService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    seed(db);
    svc = new HitlReviewService(db as any);
  });

  describe("submitReview", () => {
    it("should approve artifact and record review", async () => {
      const review = await svc.submitReview({
        orgId: "org1",
        artifactId: "art1",
        reviewerId: "user1",
        action: "approved",
      });

      expect(review.action).toBe("approved");
      expect(review.artifactId).toBe("art1");
      expect(review.id).toBeTruthy();

      // Verify artifact status changed
      const row = await (db as any)
        .prepare("SELECT status FROM bd_artifacts WHERE id = ?")
        .bind("art1")
        .first();
      expect(row.status).toBe("approved");
    });

    it("should reject artifact with reason", async () => {
      const review = await svc.submitReview({
        orgId: "org1",
        artifactId: "art1",
        reviewerId: "user1",
        action: "rejected",
        reason: "결과가 부정확해요",
      });

      expect(review.action).toBe("rejected");
      expect(review.reason).toBe("결과가 부정확해요");

      const row = await (db as any)
        .prepare("SELECT status FROM bd_artifacts WHERE id = ?")
        .bind("art1")
        .first();
      expect(row.status).toBe("rejected");
    });

    it("should modify artifact content and approve", async () => {
      const review = await svc.submitReview({
        orgId: "org1",
        artifactId: "art1",
        reviewerId: "user1",
        action: "modified",
        modifiedContent: "## Updated Content\nBetter version",
      });

      expect(review.action).toBe("modified");
      expect(review.previousVersion).toBe("## Ecosystem Map\nContent here");

      const row = await (db as any)
        .prepare("SELECT status, output_text FROM bd_artifacts WHERE id = ?")
        .bind("art1")
        .first();
      expect(row.status).toBe("approved");
      expect(row.output_text).toBe("## Updated Content\nBetter version");
    });

    it("should record regenerated without changing artifact status", async () => {
      const review = await svc.submitReview({
        orgId: "org1",
        artifactId: "art1",
        reviewerId: "user1",
        action: "regenerated",
      });

      expect(review.action).toBe("regenerated");

      // Status should remain completed (caller triggers re-execution)
      const row = await (db as any)
        .prepare("SELECT status FROM bd_artifacts WHERE id = ?")
        .bind("art1")
        .first();
      expect(row.status).toBe("completed");
    });

    it("should throw when artifact not found", async () => {
      await expect(
        svc.submitReview({
          orgId: "org1",
          artifactId: "nonexistent",
          reviewerId: "user1",
          action: "approved",
        }),
      ).rejects.toThrow("Artifact not found");
    });

    it("should throw when artifact belongs to different org", async () => {
      await expect(
        svc.submitReview({
          orgId: "org-other",
          artifactId: "art1",
          reviewerId: "user1",
          action: "approved",
        }),
      ).rejects.toThrow("Artifact not found");
    });
  });

  describe("getHistory", () => {
    it("should return empty array when no reviews", async () => {
      const history = await svc.getHistory("art1");
      expect(history).toEqual([]);
    });

    it("should return reviews in descending order", async () => {
      await svc.submitReview({
        orgId: "org1",
        artifactId: "art1",
        reviewerId: "user1",
        action: "rejected",
        reason: "first attempt",
      });

      // Reset artifact status for second review
      (db as any).exec("UPDATE bd_artifacts SET status = 'completed' WHERE id = 'art1'");

      await svc.submitReview({
        orgId: "org1",
        artifactId: "art1",
        reviewerId: "user1",
        action: "approved",
      });

      const history = await svc.getHistory("art1");
      expect(history).toHaveLength(2);
      expect(history[0]!.action).toBe("approved");
      expect(history[1]!.action).toBe("rejected");
    });
  });
});
