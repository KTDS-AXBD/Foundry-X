import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { SignalValuationService, DEFAULT_SIGNAL_VALUATIONS } from "../services/signal-valuation.js";

const TABLES = `
CREATE TABLE IF NOT EXISTS roi_signal_valuations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK(signal_type IN ('go', 'pivot', 'drop')),
  value_usd REAL NOT NULL DEFAULT 0 CHECK(value_usd >= 0),
  description TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, signal_type)
);

CREATE TABLE IF NOT EXISTS ax_viability_checkpoints (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('go', 'pivot', 'drop')),
  question TEXT NOT NULL,
  reason TEXT,
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, stage)
);
`;

describe("SignalValuationService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: SignalValuationService;

  beforeEach(() => {
    db = createMockD1();
    (db as any).exec(TABLES);
    svc = new SignalValuationService(db as any);
  });

  describe("getValuations", () => {
    it("should return defaults when no settings exist", async () => {
      const vals = await svc.getValuations("org_test");
      expect(vals.length).toBe(3);

      const go = vals.find((v) => v.signalType === "go");
      expect(go?.valueUsd).toBe(DEFAULT_SIGNAL_VALUATIONS.go);

      const pivot = vals.find((v) => v.signalType === "pivot");
      expect(pivot?.valueUsd).toBe(DEFAULT_SIGNAL_VALUATIONS.pivot);

      const drop = vals.find((v) => v.signalType === "drop");
      expect(drop?.valueUsd).toBe(DEFAULT_SIGNAL_VALUATIONS.drop);
    });

    it("should return custom settings", async () => {
      (db as any).exec(`
        INSERT INTO roi_signal_valuations (id, tenant_id, signal_type, value_usd, description, updated_by)
        VALUES ('v1', 'org_test', 'go', 75000, 'Custom Go', 'admin')
      `);

      const vals = await svc.getValuations("org_test");
      const go = vals.find((v) => v.signalType === "go");
      expect(go?.valueUsd).toBe(75000);
      expect(go?.description).toBe("Custom Go");

      // Others should still be defaults
      const pivot = vals.find((v) => v.signalType === "pivot");
      expect(pivot?.valueUsd).toBe(DEFAULT_SIGNAL_VALUATIONS.pivot);
    });
  });

  describe("updateValuations", () => {
    it("should insert new valuations", async () => {
      const result = await svc.updateValuations("org_test", {
        valuations: [
          { signalType: "go", valueUsd: 80000, description: "Higher Go value" },
        ],
      }, "admin");

      const go = result.find((v) => v.signalType === "go");
      expect(go?.valueUsd).toBe(80000);
      expect(go?.updatedBy).toBe("admin");
    });

    it("should upsert existing valuations", async () => {
      // First insert
      await svc.updateValuations("org_test", {
        valuations: [{ signalType: "go", valueUsd: 50000 }],
      }, "admin");

      // Update
      const result = await svc.updateValuations("org_test", {
        valuations: [{ signalType: "go", valueUsd: 100000, description: "Doubled" }],
      }, "admin2");

      const go = result.find((v) => v.signalType === "go");
      expect(go?.valueUsd).toBe(100000);
      expect(go?.updatedBy).toBe("admin2");
      expect(go?.description).toBe("Doubled");
    });

    it("should handle partial update (only go)", async () => {
      await svc.updateValuations("org_test", {
        valuations: [
          { signalType: "go", valueUsd: 60000 },
          { signalType: "pivot", valueUsd: 15000 },
        ],
      }, "admin");

      // Only update go
      const result = await svc.updateValuations("org_test", {
        valuations: [{ signalType: "go", valueUsd: 90000 }],
      }, "admin");

      const go = result.find((v) => v.signalType === "go");
      expect(go?.valueUsd).toBe(90000);

      // pivot should remain unchanged
      const pivot = result.find((v) => v.signalType === "pivot");
      expect(pivot?.valueUsd).toBe(15000);
    });
  });

  describe("calculatePortfolioValue", () => {
    it("should compute portfolio value from viability checkpoints", async () => {
      // Insert checkpoints
      (db as any).exec(`
        INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by)
        VALUES
          ('cp1', 'biz1', 'org_test', '2-1', 'go', 'Q1', 'user1'),
          ('cp2', 'biz2', 'org_test', '2-1', 'go', 'Q1', 'user1'),
          ('cp3', 'biz3', 'org_test', '2-1', 'pivot', 'Q1', 'user1'),
          ('cp4', 'biz4', 'org_test', '2-1', 'drop', 'Q1', 'user1')
      `);

      const result = await svc.calculatePortfolioValue("org_test");
      expect(result.go).toBe(100000); // 2 × $50K
      expect(result.pivot).toBe(10000); // 1 × $10K
      expect(result.drop).toBe(0);
      expect(result.total).toBe(110000);
    });

    it("should return zero for no checkpoints", async () => {
      const result = await svc.calculatePortfolioValue("org_test");
      expect(result.total).toBe(0);
    });

    it("should use custom valuation rates", async () => {
      // Set custom rates
      await svc.updateValuations("org_test", {
        valuations: [{ signalType: "go", valueUsd: 100000 }],
      }, "admin");

      // Insert checkpoint
      (db as any).exec(`
        INSERT INTO ax_viability_checkpoints (id, biz_item_id, org_id, stage, decision, question, decided_by)
        VALUES ('cp1', 'biz1', 'org_test', '2-1', 'go', 'Q1', 'user1')
      `);

      const result = await svc.calculatePortfolioValue("org_test");
      expect(result.go).toBe(100000); // 1 × $100K
    });
  });
});
