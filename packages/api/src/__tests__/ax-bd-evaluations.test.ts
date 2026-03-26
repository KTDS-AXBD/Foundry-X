import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { EvaluationService } from "../services/evaluation-service.js";
import { KpiService, calculateAchievement } from "../services/kpi-service.js";

describe("EvaluationService", () => {
  let db: ReturnType<typeof createMockD1>;
  let service: EvaluationService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS ax_evaluations (
        id          TEXT PRIMARY KEY,
        org_id      TEXT NOT NULL,
        idea_id     TEXT,
        bmc_id      TEXT,
        title       TEXT NOT NULL,
        description TEXT,
        owner_id    TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'draft'
                    CHECK(status IN ('draft', 'active', 'go', 'kill', 'hold')),
        decision_reason TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_eval_org ON ax_evaluations(org_id);
      CREATE INDEX IF NOT EXISTS idx_eval_status ON ax_evaluations(org_id, status);
      CREATE INDEX IF NOT EXISTS idx_eval_idea ON ax_evaluations(idea_id);

      CREATE TABLE IF NOT EXISTS ax_kpis (
        id          TEXT PRIMARY KEY,
        eval_id     TEXT NOT NULL REFERENCES ax_evaluations(id),
        name        TEXT NOT NULL,
        category    TEXT NOT NULL CHECK(category IN ('market', 'tech', 'revenue', 'risk', 'custom')),
        target      REAL NOT NULL,
        actual      REAL,
        unit        TEXT NOT NULL DEFAULT '%',
        updated_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_kpi_eval ON ax_kpis(eval_id);

      CREATE TABLE IF NOT EXISTS ax_evaluation_history (
        id          TEXT PRIMARY KEY,
        eval_id     TEXT NOT NULL REFERENCES ax_evaluations(id),
        actor_id    TEXT NOT NULL,
        action      TEXT NOT NULL,
        from_status TEXT,
        to_status   TEXT,
        reason      TEXT,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_eval_history ON ax_evaluation_history(eval_id);
    `);

    service = new EvaluationService(db as unknown as D1Database);
  });

  // ─── CREATE ───

  describe("create", () => {
    it("creates an evaluation with draft status", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Test Eval" });

      expect(eval1.id).toBeTruthy();
      expect(eval1.title).toBe("Test Eval");
      expect(eval1.orgId).toBe("org_1");
      expect(eval1.ownerId).toBe("user_1");
      expect(eval1.status).toBe("draft");
      expect(eval1.ideaId).toBeNull();
      expect(eval1.bmcId).toBeNull();
      expect(eval1.description).toBeNull();
      expect(eval1.decisionReason).toBeNull();
      expect(eval1.createdAt).toBeGreaterThan(0);
      expect(eval1.updatedAt).toBeGreaterThan(0);
    });

    it("creates an evaluation linked to idea and BMC", async () => {
      const eval1 = await service.create("org_1", "user_1", {
        title: "Linked Eval",
        description: "With links",
        ideaId: "idea_123",
        bmcId: "bmc_456",
      });

      expect(eval1.ideaId).toBe("idea_123");
      expect(eval1.bmcId).toBe("bmc_456");
      expect(eval1.description).toBe("With links");
    });
  });

  // ─── LIST ───

  describe("list", () => {
    it("returns paginated list for org", async () => {
      await service.create("org_1", "user_1", { title: "Eval A" });
      await service.create("org_1", "user_1", { title: "Eval B" });
      await service.create("org_2", "user_2", { title: "Other Org" });

      const result = await service.list("org_1");

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("filters by status", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Draft" });
      await service.create("org_1", "user_1", { title: "Also Draft" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active");

      const result = await service.list("org_1", { status: "active" });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.title).toBe("Draft");
      expect(result.total).toBe(1);
    });

    it("supports pagination with limit and offset", async () => {
      for (let i = 0; i < 5; i++) {
        await service.create("org_1", "user_1", { title: `Eval ${i}` });
      }

      const page1 = await service.list("org_1", { limit: 2, offset: 0 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await service.list("org_1", { limit: 2, offset: 2 });
      expect(page2.items).toHaveLength(2);

      const page3 = await service.list("org_1", { limit: 2, offset: 4 });
      expect(page3.items).toHaveLength(1);
    });
  });

  // ─── GET BY ID ───

  describe("getById", () => {
    it("returns evaluation by id and org", async () => {
      const created = await service.create("org_1", "user_1", { title: "Detail" });
      const found = await service.getById(created.id, "org_1");

      expect(found).not.toBeNull();
      expect(found!.title).toBe("Detail");
    });

    it("returns null for non-existent id", async () => {
      const found = await service.getById("nonexistent", "org_1");
      expect(found).toBeNull();
    });

    it("returns null for wrong org", async () => {
      const created = await service.create("org_1", "user_1", { title: "Private" });
      const found = await service.getById(created.id, "org_2");
      expect(found).toBeNull();
    });
  });

  // ─── UPDATE STATUS ───

  describe("updateStatus", () => {
    it("transitions draft → active", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Go Active" });
      const updated = await service.updateStatus(eval1.id, "org_1", "user_1", "active", "Ready to evaluate");

      expect(updated.status).toBe("active");
      expect(updated.decisionReason).toBe("Ready to evaluate");
    });

    it("transitions active → go", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Go!" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active");
      const updated = await service.updateStatus(eval1.id, "org_1", "user_1", "go", "Market validated");

      expect(updated.status).toBe("go");
    });

    it("transitions active → kill", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Kill" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active");
      const updated = await service.updateStatus(eval1.id, "org_1", "user_1", "kill", "No market fit");

      expect(updated.status).toBe("kill");
    });

    it("transitions active → hold", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Hold" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active");
      const updated = await service.updateStatus(eval1.id, "org_1", "user_1", "hold", "Need more data");

      expect(updated.status).toBe("hold");
    });

    it("transitions hold → active", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Resume" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active");
      await service.updateStatus(eval1.id, "org_1", "user_1", "hold");
      const updated = await service.updateStatus(eval1.id, "org_1", "user_1", "active");

      expect(updated.status).toBe("active");
    });

    it("throws on invalid transition: draft → go", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Invalid" });

      await expect(
        service.updateStatus(eval1.id, "org_1", "user_1", "go"),
      ).rejects.toThrow("Invalid status transition");
    });

    it("throws on invalid transition: draft → kill", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Invalid" });

      await expect(
        service.updateStatus(eval1.id, "org_1", "user_1", "kill"),
      ).rejects.toThrow("Invalid status transition");
    });

    it("throws when evaluation not found", async () => {
      await expect(
        service.updateStatus("nonexistent", "org_1", "user_1", "active"),
      ).rejects.toThrow("Evaluation not found");
    });

    it("records history entry on status change", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "History" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active", "Starting");

      const history = await service.getHistory(eval1.id, "org_1");

      expect(history).toHaveLength(1);
      expect(history[0]!.action).toBe("status_change");
      expect(history[0]!.fromStatus).toBe("draft");
      expect(history[0]!.toStatus).toBe("active");
      expect(history[0]!.reason).toBe("Starting");
      expect(history[0]!.actorId).toBe("user_1");
    });
  });

  // ─── GET HISTORY ───

  describe("getHistory", () => {
    it("returns empty for eval with no history", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "No History" });
      const history = await service.getHistory(eval1.id, "org_1");
      expect(history).toHaveLength(0);
    });

    it("returns multiple history entries", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Multi" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active");
      await service.updateStatus(eval1.id, "org_1", "user_1", "go");

      const history = await service.getHistory(eval1.id, "org_1");

      expect(history).toHaveLength(2);
      const statuses = history.map((h) => h.toStatus);
      expect(statuses).toContain("go");
      expect(statuses).toContain("active");
    });

    it("returns empty for wrong org", async () => {
      const eval1 = await service.create("org_1", "user_1", { title: "Private" });
      await service.updateStatus(eval1.id, "org_1", "user_1", "active");

      const history = await service.getHistory(eval1.id, "org_2");
      expect(history).toHaveLength(0);
    });
  });

  // ─── GET PORTFOLIO ───

  describe("getPortfolio", () => {
    it("returns empty portfolio for org with no evaluations", async () => {
      const portfolio = await service.getPortfolio("org_empty");

      expect(portfolio.total).toBe(0);
      expect(portfolio.byStatus).toEqual({});
      expect(portfolio.recentChanges).toHaveLength(0);
    });

    it("returns correct status counts", async () => {
      const e1 = await service.create("org_1", "user_1", { title: "Draft 1" });
      await service.create("org_1", "user_1", { title: "Draft 2" });
      await service.updateStatus(e1.id, "org_1", "user_1", "active");

      const portfolio = await service.getPortfolio("org_1");

      expect(portfolio.total).toBe(2);
      expect(portfolio.byStatus.draft).toBe(1);
      expect(portfolio.byStatus.active).toBe(1);
    });

    it("includes recent history changes", async () => {
      const e1 = await service.create("org_1", "user_1", { title: "Tracked" });
      await service.updateStatus(e1.id, "org_1", "user_1", "active");

      const portfolio = await service.getPortfolio("org_1");
      expect(portfolio.recentChanges).toHaveLength(1);
      expect(portfolio.recentChanges[0]!.action).toBe("status_change");
    });
  });
});

describe("KpiService", () => {
  let db: ReturnType<typeof createMockD1>;
  let evalService: EvaluationService;
  let kpiService: KpiService;

  beforeEach(() => {
    db = createMockD1();

    (db as any).exec(`
      CREATE TABLE IF NOT EXISTS ax_evaluations (
        id TEXT PRIMARY KEY, org_id TEXT NOT NULL, idea_id TEXT, bmc_id TEXT,
        title TEXT NOT NULL, description TEXT, owner_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft', decision_reason TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ax_kpis (
        id TEXT PRIMARY KEY, eval_id TEXT NOT NULL REFERENCES ax_evaluations(id),
        name TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('market', 'tech', 'revenue', 'risk', 'custom')),
        target REAL NOT NULL, actual REAL, unit TEXT NOT NULL DEFAULT '%',
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ax_evaluation_history (
        id TEXT PRIMARY KEY, eval_id TEXT NOT NULL, actor_id TEXT NOT NULL,
        action TEXT NOT NULL, from_status TEXT, to_status TEXT,
        reason TEXT, created_at INTEGER NOT NULL
      );
    `);

    evalService = new EvaluationService(db as unknown as D1Database);
    kpiService = new KpiService(db as unknown as D1Database);
  });

  describe("create", () => {
    it("creates a KPI with default unit", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Eval" });
      const kpi = await kpiService.create(eval1.id, {
        name: "Market Size",
        category: "market",
        target: 80,
      });

      expect(kpi.id).toBeTruthy();
      expect(kpi.evalId).toBe(eval1.id);
      expect(kpi.name).toBe("Market Size");
      expect(kpi.category).toBe("market");
      expect(kpi.target).toBe(80);
      expect(kpi.actual).toBeNull();
      expect(kpi.unit).toBe("%");
      expect(kpi.achievement).toBeNull();
    });

    it("creates a KPI with custom unit", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Eval" });
      const kpi = await kpiService.create(eval1.id, {
        name: "Revenue",
        category: "revenue",
        target: 1000000,
        unit: "USD",
      });

      expect(kpi.unit).toBe("USD");
    });
  });

  describe("listByEval", () => {
    it("returns KPIs for evaluation", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Eval" });
      await kpiService.create(eval1.id, { name: "KPI 1", category: "market", target: 50 });
      await kpiService.create(eval1.id, { name: "KPI 2", category: "tech", target: 90 });

      const kpis = await kpiService.listByEval(eval1.id);

      expect(kpis).toHaveLength(2);
    });

    it("returns empty for eval with no KPIs", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Empty" });
      const kpis = await kpiService.listByEval(eval1.id);
      expect(kpis).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("updates actual value and calculates achievement", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Eval" });
      const kpi = await kpiService.create(eval1.id, { name: "Score", category: "tech", target: 100 });

      const updated = await kpiService.update(kpi.id, eval1.id, { actual: 75 });

      expect(updated.actual).toBe(75);
      expect(updated.achievement).toBe(75);
    });

    it("updates target value", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Eval" });
      const kpi = await kpiService.create(eval1.id, { name: "Score", category: "tech", target: 100 });

      const updated = await kpiService.update(kpi.id, eval1.id, { target: 200 });

      expect(updated.target).toBe(200);
    });

    it("sets actual to null", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Eval" });
      const kpi = await kpiService.create(eval1.id, { name: "Score", category: "tech", target: 100 });
      await kpiService.update(kpi.id, eval1.id, { actual: 50 });

      const updated = await kpiService.update(kpi.id, eval1.id, { actual: null });

      expect(updated.actual).toBeNull();
      expect(updated.achievement).toBeNull();
    });

    it("throws when KPI not found", async () => {
      const eval1 = await evalService.create("org_1", "user_1", { title: "Eval" });

      await expect(
        kpiService.update("nonexistent", eval1.id, { actual: 50 }),
      ).rejects.toThrow("KPI not found");
    });
  });
});

describe("calculateAchievement", () => {
  it("returns 100 for target=100, actual=100", () => {
    expect(calculateAchievement(100, 100)).toBe(100);
  });

  it("returns 50 for target=100, actual=50", () => {
    expect(calculateAchievement(100, 50)).toBe(50);
  });

  it("returns null when actual is null", () => {
    expect(calculateAchievement(100, null)).toBeNull();
  });

  it("returns 100 when target=0 and actual=0", () => {
    expect(calculateAchievement(0, 0)).toBe(100);
  });

  it("returns 0 when target=0 and actual is non-zero", () => {
    expect(calculateAchievement(0, 50)).toBe(0);
  });

  it("returns 200 for over-achievement", () => {
    expect(calculateAchievement(50, 100)).toBe(200);
  });
});
