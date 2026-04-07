import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";
import { UsageTrackingService } from "../../modules/billing/services/usage-tracking.service.js";

describe("UsageTrackingService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: UsageTrackingService;
  const ORG_ID = "org_test";

  beforeEach(() => {
    db = createMockD1();
    service = new UsageTrackingService();
  });

  describe("recordCall", () => {
    it("creates a new usage record on first call", async () => {
      await service.recordCall(db as any, ORG_ID);
      const month = service.currentMonth();
      const row = await db.prepare(
        "SELECT api_calls FROM usage_records WHERE org_id = ? AND month = ?"
      ).bind(ORG_ID, month).first<{ api_calls: number }>();
      expect(row?.api_calls).toBe(1);
    });

    it("increments counter on subsequent calls (UPSERT)", async () => {
      await service.recordCall(db as any, ORG_ID);
      await service.recordCall(db as any, ORG_ID);
      await service.recordCall(db as any, ORG_ID);
      const month = service.currentMonth();
      const row = await db.prepare(
        "SELECT api_calls FROM usage_records WHERE org_id = ? AND month = ?"
      ).bind(ORG_ID, month).first<{ api_calls: number }>();
      expect(row?.api_calls).toBe(3);
    });
  });

  describe("getSummary", () => {
    it("returns zero usage for new org (free plan defaults)", async () => {
      const summary = await service.getSummary(db as any, ORG_ID);
      expect(summary.orgId).toBe(ORG_ID);
      expect(summary.used).toBe(0);
      expect(summary.limit).toBe(1000);
      expect(summary.remaining).toBe(1000);
      expect(summary.planId).toBe("free");
    });

    it("reflects recorded calls", async () => {
      await service.recordCall(db as any, ORG_ID);
      await service.recordCall(db as any, ORG_ID);
      const summary = await service.getSummary(db as any, ORG_ID);
      expect(summary.used).toBe(2);
      expect(summary.remaining).toBe(998);
    });

    it("returns unlimited (-1) for enterprise plan", async () => {
      await db.prepare(
        "INSERT OR REPLACE INTO tenant_subscriptions (org_id, plan_id) VALUES (?, 'enterprise')"
      ).bind(ORG_ID).run();
      const summary = await service.getSummary(db as any, ORG_ID);
      expect(summary.limit).toBe(-1);
      expect(summary.remaining).toBe(-1);
      expect(summary.planId).toBe("enterprise");
    });
  });

  describe("isOverLimit", () => {
    it("returns false when under limit", async () => {
      const over = await service.isOverLimit(db as any, ORG_ID);
      expect(over).toBe(false);
    });

    it("returns true when at or over free limit (1000)", async () => {
      // 직접 999 → 1000 경계 테스트
      await db.prepare(
        "INSERT INTO usage_records (org_id, month, api_calls) VALUES (?, ?, 1000)"
      ).bind(ORG_ID, service.currentMonth()).run();
      const over = await service.isOverLimit(db as any, ORG_ID);
      expect(over).toBe(true);
    });

    it("always returns false for enterprise plan (unlimited)", async () => {
      await db.prepare(
        "INSERT OR REPLACE INTO tenant_subscriptions (org_id, plan_id) VALUES (?, 'enterprise')"
      ).bind(ORG_ID).run();
      // 임의로 많은 호출 기록
      await db.prepare(
        "INSERT INTO usage_records (org_id, month, api_calls) VALUES (?, ?, 999999)"
      ).bind(ORG_ID, service.currentMonth()).run();
      const over = await service.isOverLimit(db as any, ORG_ID);
      expect(over).toBe(false);
    });
  });
});
