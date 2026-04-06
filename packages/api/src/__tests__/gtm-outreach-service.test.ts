import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { GtmOutreachService } from "../modules/launch/services/gtm-outreach-service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS gtm_customers (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    industry TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_role TEXT,
    company_size TEXT,
    notes TEXT,
    tags TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS offering_packs (
    id TEXT PRIMARY KEY,
    biz_item_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL,
    share_token TEXT,
    share_expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gtm_outreach (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES gtm_customers(id),
    offering_pack_id TEXT REFERENCES offering_packs(id),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK(status IN ('draft', 'proposal_ready', 'sent', 'opened', 'responded', 'meeting_set', 'converted', 'declined', 'archived')),
    proposal_content TEXT,
    proposal_generated_at TEXT,
    sent_at TEXT,
    response_note TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

async function seedCustomer(db: D1Database, id: string, orgId = "org_test") {
  await (db as unknown as { exec: (q: string) => Promise<void> }).exec(
    `INSERT INTO gtm_customers (id, org_id, company_name, created_by) VALUES ('${id}', '${orgId}', 'Test Co', 'u1')`,
  );
}

describe("GtmOutreachService (F299)", () => {
  let db: D1Database;
  let service: GtmOutreachService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    service = new GtmOutreachService(db);
    await seedCustomer(db, "cust-1");
    await seedCustomer(db, "cust-2");
  });

  describe("create()", () => {
    it("creates outreach with draft status", async () => {
      const result = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "KTDS 제안", createdBy: "u1",
      });
      expect(result.status).toBe("draft");
      expect(result.customerId).toBe("cust-1");
    });

    it("creates with offering pack link", async () => {
      const result = await service.create({
        orgId: "org_test", customerId: "cust-1", offeringPackId: "pack-1",
        title: "AI 솔루션 제안", createdBy: "u1",
      });
      expect(result.offeringPackId).toBe("pack-1");
    });
  });

  describe("list()", () => {
    beforeEach(async () => {
      await service.create({ orgId: "org_test", customerId: "cust-1", title: "제안A", createdBy: "u1" });
      await service.create({ orgId: "org_test", customerId: "cust-2", title: "제안B", createdBy: "u1" });
      await service.create({ orgId: "org_other", customerId: "cust-1", title: "다른조직", createdBy: "u2" });
    });

    it("lists by org", async () => {
      const result = await service.list("org_test", { limit: 20, offset: 0 });
      expect(result.total).toBe(2);
    });

    it("filters by customerId", async () => {
      const result = await service.list("org_test", { customerId: "cust-1", limit: 20, offset: 0 });
      expect(result.total).toBe(1);
    });
  });

  describe("getById()", () => {
    it("returns outreach with joined fields", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "테스트", createdBy: "u1",
      });
      const found = await service.getById(created.id, "org_test");
      expect(found).toBeTruthy();
      expect(found!.customerName).toBe("Test Co");
    });
  });

  describe("updateStatus()", () => {
    it("transitions draft → proposal_ready is invalid (use updateProposal)", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "테스트", createdBy: "u1",
      });
      // draft can transition to proposal_ready
      const updated = await service.updateStatus(created.id, "org_test", "proposal_ready");
      expect(updated).toBeTruthy();
    });

    it("rejects invalid transition", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "테스트", createdBy: "u1",
      });
      await expect(
        service.updateStatus(created.id, "org_test", "converted"),
      ).rejects.toThrow("Invalid transition");
    });

    it("sets sent_at when transitioning to sent", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "테스트", createdBy: "u1",
      });
      await service.updateStatus(created.id, "org_test", "proposal_ready");
      const updated = await service.updateStatus(created.id, "org_test", "sent");
      expect(updated!.sentAt).toBeTruthy();
    });

    it("stores response note", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "테스트", createdBy: "u1",
      });
      await service.updateStatus(created.id, "org_test", "declined", "예산 부족");
      const found = await service.getById(created.id, "org_test");
      expect(found!.responseNote).toBe("예산 부족");
    });
  });

  describe("delete()", () => {
    it("deletes draft outreach", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "삭제대상", createdBy: "u1",
      });
      const deleted = await service.delete(created.id, "org_test");
      expect(deleted).toBe(true);
    });

    it("rejects non-draft deletion", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "진행중", createdBy: "u1",
      });
      await service.updateStatus(created.id, "org_test", "proposal_ready");
      await expect(service.delete(created.id, "org_test")).rejects.toThrow("Only draft");
    });
  });

  describe("updateProposal()", () => {
    it("sets proposal content and status", async () => {
      const created = await service.create({
        orgId: "org_test", customerId: "cust-1", title: "제안서", createdBy: "u1",
      });
      const updated = await service.updateProposal(created.id, "org_test", "# 맞춤 제안서");
      expect(updated!.proposalContent).toBe("# 맞춤 제안서");
      expect(updated!.status).toBe("proposal_ready");
      expect(updated!.proposalGeneratedAt).toBeTruthy();
    });
  });

  describe("stats()", () => {
    it("returns status breakdown", async () => {
      await service.create({ orgId: "org_test", customerId: "cust-1", title: "A", createdBy: "u1" });
      await service.create({ orgId: "org_test", customerId: "cust-2", title: "B", createdBy: "u1" });
      const stats = await service.stats("org_test");
      expect(stats.total).toBe(2);
      expect(stats.byStatus.draft).toBe(2);
      expect(stats.conversionRate).toBe(0);
    });
  });
});
