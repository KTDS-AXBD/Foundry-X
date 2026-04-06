/**
 * F383: OfferingMetricsService Tests (Sprint 174)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OfferingMetricsService } from "../services/offering-metrics-service.js";

const TABLES = `
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  biz_item_id TEXT,
  artifact_id TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_by TEXT NOT NULL,
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

describe("OfferingMetricsService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: OfferingMetricsService;

  beforeEach(() => {
    db = createMockD1();
    (db as Any).exec(TABLES);
    svc = new OfferingMetricsService(db as Any);
  });

  describe("recordEvent", () => {
    it("should record an offering event in skill_executions", async () => {
      const result = await svc.recordEvent("org_test", {
        offeringId: "off-1",
        bizItemId: "biz-1",
        eventType: "created",
        durationMs: 5000,
      }, "user-1");

      expect(result.id).toMatch(/^oe_/);

      // Verify via event history
      const events = await svc.getEventHistory("org_test", "off-1");
      expect(events).toHaveLength(1);
      expect(events[0]!.eventType).toBe("created");
      expect(events[0]!.durationMs).toBe(5000);
    });

    it("should record event with metadata", async () => {
      const result = await svc.recordEvent("org_test", {
        offeringId: "off-1",
        eventType: "exported",
        durationMs: 3000,
        metadata: { format: "pptx", slides: 12 },
      }, "user-1");

      expect(result.id).toMatch(/^oe_/);
      const events = await svc.getEventHistory("org_test", "off-1");
      expect(events).toHaveLength(1);
      expect(events[0]!.metadata).toContain("pptx");
    });
  });

  describe("getSummary", () => {
    beforeEach(async () => {
      // Seed multiple offering events
      await svc.recordEvent("org_test", { offeringId: "off-1", eventType: "created", durationMs: 5000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-2", eventType: "created", durationMs: 7000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-1", eventType: "exported", durationMs: 2000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-1", eventType: "validated", durationMs: 10000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-1", eventType: "prototype_generated", durationMs: 8000 }, "u1");
    });

    it("should return aggregated metrics", async () => {
      const summary = await svc.getSummary("org_test", { days: 30 });

      expect(summary.totalCreated).toBe(2);
      expect(summary.totalExported).toBe(1);
      expect(summary.totalValidated).toBe(1);
      expect(summary.totalPrototypes).toBe(1);
      expect(summary.avgCreationTimeMs).toBe(6000); // (5000 + 7000) / 2
      expect(summary.avgExportTimeMs).toBe(2000);
      expect(summary.period.days).toBe(30);
    });

    it("should filter by bizItemId", async () => {
      await svc.recordEvent("org_test", { offeringId: "off-3", bizItemId: "biz-99", eventType: "created", durationMs: 3000 }, "u1");

      const summary = await svc.getSummary("org_test", { days: 30, bizItemId: "biz-99" });
      expect(summary.totalCreated).toBe(1);
    });
  });

  describe("getEventHistory", () => {
    it("should return events for a specific offering", async () => {
      await svc.recordEvent("org_test", { offeringId: "off-1", eventType: "created", durationMs: 5000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-1", eventType: "exported", durationMs: 2000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-2", eventType: "created", durationMs: 3000 }, "u1");

      const events = await svc.getEventHistory("org_test", "off-1");
      expect(events).toHaveLength(2);
      const types = events.map((e) => e.eventType).sort();
      expect(types).toEqual(["created", "exported"]);
    });
  });

  describe("calculateOfferingSavings", () => {
    it("should calculate savings based on manual vs auto time", async () => {
      // Create 3 offerings with avg 30 min (1,800,000ms) each
      await svc.recordEvent("org_test", { offeringId: "off-1", eventType: "created", durationMs: 1_800_000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-2", eventType: "created", durationMs: 1_800_000 }, "u1");
      await svc.recordEvent("org_test", { offeringId: "off-3", eventType: "created", durationMs: 1_800_000 }, "u1");

      const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const savings = await svc.calculateOfferingSavings("org_test", cutoff);

      // Manual: 4h = 14,400,000ms. Auto: 1,800,000ms. Saved: 12,600,000ms = 3.5h
      // Per offering: 3.5h × $50 = $175. 3 offerings = $525
      expect(savings).toBe(525);
    });

    it("should return 0 when no offerings", async () => {
      const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
      const savings = await svc.calculateOfferingSavings("org_test", cutoff);
      expect(savings).toBe(0);
    });
  });
});
