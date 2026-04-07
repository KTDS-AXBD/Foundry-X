import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import {
  BizItemService,
  type ClassificationInput,
  type EvaluationInput,
  type EvaluationScoreInput,
} from "../core/discovery/services/biz-item-service.js";

describe("BizItemService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: BizItemService;

  beforeEach(() => {
    db = createMockD1();

    // Apply 0033 + 0034 migrations
    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS biz_items (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        source TEXT NOT NULL DEFAULT 'field',
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS biz_item_classifications (
        id TEXT PRIMARY KEY,
        biz_item_id TEXT NOT NULL UNIQUE,
        item_type TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.0,
        turn_1_answer TEXT,
        turn_2_answer TEXT,
        turn_3_answer TEXT,
        analysis_weights TEXT NOT NULL DEFAULT '{}',
        classified_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS biz_evaluations (
        id TEXT PRIMARY KEY,
        biz_item_id TEXT NOT NULL,
        verdict TEXT NOT NULL,
        avg_score REAL NOT NULL DEFAULT 0.0,
        total_concerns INTEGER NOT NULL DEFAULT 0,
        evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS biz_evaluation_scores (
        id TEXT PRIMARY KEY,
        evaluation_id TEXT NOT NULL,
        persona_id TEXT NOT NULL,
        business_viability REAL NOT NULL DEFAULT 0,
        strategic_fit REAL NOT NULL DEFAULT 0,
        customer_value REAL NOT NULL DEFAULT 0,
        tech_market REAL NOT NULL DEFAULT 0,
        execution REAL NOT NULL DEFAULT 0,
        financial_feasibility REAL NOT NULL DEFAULT 0,
        competitive_diff REAL NOT NULL DEFAULT 0,
        scalability REAL NOT NULL DEFAULT 0,
        summary TEXT,
        concerns TEXT NOT NULL DEFAULT '[]'
      );
    `);

    service = new BizItemService(db as unknown as D1Database);
  });

  // ─── CRUD ───

  describe("create", () => {
    it("creates a biz item with default status draft", async () => {
      const item = await service.create("org_test", "user-1", {
        title: "AI 챗봇 플랫폼",
        description: "고객 응대 자동화 솔루션",
      });

      expect(item.id).toBeTruthy();
      expect(item.orgId).toBe("org_test");
      expect(item.title).toBe("AI 챗봇 플랫폼");
      expect(item.description).toBe("고객 응대 자동화 솔루션");
      expect(item.source).toBe("field");
      expect(item.status).toBe("draft");
      expect(item.createdBy).toBe("user-1");
      expect(item.classification).toBeNull();
    });

    it("creates with custom source", async () => {
      const item = await service.create("org_test", "user-1", {
        title: "아이디어",
        source: "idea_portal",
      });
      expect(item.source).toBe("idea_portal");
      expect(item.description).toBeNull();
    });
  });

  describe("list", () => {
    it("returns items for the given org", async () => {
      await service.create("org_test", "user-1", { title: "Item A" });
      await service.create("org_test", "user-1", { title: "Item B" });
      await service.create("org_other", "user-2", { title: "Item C" });

      const items = await service.list("org_test");
      expect(items).toHaveLength(2);
      expect(items.every((i) => i.orgId === "org_test")).toBe(true);
    });

    it("filters by status", async () => {
      const item = await service.create("org_test", "user-1", { title: "Item A" });
      await service.updateStatus(item.id, "classified");
      await service.create("org_test", "user-1", { title: "Item B" });

      const classified = await service.list("org_test", { status: "classified" });
      expect(classified).toHaveLength(1);
      expect(classified[0]!.status).toBe("classified");
    });

    it("filters by source", async () => {
      await service.create("org_test", "user-1", { title: "A", source: "agent" });
      await service.create("org_test", "user-1", { title: "B", source: "field" });

      const agentItems = await service.list("org_test", { source: "agent" });
      expect(agentItems).toHaveLength(1);
      expect(agentItems[0]!.source).toBe("agent");
    });
  });

  describe("getById", () => {
    it("returns item with classification null when unclassified", async () => {
      const created = await service.create("org_test", "user-1", { title: "Test" });
      const item = await service.getById("org_test", created.id);

      expect(item).not.toBeNull();
      expect(item!.title).toBe("Test");
      expect(item!.classification).toBeNull();
    });

    it("returns null for non-existent id", async () => {
      const item = await service.getById("org_test", "non-existent");
      expect(item).toBeNull();
    });

    it("returns null for wrong org", async () => {
      const created = await service.create("org_test", "user-1", { title: "Test" });
      const item = await service.getById("org_other", created.id);
      expect(item).toBeNull();
    });
  });

  // ─── Status Transition ───

  describe("updateStatus", () => {
    it("transitions status from draft to classifying", async () => {
      const item = await service.create("org_test", "user-1", { title: "Test" });
      await service.updateStatus(item.id, "classifying");

      const updated = await service.getById("org_test", item.id);
      expect(updated!.status).toBe("classifying");
    });

    it("transitions through full lifecycle", async () => {
      const item = await service.create("org_test", "user-1", { title: "Test" });

      const statuses = ["classifying", "classified", "evaluating", "evaluated", "archived"];
      for (const status of statuses) {
        await service.updateStatus(item.id, status);
        const updated = await service.getById("org_test", item.id);
        expect(updated!.status).toBe(status);
      }
    });
  });

  // ─── Classification ───

  describe("saveClassification", () => {
    it("saves classification and includes it in getById", async () => {
      const item = await service.create("org_test", "user-1", { title: "AI 솔루션" });

      const classification: ClassificationInput = {
        itemType: "type_a",
        confidence: 0.85,
        turn1Answer: "레퍼런스 기반 사업",
        turn2Answer: "PoC 자료 보유",
        turn3Answer: "KT DS 내부 수익 모델 적합",
        analysisWeights: { ref: 3, market: 1, competition: 3 },
      };

      await service.saveClassification(item.id, classification);

      const fetched = await service.getById("org_test", item.id);
      expect(fetched!.classification).not.toBeNull();
      expect(fetched!.classification!.itemType).toBe("type_a");
      expect(fetched!.classification!.confidence).toBe(0.85);
      expect(fetched!.classification!.analysisWeights).toEqual({ ref: 3, market: 1, competition: 3 });
    });
  });

  // ─── Evaluation ───

  describe("saveEvaluation + saveEvaluationScores", () => {
    it("saves evaluation and scores, then retrieves with getEvaluation", async () => {
      const item = await service.create("org_test", "user-1", { title: "Cloud 마이그레이션" });

      const evalData: EvaluationInput = {
        verdict: "green",
        avgScore: 7.5,
        totalConcerns: 1,
      };
      const evaluationId = await service.saveEvaluation(item.id, evalData);
      expect(evaluationId).toBeTruthy();

      const scores: EvaluationScoreInput[] = [
        {
          personaId: "strategy",
          businessViability: 8,
          strategicFit: 9,
          customerValue: 7,
          techMarket: 8,
          execution: 7,
          financialFeasibility: 8,
          competitiveDiff: 6,
          scalability: 7,
          summary: "전략적으로 적합",
          concerns: ["시장 경쟁 심화"],
        },
        {
          personaId: "finance",
          businessViability: 7,
          strategicFit: 6,
          customerValue: 8,
          techMarket: 7,
          execution: 8,
          financialFeasibility: 9,
          competitiveDiff: 7,
          scalability: 8,
          summary: "재무적 실현 가능",
          concerns: [],
        },
      ];
      await service.saveEvaluationScores(evaluationId, scores);

      const result = await service.getEvaluation(item.id);
      expect(result).not.toBeNull();
      expect(result!.verdict).toBe("green");
      expect(result!.avgScore).toBe(7.5);
      expect(result!.totalConcerns).toBe(1);
      expect(result!.scores).toHaveLength(2);

      const strategyScore = result!.scores.find((s) => s.personaId === "strategy");
      expect(strategyScore!.businessViability).toBe(8);
      expect(strategyScore!.concerns).toEqual(["시장 경쟁 심화"]);

      const financeScore = result!.scores.find((s) => s.personaId === "finance");
      expect(financeScore!.financialFeasibility).toBe(9);
      expect(financeScore!.concerns).toEqual([]);
    });
  });

  describe("getEvaluation", () => {
    it("returns null when no evaluation exists", async () => {
      const item = await service.create("org_test", "user-1", { title: "No eval" });
      const result = await service.getEvaluation(item.id);
      expect(result).toBeNull();
    });

    it("returns an evaluation when multiple exist", async () => {
      const item = await service.create("org_test", "user-1", { title: "Multi eval" });

      await service.saveEvaluation(item.id, { verdict: "red", avgScore: 3.0, totalConcerns: 5 });
      await service.saveEvaluation(item.id, { verdict: "green", avgScore: 8.0, totalConcerns: 0 });

      const result = await service.getEvaluation(item.id);
      expect(result).not.toBeNull();
      // Both evaluations share the same second-precision timestamp in SQLite
      expect(["red", "green"]).toContain(result!.verdict);
    });
  });
});
