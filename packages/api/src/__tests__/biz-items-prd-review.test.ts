/**
 * Sprint 55 F186: PRD 다중 AI 검토 — Route 통합 테스트
 * 라우트 추가 후 활성화: POST /biz-items/:id/prd/:prdId/review, GET /biz-items/:id/prd/:prdId/reviews
 *
 * 현재 라우트가 아직 미구현이므로, PrdReviewPipeline 서비스 레벨 통합 테스트로 대체
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { PrdReviewPipeline, PipelineError } from "../core/offering/services/prd-review-pipeline.js";
import type { AiReviewProvider, AiReviewResponse } from "../core/agent/services/external-ai-reviewer.js";

const BIZ_TABLES_SQL = `
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
      { name: "핵심 문제 정의", score: 8, grade: "충실", feedback: "명확한 문제 정의" },
      { name: "솔루션 설계", score: 7, grade: "적정", feedback: "기본 구조 양호" },
      { name: "시장 분석", score: 6, grade: "적정", feedback: "시장 데이터 보완 필요" },
      { name: "사용자/고객 정의", score: 5, grade: "최소", feedback: "페르소나 추가 필요" },
      { name: "기술 실현 가능성", score: 9, grade: "충실", feedback: "우수한 기술 분석" },
      { name: "비즈니스 모델", score: 4, grade: "최소", feedback: "수익 모델 구체화 필요" },
      { name: "리스크 분석", score: 7, grade: "적정", feedback: "주요 리스크 식별됨" },
      { name: "실행 계획", score: 6, grade: "적정", feedback: "마일스톤 상세화 필요" },
    ],
    overallScore: 72,
    verdict: "conditional",
    summary: "전반적으로 양호",
    improvements: ["비즈니스 모델 구체화"],
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

function seedDb(sql: string) {
  (db as any).prepare(sql).run();
}

function seedBizItem(id: string = "item-1") {
  seedDb(`INSERT INTO biz_items (id, org_id, title, description, source, status, created_by)
    VALUES ('${id}', 'org_test', 'AI 기반 보안', 'AI 보안 솔루션', 'field', 'draft', 'test-user')`);
}

function seedPrd(prdId: string = "prd-1", bizItemId: string = "item-1") {
  seedDb(`INSERT INTO biz_generated_prds (id, biz_item_id, version, content)
    VALUES ('${prdId}', '${bizItemId}', 1, '# PRD — AI 기반 보안\n## 1. 요약\nAI 기반 보안 솔루션')`);
}

describe("BizItems PRD Review Integration (F186)", () => {
  beforeEach(() => {
    const mockDb = createMockD1();
    void mockDb.exec(BIZ_TABLES_SQL);
    db = mockDb as unknown as D1Database;
  });

  // ─── PRD 검토 실행 (서비스 통합) ───

  it("검토 실행 — 아이템 존재 + PRD 존재 → 성공 201 시뮬레이션", async () => {
    seedBizItem();
    seedPrd();

    const pipeline = new PrdReviewPipeline(db, {
      OPENAI_API_KEY: "key1",
      GOOGLE_AI_API_KEY: "key2",
      DEEPSEEK_API_KEY: "key3",
    });

    (pipeline as any).providers = [
      mockProvider("chatgpt", makeReviewResponse({ overallScore: 80, verdict: "go" })),
      mockProvider("gemini", makeReviewResponse({ overallScore: 70, verdict: "conditional" })),
      mockProvider("deepseek", makeReviewResponse({ overallScore: 75, verdict: "go" })),
    ];

    const result = await pipeline.execute("prd-1", "item-1", "PRD 내용", "org_test");

    // 201 응답 검증 (서비스 결과 기반)
    expect(result.reviews).toHaveLength(3);
    expect(result.scorecard.totalScore).toBe(75);
    expect(result.scorecard.verdict).toBe("go");
    expect(result.failures).toHaveLength(0);
  });

  it("검토 실행 — provider 없음 → NO_PROVIDERS (503 시뮬레이션)", async () => {
    seedBizItem();
    seedPrd();

    const pipeline = new PrdReviewPipeline(db, {}); // 키 없음

    try {
      await pipeline.execute("prd-1", "item-1", "PRD 내용", "org_test");
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PipelineError);
      expect((e as PipelineError).code).toBe("NO_PROVIDERS");
    }
  });

  // ─── 리뷰 조회 (서비스 통합) ───

  it("리뷰 조회 — 결과 있음 → 200 시뮬레이션", async () => {
    seedBizItem();
    seedPrd();

    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });

    (pipeline as any).providers = [
      mockProvider("chatgpt", makeReviewResponse({ overallScore: 80 })),
      mockProvider("gemini", makeReviewResponse({ overallScore: 70 })),
    ];

    await pipeline.execute("prd-1", "item-1", "PRD 내용", "org_test");

    const result = await pipeline.getReviews("prd-1");
    expect(result.reviews).toHaveLength(2);
    expect(result.scorecard).toBeTruthy();
    expect(result.scorecard!.totalScore).toBe(75);
    expect(result.reviews[0]!.provider).toBe("chatgpt");
    expect(result.reviews[1]!.provider).toBe("gemini");
  });

  it("리뷰 조회 — 결과 없음 → 빈 결과 (404 시뮬레이션)", async () => {
    seedBizItem();
    seedPrd();

    const pipeline = new PrdReviewPipeline(db, { OPENAI_API_KEY: "key" });
    const result = await pipeline.getReviews("prd-1");

    expect(result.reviews).toHaveLength(0);
    expect(result.scorecard).toBeNull();
  });

  // ─── 전체 플로우 테스트 ───

  it("전체 플로우 — 검토 실행 → 조회 → 검증", async () => {
    seedBizItem();
    seedPrd();

    const pipeline = new PrdReviewPipeline(db, {
      OPENAI_API_KEY: "key1",
      GOOGLE_AI_API_KEY: "key2",
      DEEPSEEK_API_KEY: "key3",
    });

    (pipeline as any).providers = [
      mockProvider("chatgpt", makeReviewResponse({ overallScore: 85, verdict: "go" })),
      mockProvider("gemini", makeReviewResponse({ overallScore: 60, verdict: "conditional" })),
      mockProvider("deepseek", makeReviewResponse({ overallScore: 70, verdict: "go" })),
    ];

    // Step 1: 검토 실행
    const execResult = await pipeline.execute("prd-1", "item-1", "# PRD\n내용", "org_test");
    expect(execResult.reviews).toHaveLength(3);
    expect(execResult.scorecard.verdict).toBe("go");

    // Step 2: DB에서 조회
    const getResult = await pipeline.getReviews("prd-1");
    expect(getResult.reviews).toHaveLength(3);
    expect(getResult.scorecard).toBeTruthy();

    // Step 3: DB 직접 확인
    const { results: reviewRows } = await db
      .prepare("SELECT * FROM prd_reviews WHERE prd_id = ?")
      .bind("prd-1")
      .all<Record<string, unknown>>();
    expect(reviewRows).toHaveLength(3);

    const scorecardRow = await db
      .prepare("SELECT * FROM prd_review_scorecards WHERE prd_id = ?")
      .bind("prd-1")
      .first<Record<string, unknown>>();
    expect(scorecardRow).toBeTruthy();
    expect(scorecardRow!.provider_count).toBe(3);
  });

  // ─── 부분 실패 플로우 ───

  it("부분 실패 — 2성공 + 1실패 → DB에 성공분만 저장", async () => {
    seedBizItem();
    seedPrd();

    const pipeline = new PrdReviewPipeline(db, {
      OPENAI_API_KEY: "key1",
      GOOGLE_AI_API_KEY: "key2",
      DEEPSEEK_API_KEY: "key3",
    });

    (pipeline as any).providers = [
      mockProvider("chatgpt", makeReviewResponse({ overallScore: 80 })),
      mockProvider("gemini", undefined, true),
      mockProvider("deepseek", makeReviewResponse({ overallScore: 70 })),
    ];

    const result = await pipeline.execute("prd-1", "item-1", "PRD", "org_test");
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain("gemini");

    // DB에는 성공한 2개만 저장
    const { results } = await db
      .prepare("SELECT * FROM prd_reviews WHERE prd_id = ?")
      .bind("prd-1")
      .all<Record<string, unknown>>();
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.provider)).toEqual(expect.arrayContaining(["chatgpt", "deepseek"]));
  });
});
