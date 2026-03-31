/**
 * F256: KG scenario simulation — multi-event cascade + hotspot detection
 */

import type { KgNodeType, KgRelationType, ImpactLevel } from "@foundry-x/shared";
import { KgQueryService, type ImpactNode } from "./kg-query.js";

export interface ScenarioPreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  eventNodeIds: string[];
  category: "petrochemical" | "semiconductor" | "compound";
}

export interface ScenarioInput {
  eventNodeIds: string[];
  decayFactor?: number;
  threshold?: number;
  maxDepth?: number;
}

export interface EventContribution {
  eventId: string;
  eventName: string;
  score: number;
}

export interface HotspotNode {
  id: string;
  type: KgNodeType;
  name: string;
  nameEn?: string;
  combinedScore: number;
  impactLevel: ImpactLevel;
  eventContributions: EventContribution[];
  eventCount: number;
  isHotspot: boolean;
}

export interface ScenarioResult {
  events: Array<{ id: string; name: string; nameEn?: string }>;
  affectedNodes: HotspotNode[];
  hotspots: HotspotNode[];
  totalAffected: number;
  hotspotCount: number;
  byLevel: { high: number; medium: number; low: number };
}

interface NodeRow {
  id: string;
  type: string;
  name: string;
  name_en: string | null;
}

interface EdgeRow {
  target_node_id: string;
  weight: number;
}

const PRESETS: ScenarioPreset[] = [
  {
    id: "preset-petrochem-crisis",
    name: "석유화학 위기",
    nameEn: "Petrochemical Crisis",
    description: "중동 분쟁 + EU 탄소국경조정으로 석유화학 공급 체인 전반에 연쇄 영향",
    eventNodeIds: ["e-mideast", "e-eu-cbam"],
    category: "petrochemical",
  },
  {
    id: "preset-semi-shortage",
    name: "반도체 공급난",
    nameEn: "Semiconductor Shortage",
    description: "일본 수출 규제 + 대만 지진으로 반도체 소재→패키징 체인 동시 차질",
    eventNodeIds: ["e-japan-export", "e-taiwan-eq"],
    category: "semiconductor",
  },
  {
    id: "preset-compound-crisis",
    name: "복합 위기",
    nameEn: "Compound Crisis",
    description: "중동 분쟁 + 일본 수출 규제 + 미중 반도체 규제 동시 발생 시 교차 영향",
    eventNodeIds: ["e-mideast", "e-japan-export", "e-us-china-semi"],
    category: "compound",
  },
];

export class KgScenarioService {
  private queryService: KgQueryService;

  constructor(private db: D1Database) {
    this.queryService = new KgQueryService(db);
  }

  getPresets(): ScenarioPreset[] {
    return PRESETS;
  }

  getPresetById(id: string): ScenarioPreset | null {
    return PRESETS.find((p) => p.id === id) ?? null;
  }

  async simulateScenario(input: ScenarioInput, orgId: string): Promise<ScenarioResult> {
    const decayFactor = input.decayFactor ?? 0.7;
    const threshold = input.threshold ?? 0.1;
    const maxDepth = input.maxDepth ?? 5;

    // Collect event info and their AFFECTED_BY targets
    const events: Array<{ id: string; name: string; nameEn?: string }> = [];
    const eventPropagations: Map<string, { eventId: string; eventName: string; targets: Array<{ nodeId: string; weight: number }> }> = new Map();

    for (const eventId of input.eventNodeIds) {
      const eventNode = await this.db
        .prepare("SELECT id, type, name, name_en FROM kg_nodes WHERE id = ? AND org_id = ?")
        .bind(eventId, orgId)
        .first<NodeRow>();

      if (!eventNode || eventNode.type !== "EVENT") continue;

      events.push({ id: eventNode.id, name: eventNode.name, nameEn: eventNode.name_en ?? undefined });

      // Get AFFECTED_BY edges from this event
      const affectedEdges = await this.db
        .prepare("SELECT target_node_id, weight FROM kg_edges WHERE source_node_id = ? AND org_id = ? AND relation_type = 'AFFECTED_BY'")
        .bind(eventId, orgId)
        .all<EdgeRow>();

      const targets = (affectedEdges.results ?? []).map((e) => ({
        nodeId: e.target_node_id,
        weight: e.weight,
      }));

      eventPropagations.set(eventId, { eventId, eventName: eventNode.name, targets });
    }

    if (events.length === 0) {
      return { events: [], affectedNodes: [], hotspots: [], totalAffected: 0, hotspotCount: 0, byLevel: { high: 0, medium: 0, low: 0 } };
    }

    // Run impact propagation from each event's affected targets using SUPPLIES chain
    const nodeScores: Map<string, Map<string, number>> = new Map(); // nodeId -> (eventId -> score)

    for (const [eventId, propagation] of eventPropagations) {
      for (const target of propagation.targets) {
        // Propagate from the directly affected product node through SUPPLIES
        const result = await this.queryService.propagateImpact(target.nodeId, orgId, {
          decayFactor,
          threshold,
          maxDepth,
          relationTypes: ["SUPPLIES"] as KgRelationType[],
        });

        // Record the directly affected node
        this.addScore(nodeScores, target.nodeId, eventId, target.weight);

        // Record propagated nodes (adjust score by initial weight)
        for (const affected of result.affectedNodes) {
          const adjustedScore = affected.impactScore * target.weight;
          if (adjustedScore >= threshold) {
            this.addScore(nodeScores, affected.id, eventId, adjustedScore);
          }
        }
      }
    }

    // Build hotspot nodes
    const affectedNodes: HotspotNode[] = [];
    const eventNameMap = new Map(events.map((e) => [e.id, e.name]));

    for (const [nodeId, eventScores] of nodeScores) {
      const nodeRow = await this.db
        .prepare("SELECT id, type, name, name_en FROM kg_nodes WHERE id = ? AND org_id = ?")
        .bind(nodeId, orgId)
        .first<NodeRow>();

      if (!nodeRow) continue;

      const contributions: EventContribution[] = [];
      let total = 0;
      for (const [evId, score] of eventScores) {
        contributions.push({
          eventId: evId,
          eventName: eventNameMap.get(evId) ?? evId,
          score: Math.round(score * 1000) / 1000,
        });
        total += score;
      }

      const combinedScore = Math.round(Math.min(1.0, total) * 1000) / 1000;
      const impactLevel: ImpactLevel = combinedScore >= 0.7 ? "HIGH" : combinedScore >= 0.3 ? "MEDIUM" : "LOW";

      affectedNodes.push({
        id: nodeRow.id,
        type: nodeRow.type as KgNodeType,
        name: nodeRow.name,
        nameEn: nodeRow.name_en ?? undefined,
        combinedScore,
        impactLevel,
        eventContributions: contributions.sort((a, b) => b.score - a.score),
        eventCount: eventScores.size,
        isHotspot: eventScores.size >= 2,
      });
    }

    // Sort by combinedScore descending
    affectedNodes.sort((a, b) => b.combinedScore - a.combinedScore);
    const hotspots = affectedNodes.filter((n) => n.isHotspot);

    return {
      events,
      affectedNodes,
      hotspots,
      totalAffected: affectedNodes.length,
      hotspotCount: hotspots.length,
      byLevel: {
        high: affectedNodes.filter((n) => n.impactLevel === "HIGH").length,
        medium: affectedNodes.filter((n) => n.impactLevel === "MEDIUM").length,
        low: affectedNodes.filter((n) => n.impactLevel === "LOW").length,
      },
    };
  }

  private addScore(map: Map<string, Map<string, number>>, nodeId: string, eventId: string, score: number): void {
    if (!map.has(nodeId)) map.set(nodeId, new Map());
    const eventScores = map.get(nodeId)!;
    const existing = eventScores.get(eventId) ?? 0;
    if (score > existing) eventScores.set(eventId, score);
  }
}
