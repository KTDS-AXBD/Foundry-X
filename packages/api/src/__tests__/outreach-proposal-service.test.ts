import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OutreachProposalService } from "../modules/launch/services/outreach-proposal-service.js";
import { GtmCustomerService } from "../modules/launch/services/gtm-customer-service.js";
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
  CREATE TABLE IF NOT EXISTS offering_pack_items (
    id TEXT PRIMARY KEY,
    pack_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS gtm_outreach (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    offering_pack_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    proposal_content TEXT,
    proposal_generated_at TEXT,
    sent_at TEXT,
    response_note TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

describe("OutreachProposalService (F299)", () => {
  let db: D1Database;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;

    // Seed customer
    const custSvc = new GtmCustomerService(db);
    await custSvc.create({
      orgId: "org_test", companyName: "KTDS", industry: "IT",
      companySize: "enterprise", contactRole: "팀장", createdBy: "u1",
    });

    // Seed offering pack
    await (mockDb as unknown as { exec: (q: string) => Promise<void> }).exec(
      `INSERT INTO offering_packs (id, biz_item_id, org_id, title, created_by) VALUES ('pack-1', 'biz-1', 'org_test', 'AI 솔루션 패키지', 'u1')`,
    );
    await (mockDb as unknown as { exec: (q: string) => Promise<void> }).exec(
      `INSERT INTO offering_pack_items (id, pack_id, item_type, title, content, sort_order) VALUES ('item-1', 'pack-1', 'proposal', 'AI 도입 제안', '생산성 30% 향상 기대', 0)`,
    );
  });

  it("generates extractive fallback proposal (no AI)", async () => {
    const custSvc = new GtmCustomerService(db);
    const customers = await custSvc.list("org_test", { limit: 1, offset: 0 });
    const customerId = customers.items[0]!.id;

    const outreachSvc = new GtmOutreachService(db);
    const outreach = await outreachSvc.create({
      orgId: "org_test", customerId, offeringPackId: "pack-1",
      title: "KTDS AI 제안", createdBy: "u1",
    });

    const proposalSvc = new OutreachProposalService(db); // no AI
    const content = await proposalSvc.generate(outreach.id, "org_test");

    expect(content).toContain("KTDS");
    expect(content).toContain("AI 솔루션 패키지");
    expect(content).toContain("IT");

    // Verify outreach was updated
    const updated = await outreachSvc.getById(outreach.id, "org_test");
    expect(updated!.status).toBe("proposal_ready");
    expect(updated!.proposalContent).toBe(content);
  });

  it("throws when no offering pack linked", async () => {
    const custSvc = new GtmCustomerService(db);
    const customers = await custSvc.list("org_test", { limit: 1, offset: 0 });

    const outreachSvc = new GtmOutreachService(db);
    const outreach = await outreachSvc.create({
      orgId: "org_test", customerId: customers.items[0]!.id,
      title: "No Pack", createdBy: "u1",
    });

    const proposalSvc = new OutreachProposalService(db);
    await expect(proposalSvc.generate(outreach.id, "org_test")).rejects.toThrow("No offering pack linked");
  });

  it("throws when outreach not found", async () => {
    const proposalSvc = new OutreachProposalService(db);
    await expect(proposalSvc.generate("nonexistent", "org_test")).rejects.toThrow("Outreach not found");
  });
});
