/**
 * F383: BD ROI + Offering Integration Tests (Sprint 174)
 * BdRoiCalculatorService에 offering savings가 반영되는지 검증
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { OfferingMetricsService } from "../services/offering-metrics-service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

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

describe("BD ROI + Offering Integration", () => {
  let svc: OfferingMetricsService;

  beforeEach(() => {
    const db = createMockD1();
    (db as Any).exec(TABLES);
    svc = new OfferingMetricsService(db as Any);
  });

  it("calculateOfferingSavings returns savings proportional to offering count", async () => {
    // 5 offerings, each 30 min auto (vs 4h manual)
    for (let i = 0; i < 5; i++) {
      await svc.recordEvent("org_test", {
        offeringId: `off-${i}`,
        eventType: "created",
        durationMs: 1_800_000, // 30 min
      }, "user-1");
    }

    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const savings = await svc.calculateOfferingSavings("org_test", cutoff);

    // Per offering: (4h - 0.5h) × $50 = $175
    // 5 offerings = $875
    expect(savings).toBe(875);
  });

  it("savings are 0 when auto time exceeds manual time", async () => {
    // Auto takes longer than manual (edge case)
    await svc.recordEvent("org_test", {
      offeringId: "off-1",
      eventType: "created",
      durationMs: 20_000_000, // ~5.5 hours (> 4h manual)
    }, "user-1");

    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const savings = await svc.calculateOfferingSavings("org_test", cutoff);

    expect(savings).toBe(0);
  });

  it("only counts org-specific events", async () => {
    await svc.recordEvent("org_a", { offeringId: "off-1", eventType: "created", durationMs: 1_800_000 }, "u1");
    await svc.recordEvent("org_b", { offeringId: "off-2", eventType: "created", durationMs: 1_800_000 }, "u1");

    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const savingsA = await svc.calculateOfferingSavings("org_a", cutoff);
    const savingsB = await svc.calculateOfferingSavings("org_b", cutoff);

    expect(savingsA).toBe(175); // 1 offering
    expect(savingsB).toBe(175); // 1 offering
  });
});
