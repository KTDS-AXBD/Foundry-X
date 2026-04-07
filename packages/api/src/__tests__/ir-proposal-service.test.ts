import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { IrProposalService } from "../core/collection/services/ir-proposal-service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS biz_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    description TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'active',
    created_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'REGISTERED',
    entered_at TEXT NOT NULL DEFAULT (datetime('now')),
    exited_at TEXT,
    entered_by TEXT NOT NULL,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS ir_proposals (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    rationale TEXT,
    expected_impact TEXT,
    status TEXT NOT NULL DEFAULT 'submitted',
    submitted_by TEXT NOT NULL,
    reviewed_by TEXT,
    review_comment TEXT,
    biz_item_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    type TEXT NOT NULL,
    biz_item_id TEXT,
    title TEXT NOT NULL,
    body TEXT,
    actor_id TEXT,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

describe("IrProposalService (F240)", () => {
  let db: D1Database;
  let service: IrProposalService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    service = new IrProposalService(db);
  });

  describe("submit()", () => {
    it("creates proposal with submitted status", async () => {
      const proposal = await service.submit({
        orgId: "org_test",
        title: "New AI Tool Opportunity",
        description: "Found a gap in the AI tooling market",
        category: "technology",
        submittedBy: "user-1",
      });

      expect(proposal.status).toBe("submitted");
      expect(proposal.title).toBe("New AI Tool Opportunity");
      expect(proposal.reviewedBy).toBeNull();
      expect(proposal.bizItemId).toBeNull();
    });
  });

  describe("list()", () => {
    it("returns proposals for org", async () => {
      await service.submit({ orgId: "org_test", title: "Prop A", description: "Desc A", category: "tech", submittedBy: "user-1" });
      await service.submit({ orgId: "org_test", title: "Prop B", description: "Desc B", category: "market", submittedBy: "user-2" });

      const proposals = await service.list("org_test");
      expect(proposals).toHaveLength(2);
    });

    it("filters by status", async () => {
      const p1 = await service.submit({ orgId: "org_test", title: "Prop A", description: "Desc A", category: "tech", submittedBy: "user-1" });
      await service.approve(p1.id, "org_test", { reviewedBy: "reviewer-1" });
      await service.submit({ orgId: "org_test", title: "Prop B", description: "Desc B", category: "market", submittedBy: "user-2" });

      const submitted = await service.list("org_test", { status: "submitted" });
      const approved = await service.list("org_test", { status: "approved" });

      expect(submitted).toHaveLength(1);
      expect(approved).toHaveLength(1);
    });

    it("filters by category", async () => {
      await service.submit({ orgId: "org_test", title: "Tech Prop", description: "Desc", category: "technology", submittedBy: "user-1" });
      await service.submit({ orgId: "org_test", title: "Market Prop", description: "Desc", category: "market", submittedBy: "user-1" });

      const techProps = await service.list("org_test", { category: "technology" });
      expect(techProps).toHaveLength(1);
      expect(techProps[0]!.category).toBe("technology");
    });
  });

  describe("getById()", () => {
    it("returns proposal by id", async () => {
      const proposal = await service.submit({
        orgId: "org_test",
        title: "Test Proposal",
        description: "Description",
        category: "tech",
        submittedBy: "user-1",
      });

      const found = await service.getById(proposal.id, "org_test");
      expect(found).not.toBeNull();
      expect(found!.id).toBe(proposal.id);
    });

    it("returns null for unknown id", async () => {
      const result = await service.getById("nonexistent", "org_test");
      expect(result).toBeNull();
    });
  });

  describe("approve()", () => {
    it("changes status to approved and creates biz_item + pipeline_stage", async () => {
      const proposal = await service.submit({
        orgId: "org_test",
        title: "Good Idea",
        description: "Very promising opportunity",
        category: "technology",
        submittedBy: "user-1",
      });

      const result = await service.approve(proposal.id, "org_test", {
        reviewedBy: "reviewer-1",
        comment: "Looks promising",
      });

      expect(result.proposal.status).toBe("approved");
      expect(result.proposal.reviewedBy).toBe("reviewer-1");
      expect(result.bizItemId).toBeTruthy();

      // Verify biz_item was created
      const bizItem = await (db as unknown as { prepare: (q: string) => { bind: (...v: unknown[]) => { first: <T>() => Promise<T | null> } } })
        .prepare(`SELECT id, source FROM biz_items WHERE id = ?`)
        .bind(result.bizItemId)
        .first<{ id: string; source: string }>();
      expect(bizItem).not.toBeNull();
      expect(bizItem!.source).toBe("ir_channel");

      // Verify pipeline_stage was created
      const stage = await (db as unknown as { prepare: (q: string) => { bind: (...v: unknown[]) => { first: <T>() => Promise<T | null> } } })
        .prepare(`SELECT stage FROM pipeline_stages WHERE biz_item_id = ?`)
        .bind(result.bizItemId)
        .first<{ stage: string }>();
      expect(stage?.stage).toBe("REGISTERED");
    });

    it("throws for already-reviewed proposal", async () => {
      const proposal = await service.submit({
        orgId: "org_test",
        title: "Proposal",
        description: "Desc",
        category: "tech",
        submittedBy: "user-1",
      });

      await service.approve(proposal.id, "org_test", { reviewedBy: "reviewer-1" });

      await expect(
        service.approve(proposal.id, "org_test", { reviewedBy: "reviewer-2" }),
      ).rejects.toThrow(/already reviewed/);
    });
  });

  describe("reject()", () => {
    it("changes status to rejected and records comment", async () => {
      const proposal = await service.submit({
        orgId: "org_test",
        title: "Weak Idea",
        description: "Not enough market data",
        category: "market",
        submittedBy: "user-1",
      });

      const rejected = await service.reject(proposal.id, "org_test", {
        reviewedBy: "reviewer-1",
        comment: "Insufficient data",
      });

      expect(rejected.status).toBe("rejected");
      expect(rejected.reviewedBy).toBe("reviewer-1");
      expect(rejected.reviewComment).toBe("Insufficient data");
    });

    it("throws for already-reviewed proposal", async () => {
      const proposal = await service.submit({
        orgId: "org_test",
        title: "Proposal",
        description: "Desc",
        category: "tech",
        submittedBy: "user-1",
      });

      await service.reject(proposal.id, "org_test", { reviewedBy: "reviewer-1" });

      await expect(
        service.reject(proposal.id, "org_test", { reviewedBy: "reviewer-2" }),
      ).rejects.toThrow(/already reviewed/);
    });
  });
});
