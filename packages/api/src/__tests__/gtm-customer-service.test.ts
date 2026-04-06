import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { GtmCustomerService } from "../modules/launch/services/gtm-customer-service.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS gtm_customers (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    industry TEXT,
    contact_name TEXT,
    contact_email TEXT,
    contact_role TEXT,
    company_size TEXT CHECK(company_size IN ('startup', 'smb', 'mid', 'enterprise')),
    notes TEXT,
    tags TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

describe("GtmCustomerService (F299)", () => {
  let db: D1Database;
  let service: GtmCustomerService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    db = mockDb as unknown as D1Database;
    service = new GtmCustomerService(db);
  });

  describe("create()", () => {
    it("creates a customer with all fields", async () => {
      const result = await service.create({
        orgId: "org_test", companyName: "KTDS", industry: "IT",
        contactName: "김담당", contactEmail: "kim@ktds.co.kr",
        contactRole: "부장", companySize: "enterprise",
        notes: "핵심 고객", tags: "IT,대기업", createdBy: "user-1",
      });
      expect(result.id).toBeTruthy();
      expect(result.companyName).toBe("KTDS");
      expect(result.industry).toBe("IT");
      expect(result.companySize).toBe("enterprise");
    });

    it("creates a customer with minimal fields", async () => {
      const result = await service.create({
        orgId: "org_test", companyName: "스타트업", createdBy: "user-1",
      });
      expect(result.companyName).toBe("스타트업");
      expect(result.industry).toBeNull();
      expect(result.companySize).toBeNull();
    });
  });

  describe("list()", () => {
    beforeEach(async () => {
      await service.create({ orgId: "org_test", companyName: "KTDS", industry: "IT", companySize: "enterprise", createdBy: "u1" });
      await service.create({ orgId: "org_test", companyName: "삼성SDS", industry: "IT", companySize: "enterprise", createdBy: "u1" });
      await service.create({ orgId: "org_test", companyName: "네이버", industry: "Platform", companySize: "mid", createdBy: "u1" });
      await service.create({ orgId: "org_other", companyName: "다른조직", createdBy: "u2" });
    });

    it("lists customers by org", async () => {
      const result = await service.list("org_test", { limit: 20, offset: 0 });
      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(3);
    });

    it("filters by industry", async () => {
      const result = await service.list("org_test", { industry: "IT", limit: 20, offset: 0 });
      expect(result.total).toBe(2);
    });

    it("filters by companySize", async () => {
      const result = await service.list("org_test", { companySize: "mid", limit: 20, offset: 0 });
      expect(result.total).toBe(1);
      expect(result.items[0]!.companyName).toBe("네이버");
    });

    it("searches by company name", async () => {
      const result = await service.list("org_test", { search: "KTDS", limit: 20, offset: 0 });
      expect(result.total).toBe(1);
    });

    it("paginates correctly", async () => {
      const result = await service.list("org_test", { limit: 2, offset: 0 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe("getById()", () => {
    it("returns customer by id", async () => {
      const created = await service.create({ orgId: "org_test", companyName: "테스트사", createdBy: "u1" });
      const found = await service.getById(created.id, "org_test");
      expect(found).toBeTruthy();
      expect(found!.companyName).toBe("테스트사");
    });

    it("returns null for wrong org", async () => {
      const created = await service.create({ orgId: "org_test", companyName: "테스트사", createdBy: "u1" });
      const found = await service.getById(created.id, "org_other");
      expect(found).toBeNull();
    });
  });

  describe("update()", () => {
    it("updates specified fields only", async () => {
      const created = await service.create({ orgId: "org_test", companyName: "원래이름", industry: "IT", createdBy: "u1" });
      const updated = await service.update(created.id, "org_test", { companyName: "새이름" });
      expect(updated!.companyName).toBe("새이름");
      expect(updated!.industry).toBe("IT");
    });

    it("returns null for nonexistent", async () => {
      const result = await service.update("nonexistent", "org_test", { companyName: "X" });
      expect(result).toBeNull();
    });
  });
});
