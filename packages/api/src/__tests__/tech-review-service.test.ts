import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { TechReviewService } from "../services/tech-review-service.js";

describe("TechReviewService", () => {
  let db: ReturnType<typeof createMockD1>;
  let svc: TechReviewService;

  beforeEach(async () => {
    db = createMockD1();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS biz_items (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        source TEXT DEFAULT 'field',
        status TEXT DEFAULT 'draft',
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prototypes (
        id TEXT PRIMARY KEY,
        biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
        version INTEGER NOT NULL DEFAULT 1,
        format TEXT NOT NULL DEFAULT 'html',
        content TEXT NOT NULL,
        template_used TEXT,
        model_used TEXT,
        tokens_used INTEGER DEFAULT 0,
        generated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tech_reviews (
        id TEXT PRIMARY KEY,
        prototype_id TEXT NOT NULL,
        feasibility TEXT NOT NULL,
        stack_fit INTEGER NOT NULL DEFAULT 0,
        complexity TEXT NOT NULL,
        risks TEXT DEFAULT '[]',
        recommendation TEXT NOT NULL,
        estimated_effort TEXT,
        reviewed_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();
    await db.prepare(
      "INSERT INTO biz_items (id, org_id, title, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind("bi_1", "org_test", "Test Item", "u1", now, now).run();

    svc = new TechReviewService(db as unknown as D1Database);
  });

  function insertPrototype(id: string, content: string, template: string | null = "idea") {
    const now = new Date().toISOString();
    return db.prepare(
      "INSERT INTO prototypes (id, biz_item_id, version, format, content, template_used, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, "bi_1", 1, "html", content, template, now).run();
  }

  describe("analyze", () => {
    it("analyzes a small prototype as low feasibility", async () => {
      await insertPrototype("p1", "short content");
      const review = await svc.analyze("p1", "org_test");

      expect(review.id).toBeTruthy();
      expect(review.prototypeId).toBe("p1");
      expect(review.feasibility).toBe("low");
      expect(review.recommendation).toBe("reject");
      expect(review.risks.length).toBeGreaterThan(0);
    });

    it("analyzes a large template prototype as high feasibility", async () => {
      const longContent = "x".repeat(6000);
      await insertPrototype("p2", longContent, "idea");
      const review = await svc.analyze("p2", "org_test");

      expect(review.feasibility).toBe("high");
      expect(review.stackFit).toBeGreaterThan(50);
    });

    it("sets medium feasibility for mid-size content", async () => {
      const midContent = "y".repeat(3000);
      await insertPrototype("p3", midContent, null);
      const review = await svc.analyze("p3", "org_test");

      expect(review.feasibility).toBe("medium");
      expect(review.recommendation).toBe("modify");
    });

    it("throws for non-existent prototype", async () => {
      await expect(svc.analyze("nope", "org_test")).rejects.toThrow("Prototype not found");
    });

    it("throws for wrong tenant", async () => {
      await insertPrototype("p4", "some content");
      await expect(svc.analyze("p4", "org_other")).rejects.toThrow("Prototype not found");
    });

    it("returns complexity=high for very large content", async () => {
      const hugeContent = "z".repeat(15000);
      await insertPrototype("p5", hugeContent, "idea");
      const review = await svc.analyze("p5", "org_test");

      expect(review.complexity).toBe("high");
      expect(review.estimatedEffort).toBe("4 weeks");
    });

    it("persists review to DB", async () => {
      await insertPrototype("p6", "x".repeat(3000), "idea");
      const review = await svc.analyze("p6", "org_test");

      const fetched = await svc.getByPrototype("p6", "org_test");
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(review.id);
    });
  });

  describe("getByPrototype", () => {
    it("returns null when no review", async () => {
      await insertPrototype("p7", "content");
      const review = await svc.getByPrototype("p7", "org_test");
      expect(review).toBeNull();
    });

    it("returns latest review", async () => {
      await insertPrototype("p8", "x".repeat(3000));
      await svc.analyze("p8", "org_test");
      await svc.analyze("p8", "org_test"); // second analysis

      const review = await svc.getByPrototype("p8", "org_test");
      expect(review).not.toBeNull();
    });

    it("returns null for wrong tenant", async () => {
      await insertPrototype("p9", "x".repeat(3000));
      await svc.analyze("p9", "org_test");

      const review = await svc.getByPrototype("p9", "org_other");
      expect(review).toBeNull();
    });
  });
});
