/**
 * Sprint 55 F186: PRD 다중 AI 검토 파이프라인 — 병렬 호출 + 스코어카드 집계 + D1 저장
 */
import { ChatGptProvider, DeepSeekProvider, GeminiProvider, type AiReviewProvider, type AiReviewResponse } from "../../agent/types.js";

export const MIN_REVIEW_SUCCESS = 2;

export interface PipelineResult {
  reviews: ProviderReview[];
  scorecard: Scorecard;
  failures: string[];
}

export interface ProviderReview {
  provider: string;
  response: AiReviewResponse;
}

export interface Scorecard {
  totalScore: number;
  verdict: "go" | "conditional" | "reject";
  providerCount: number;
  providerVerdicts: Array<{ name: string; verdict: string; score: number }>;
  sectionAverages: Array<{ name: string; avgScore: number; avgGrade: string }>;
}

export class PrdReviewPipeline {
  private providers: AiReviewProvider[];

  constructor(private db: D1Database, env: {
    OPENAI_API_KEY?: string;
    GOOGLE_AI_API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
  }) {
    this.providers = [];
    if (env.OPENAI_API_KEY) this.providers.push(new ChatGptProvider(env.OPENAI_API_KEY));
    if (env.GOOGLE_AI_API_KEY) this.providers.push(new GeminiProvider(env.GOOGLE_AI_API_KEY));
    if (env.DEEPSEEK_API_KEY) this.providers.push(new DeepSeekProvider(env.DEEPSEEK_API_KEY));
  }

  get availableProviderCount(): number {
    return this.providers.length;
  }

  async execute(prdId: string, bizItemId: string, prdContent: string, orgId: string): Promise<PipelineResult> {
    if (this.providers.length === 0) {
      throw new PipelineError("No AI review providers configured", "NO_PROVIDERS");
    }

    const settled = await Promise.allSettled(
      this.providers.map((p) => p.review(prdContent)),
    );

    const reviews: ProviderReview[] = [];
    const failures: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]!;
      const provider = this.providers[i]!;
      if (result.status === "fulfilled") {
        reviews.push({ provider: provider.name, response: result.value });
      } else {
        failures.push(`${provider.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    if (reviews.length < MIN_REVIEW_SUCCESS) {
      throw new PipelineError(
        `Insufficient reviews: ${reviews.length}/${this.providers.length} (minimum ${MIN_REVIEW_SUCCESS})`,
        "INSUFFICIENT_REVIEWS",
      );
    }

    const scorecard = this.aggregate(reviews);

    await this.saveReviews(prdId, bizItemId, orgId, reviews);
    await this.saveScorecard(prdId, scorecard);

    return { reviews, scorecard, failures };
  }

  aggregate(reviews: ProviderReview[]): Scorecard {
    const totalScore = Math.round(
      reviews.reduce((sum, r) => sum + r.response.overallScore, 0) / reviews.length,
    );

    const providerVerdicts = reviews.map((r) => ({
      name: r.provider,
      verdict: r.response.verdict,
      score: r.response.overallScore,
    }));

    const sectionMap = new Map<string, { scores: number[]; grades: string[] }>();
    for (const review of reviews) {
      for (const section of review.response.sections) {
        const entry = sectionMap.get(section.name) ?? { scores: [], grades: [] };
        entry.scores.push(section.score);
        entry.grades.push(section.grade);
        sectionMap.set(section.name, entry);
      }
    }
    const sectionAverages = Array.from(sectionMap.entries()).map(([name, data]) => ({
      name,
      avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 10) / 10,
      avgGrade: this.modeGrade(data.grades),
    }));

    const verdictCounts = { go: 0, conditional: 0, reject: 0 };
    for (const r of reviews) verdictCounts[r.response.verdict]++;
    let verdict: "go" | "conditional" | "reject";
    if (verdictCounts.reject >= reviews.length / 2) verdict = "reject";
    else if (verdictCounts.go > reviews.length / 2) verdict = "go";
    else verdict = "conditional";

    return { totalScore, verdict, providerCount: reviews.length, providerVerdicts, sectionAverages };
  }

  private modeGrade(grades: string[]): string {
    const counts: Record<string, number> = {};
    for (const g of grades) counts[g] = (counts[g] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "적정";
  }

  async saveReviews(prdId: string, bizItemId: string, orgId: string, reviews: ProviderReview[]): Promise<void> {
    for (const review of reviews) {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO prd_reviews (id, prd_id, biz_item_id, provider, verdict, score, feedback, raw_response, org_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id, prdId, bizItemId, review.provider,
          review.response.verdict, review.response.overallScore,
          JSON.stringify(review.response.sections),
          JSON.stringify(review.response),
          orgId,
        )
        .run();
    }
  }

  async saveScorecard(prdId: string, scorecard: Scorecard): Promise<void> {
    const id = generateId();
    await this.db
      .prepare(
        `INSERT INTO prd_review_scorecards (id, prd_id, total_score, verdict, provider_count, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, prdId, scorecard.totalScore, scorecard.verdict, scorecard.providerCount, JSON.stringify(scorecard))
      .run();
  }

  async getReviews(prdId: string): Promise<{
    reviews: Array<{ provider: string; verdict: string; score: number; feedback: string; createdAt: string }>;
    scorecard: Scorecard | null;
  }> {
    const { results: reviewRows } = await this.db
      .prepare("SELECT provider, verdict, score, feedback, created_at FROM prd_reviews WHERE prd_id = ? ORDER BY created_at")
      .bind(prdId)
      .all<{ provider: string; verdict: string; score: number; feedback: string; created_at: string }>();

    const scorecardRow = await this.db
      .prepare("SELECT details FROM prd_review_scorecards WHERE prd_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(prdId)
      .first<{ details: string }>();

    return {
      reviews: reviewRows.map((r) => ({
        provider: r.provider,
        verdict: r.verdict,
        score: r.score,
        feedback: r.feedback,
        createdAt: r.created_at,
      })),
      scorecard: scorecardRow ? JSON.parse(scorecardRow.details) : null,
    };
  }
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class PipelineError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "PipelineError";
  }
}
