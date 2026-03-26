import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrdReviewPipeline, PipelineError } from "../services/prd-review-pipeline.js";
import type { AiReviewProvider, AiReviewResponse } from "../services/external-ai-reviewer.js";

const TABLES_SQL = `
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
  CREATE TABLE IF NOT EXISTS biz_generated_prds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    biz_item_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    criteria_snapshot TEXT,
    generated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS prd_reviews (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prd_id TEXT NOT NULL,
    biz_item_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    verdict TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    feedback TEXT,
    raw_response TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    org_id TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS prd_review_scorecards (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prd_id TEXT NOT NULL,
    total_score INTEGER NOT NULL DEFAULT 0,
    verdict TEXT NOT NULL,
    provider_count INTEGER NOT NULL DEFAULT 0,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

function makeReviewResponse(overrides: Partial<AiReviewResponse> = {}): AiReviewResponse {
  return {
    sections: [
      { name: "핵심 문제 정의", score: 8, grade: "충실", feedback: "좋음" },
      { name: "솔루션 설계", score: 7, grade: "적정", feedback: "양호" },
    ],
    overallScore: 75,
    verdict: "go",
    summary: "우수한 PRD",
    improvements: ["개선1"],
    ...overrides,
  };
}

function mockProvider(name: "chatgpt" | "gemini" | "deepseek", response?: AiReviewResponse, shouldFail?: boolean): AiReviewProvider {
  return {
    name,
    review: shouldFail
      ? vi.fn().mockRejectedValue(new Error(`${name} failed`))
      : vi.fn().mockResolvedValue(response ?? makeReviewResponse()),
  };
}

let db: D1Database;

describe("PrdReviewPipeline (F186)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  // ─── execute: 3개 모두 성공 ───

  it("3개 모두 성공 → 스코어카드 정상", async () => {
    const pipeline = new PrdReviewPipeline(db, {
      OPENAI_API_KEY: "key1",
      GOOGLE_AI_API_KEY: "key2",
      DEEPSEEK_API_KEY: "key3",
    });

    // providers를 직접 교체
    (pipeline as any).providers = [
      mockProvider("chatgpt", makeReviewResponse({ overallScore: 80, verdict: "go" })),
      mockProvider("gemini", makeReviewResponse({ overallScore: 70, verdict: "conditional" })),
      mockProvider("deepseek", makeReviewResponse({ overallScore: 75, verdict: "go" })),
    ];

    const result = await pipeline.execute("prd-1", "item-1", "PRD 내용", "org_test");

    expect(result.reviews).toHaveLength(3);
    expect(result.failures).toHaveLength(0);
    expect(result.scorecard.totalScore).toBe(75); // (80+70+75)/3 = 75
    expect(result.scorecard.verdict).toBe("go"); // 2 go > 3/2
    expect(result.scorecard.providerCount).toBe(3);
  });

  // ─── execute: 2개 성공 + 1 실패 ───

  it("2개 성공 + 1 실패 → 스코어카드 정상 (failures에 실패 provider)", async () => {
    const pipeline = new PrdReviewPipeline(db, {
      OPENAI_API_KEY: "key1",
      GOOGLE_AI_API_KEY: "key2",
      DEEPSEEK_API_KEY: "key3",
    });

    (pipeline as any).providers = [
      mockProvider("chatgpt", makeReviewResponse({ overallScore: 80 })),
      mockProvider("gemini", undefined, true), // 실패
      mockProvider("deepseek", makeReviewResponse({ overallScore: 70 })),
    ];

    const result = await pipeline.execute("prd-1", "item-1", "PRD 내용", "org_test");

    expect(result.reviews).toHaveLength(2);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("gemini");
    expect(result.scorecard.totalScore).toBe(75); // (80+70)/2
    expect(result.scorecard.providerCount).toBe(2);
  });

  // ─── execute: 1개만 성공 → INSUFFICIENT_REVIEWS ───

  it("1개만 성공 → INSUFFICIENT_REVIEWS 에러", async () => {
    const pipeline = new PrdReviewPipeline(db, {
      OPENAI_API_KEY: "key1",
      GOOGLE_AI_API_KEY: "key2",
      DEEPSEEK_API_KEY: "key3",
    });

    (pipeline as any).providers = [
      mockProvider("chatgpt", makeReviewResponse()),
      mockProvider("gemini", undefined, true),
      mockProvider("deepseek", undefined, true),
    ];

    await expect(pipeline.execute("prd-1", "item-1", "PRD", "org_test")).rejects.toThrow(PipelineError);
    try {
      await pipeline.execute("prd-1", "item-1", "PRD", "org_test");
    } catch (e) {
      expect((e as PipelineError).code).toBe("INSUFFICIENT_REVIEWS");
    }
  });

  // ─── execute: 0개 provider → NO_PROVIDERS ───

  it("0개 provider → NO_PROVIDERS 에러", async () => {
    const pipeline = new PrdReviewPipeline(db, {}); // 키 없음

    await expect(pipeline.execute("prd-1", "item-1", "PRD", "org_test")).rejects.toThrow(PipelineError);
    try {
      await pipeline.execute("prd-1", "item-1", "PRD", "org_test");
    } catch (e) {
      expect((e as PipelineError).code).toBe("NO_PROVIDERS");
    }
  });

  // ─── aggregate: verdict 다수결 ───

  it("aggregate — go 다수결", () => {
    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });
    const result = pipeline.aggregate([
      { provider: "chatgpt", response: makeReviewResponse({ verdict: "go" }) },
      { provider: "gemini", response: makeReviewResponse({ verdict: "go" }) },
      { provider: "deepseek", response: makeReviewResponse({ verdict: "reject" }) },
    ]);
    expect(result.verdict).toBe("go");
  });

  it("aggregate — reject 다수결", () => {
    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });
    const result = pipeline.aggregate([
      { provider: "chatgpt", response: makeReviewResponse({ verdict: "reject" }) },
      { provider: "gemini", response: makeReviewResponse({ verdict: "reject" }) },
      { provider: "deepseek", response: makeReviewResponse({ verdict: "go" }) },
    ]);
    expect(result.verdict).toBe("reject");
  });

  it("aggregate — mixed → conditional", () => {
    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });
    const result = pipeline.aggregate([
      { provider: "chatgpt", response: makeReviewResponse({ verdict: "go" }) },
      { provider: "gemini", response: makeReviewResponse({ verdict: "conditional" }) },
      { provider: "deepseek", response: makeReviewResponse({ verdict: "reject" }) },
    ]);
    expect(result.verdict).toBe("conditional");
  });

  // ─── saveReviews + saveScorecard → DB ───

  it("saveReviews — DB에 정상 저장", async () => {
    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });
    const reviews = [
      { provider: "chatgpt", response: makeReviewResponse() },
    ];

    await pipeline.saveReviews("prd-1", "item-1", "org_test", reviews);

    const { results } = await db
      .prepare("SELECT * FROM prd_reviews WHERE prd_id = ?")
      .bind("prd-1")
      .all<Record<string, unknown>>();
    expect(results).toHaveLength(1);
    expect(results[0]!.provider).toBe("chatgpt");
    expect(results[0]!.prd_id).toBe("prd-1");
    expect(results[0]!.org_id).toBe("org_test");
  });

  it("saveScorecard — DB에 정상 저장", async () => {
    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });
    const scorecard = pipeline.aggregate([
      { provider: "chatgpt", response: makeReviewResponse({ overallScore: 80 }) },
      { provider: "gemini", response: makeReviewResponse({ overallScore: 70 }) },
    ]);

    await pipeline.saveScorecard("prd-1", scorecard);

    const row = await db
      .prepare("SELECT * FROM prd_review_scorecards WHERE prd_id = ?")
      .bind("prd-1")
      .first<Record<string, unknown>>();
    expect(row).toBeTruthy();
    expect(row!.total_score).toBe(75);
    expect(row!.verdict).toBe("go");
    expect(row!.provider_count).toBe(2);
  });

  // ─── getReviews ───

  it("getReviews — 리뷰 + 스코어카드 조회", async () => {
    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });
    const reviews = [
      { provider: "chatgpt", response: makeReviewResponse({ overallScore: 80 }) },
      { provider: "gemini", response: makeReviewResponse({ overallScore: 70 }) },
    ];

    await pipeline.saveReviews("prd-1", "item-1", "org_test", reviews);
    await pipeline.saveScorecard("prd-1", pipeline.aggregate(reviews));

    const result = await pipeline.getReviews("prd-1");
    expect(result.reviews).toHaveLength(2);
    expect(result.scorecard).toBeTruthy();
    expect(result.scorecard!.totalScore).toBe(75);
  });

  it("getReviews — 결과 없으면 빈 배열 + null", async () => {
    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });

    const result = await pipeline.getReviews("nonexistent");
    expect(result.reviews).toHaveLength(0);
    expect(result.scorecard).toBeNull();
  });

  // ─── availableProviderCount ───

  it("availableProviderCount — 키 수만큼 provider 생성", () => {
    const p0 = new PrdReviewPipeline(db, {});
    expect(p0.availableProviderCount).toBe(0);

    const p2 = new PrdReviewPipeline(db, { OPENAI_API_KEY: "k", DEEPSEEK_API_KEY: "k" });
    expect(p2.availableProviderCount).toBe(2);

    const p3 = new PrdReviewPipeline(db, { OPENAI_API_KEY: "k", GOOGLE_AI_API_KEY: "k", DEEPSEEK_API_KEY: "k" });
    expect(p3.availableProviderCount).toBe(3);
  });
});
