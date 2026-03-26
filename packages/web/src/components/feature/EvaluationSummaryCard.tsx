"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { fetchApi } from "@/lib/api-client";

interface Evaluation {
  id: string;
  evaluator_type: string;
  overall_score: number;
  verdict: string;
  summary: string;
  created_at: string;
}

interface EvaluationSummaryCardProps {
  bizItemId: string;
}

const VERDICT_STYLES: Record<string, { color: string; bg: string }> = {
  "Go": { color: "text-green-700", bg: "bg-green-50 border-green-200" },
  "Conditional Go": { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  "No-Go": { color: "text-red-700", bg: "bg-red-50 border-red-200" },
};

export default function EvaluationSummaryCard({ bizItemId }: EvaluationSummaryCardProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<{ evaluations: Evaluation[] }>(
          `/ax-bd/evaluations?bizItemId=${bizItemId}`,
        );
        setEvaluations(data.evaluations ?? []);
      } catch {
        // No evaluations available
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bizItemId]);

  if (loading) {
    return (
      <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
        평가 데이터 로딩 중...
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
        멀티페르소나 평가가 아직 진행되지 않았어요.
      </div>
    );
  }

  const avgScore = evaluations.reduce((sum, e) => sum + e.overall_score, 0) / evaluations.length;

  return (
    <div className="space-y-3">
      {/* Average Score */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{avgScore.toFixed(1)}</div>
          <div className="text-[10px] text-muted-foreground">평균 점수</div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-sm text-muted-foreground">
          {evaluations.length}명의 페르소나가 평가 완료
        </div>
      </div>

      {/* Individual Evaluations */}
      <div className="grid gap-2">
        {evaluations.map((ev) => {
          const style = VERDICT_STYLES[ev.verdict] ?? VERDICT_STYLES["Conditional Go"];
          return (
            <div key={ev.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{ev.evaluator_type}</span>
                <span className="ml-auto text-lg font-bold">
                  {ev.overall_score.toFixed(1)}
                </span>
                <Badge className={`${style.color} ${style.bg}`}>{ev.verdict}</Badge>
              </div>
              {ev.summary && (
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{ev.summary}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
