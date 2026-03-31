import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { KgScenarioService } from "../services/kg-scenario.js";
import { KgSeedService } from "../services/kg-seed.js";

const KG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS kg_nodes (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    description TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_kg_nodes_org ON kg_nodes(org_id);
  CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes(org_id, type);

  CREATE TABLE IF NOT EXISTS kg_edges (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    label TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON kg_edges(org_id, source_node_id);
  CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON kg_edges(org_id, target_node_id);

  CREATE TABLE IF NOT EXISTS kg_properties (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL DEFAULT 'string',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_props_unique ON kg_properties(entity_type, entity_id, key);
`;

const ORG_ID = "org_test";

describe("KgScenarioService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: KgScenarioService;

  beforeEach(async () => {
    db = createMockD1();
    (db as any).exec(KG_SCHEMA);
    service = new KgScenarioService(db as unknown as D1Database);

    // Seed sample data
    const seeder = new KgSeedService(db as unknown as D1Database);
    await seeder.seedAll(ORG_ID);
  });

  // ── Presets ──

  describe("getPresets", () => {
    it("returns 3 preset scenarios", () => {
      const presets = service.getPresets();
      expect(presets).toHaveLength(3);
      expect(presets.map((p) => p.id)).toEqual([
        "preset-petrochem-crisis",
        "preset-semi-shortage",
        "preset-compound-crisis",
      ]);
    });
  });

  describe("getPresetById", () => {
    it("returns preset by ID", () => {
      const preset = service.getPresetById("preset-petrochem-crisis");
      expect(preset).not.toBeNull();
      expect(preset!.name).toBe("석유화학 위기");
      expect(preset!.eventNodeIds).toEqual(["e-mideast", "e-eu-cbam"]);
    });

    it("returns null for unknown ID", () => {
      expect(service.getPresetById("unknown")).toBeNull();
    });
  });

  // ── Simulation ──

  describe("simulateScenario", () => {
    it("propagates single event through supply chain", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["e-mideast"] },
        ORG_ID
      );

      expect(result.events).toHaveLength(1);
      expect(result.events[0]!.name).toBe("중동 분쟁");
      expect(result.totalAffected).toBeGreaterThan(0);
      // Crude oil should be directly affected
      const crudeOil = result.affectedNodes.find((n) => n.id === "p-crude-oil");
      expect(crudeOil).toBeDefined();
      expect(crudeOil!.combinedScore).toBeGreaterThan(0.5);
    });

    it("merges multiple events and identifies hotspots", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["e-mideast", "e-eu-cbam"] },
        ORG_ID
      );

      expect(result.events).toHaveLength(2);
      expect(result.hotspotCount).toBeGreaterThanOrEqual(0);

      // PE is affected by both mideast (through crude→naphtha→ethylene→PE)
      // and EU CBAM (directly)
      const pe = result.affectedNodes.find((n) => n.id === "p-pe");
      if (pe) {
        expect(pe.eventContributions.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("caps combinedScore at 1.0", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["e-mideast", "e-eu-cbam", "e-japan-export"] },
        ORG_ID
      );

      for (const node of result.affectedNodes) {
        expect(node.combinedScore).toBeLessThanOrEqual(1.0);
        expect(node.combinedScore).toBeGreaterThan(0);
      }
    });

    it("runs compound crisis preset with 3 events", async () => {
      const preset = service.getPresetById("preset-compound-crisis")!;
      const result = await service.simulateScenario(
        { eventNodeIds: preset.eventNodeIds },
        ORG_ID
      );

      expect(result.events).toHaveLength(3);
      expect(result.totalAffected).toBeGreaterThan(0);
      expect(result.byLevel.high + result.byLevel.medium + result.byLevel.low).toBe(result.totalAffected);
    });

    it("marks hotspot nodes correctly", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["e-japan-export", "e-taiwan-eq"] },
        ORG_ID
      );

      // Both events affect semiconductor chain — die should be hotspot
      for (const hotspot of result.hotspots) {
        expect(hotspot.isHotspot).toBe(true);
        expect(hotspot.eventCount).toBeGreaterThanOrEqual(2);
        expect(hotspot.eventContributions.length).toBeGreaterThanOrEqual(2);
      }

      // All hotspots should also be in affectedNodes
      for (const hs of result.hotspots) {
        expect(result.affectedNodes.find((n) => n.id === hs.id)).toBeDefined();
      }
    });

    it("includes eventContributions breakdown", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["e-mideast", "e-japan-export"] },
        ORG_ID
      );

      for (const node of result.affectedNodes) {
        expect(node.eventContributions.length).toBeGreaterThanOrEqual(1);
        for (const contrib of node.eventContributions) {
          expect(contrib.eventId).toBeTruthy();
          expect(contrib.eventName).toBeTruthy();
          expect(contrib.score).toBeGreaterThan(0);
        }
      }
    });

    it("respects decayFactor option", async () => {
      const highDecay = await service.simulateScenario(
        { eventNodeIds: ["e-mideast"], decayFactor: 0.9 },
        ORG_ID
      );
      const lowDecay = await service.simulateScenario(
        { eventNodeIds: ["e-mideast"], decayFactor: 0.3 },
        ORG_ID
      );

      // Higher decay = more nodes affected (scores stay above threshold longer)
      expect(highDecay.totalAffected).toBeGreaterThanOrEqual(lowDecay.totalAffected);
    });

    it("respects threshold option", async () => {
      const lowThreshold = await service.simulateScenario(
        { eventNodeIds: ["e-mideast"], threshold: 0.01 },
        ORG_ID
      );
      const highThreshold = await service.simulateScenario(
        { eventNodeIds: ["e-mideast"], threshold: 0.5 },
        ORG_ID
      );

      expect(lowThreshold.totalAffected).toBeGreaterThanOrEqual(highThreshold.totalAffected);
    });

    it("returns empty result for non-existent event IDs", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["non-existent-event"] },
        ORG_ID
      );

      expect(result.events).toHaveLength(0);
      expect(result.totalAffected).toBe(0);
    });

    it("skips non-EVENT type nodes", async () => {
      // p-crude-oil is PRODUCT, not EVENT — should be skipped
      const result = await service.simulateScenario(
        { eventNodeIds: ["p-crude-oil"] },
        ORG_ID
      );

      expect(result.events).toHaveLength(0);
      expect(result.totalAffected).toBe(0);
    });

    it("sorts affectedNodes by combinedScore descending", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["e-mideast", "e-japan-export"] },
        ORG_ID
      );

      for (let i = 1; i < result.affectedNodes.length; i++) {
        expect(result.affectedNodes[i - 1]!.combinedScore)
          .toBeGreaterThanOrEqual(result.affectedNodes[i]!.combinedScore);
      }
    });

    it("byLevel counts match total affected", async () => {
      const result = await service.simulateScenario(
        { eventNodeIds: ["e-mideast", "e-japan-export", "e-taiwan-eq"] },
        ORG_ID
      );

      const levelSum = result.byLevel.high + result.byLevel.medium + result.byLevel.low;
      expect(levelSum).toBe(result.totalAffected);
    });
  });
});
