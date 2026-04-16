// F552: Dual AI Review types

export interface DualReviewInsert {
  sprint_id: number;
  claude_verdict: string | null;
  codex_verdict: string;
  codex_json: string;
  divergence_score: number;
  decision: string;
  degraded: boolean;
  degraded_reason: string | null;
  model: string;
}

export interface DualReview extends DualReviewInsert {
  id: number;
  created_at: string;
}

export interface DualReviewStats {
  total: number;
  concordance_rate: number;
  block_rate: number;
  degraded_rate: number;
  block_reasons: Array<{ reason: string; count: number }>;
  recent_reviews: Array<{
    sprint_id: number;
    claude_verdict: string | null;
    codex_verdict: string;
    decision: string;
    divergence_score: number;
    degraded: boolean;
    created_at: string;
  }>;
}
