"use client";

import { Button } from "@/components/ui/button";

interface SectionAvg {
  name: string;
  avgScore: number;
  avgGrade: string;
}

interface ProviderVerdict {
  name: string;
  verdict: string;
  score: number;
}

interface ScorecardViewProps {
  reviews: Array<{
    provider: string;
    verdict: string;
    score: number;
    feedback: string;
    createdAt: string;
  }>;
  scorecard: {
    totalScore: number;
    verdict: string;
    providerCount: number;
    providerVerdicts: ProviderVerdict[];
    sectionAverages: SectionAvg[];
  } | null;
  onRefresh: () => void;
}

const VERDICT_COLORS: Record<string, string> = {
  go: "bg-green-100 text-green-800 border-green-300",
  conditional: "bg-yellow-100 text-yellow-800 border-yellow-300",
  reject: "bg-red-100 text-red-800 border-red-300",
};

const VERDICT_LABELS: Record<string, string> = {
  go: "Go",
  conditional: "Conditional",
  reject: "Reject",
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const color = VERDICT_COLORS[verdict] ?? "bg-gray-100 text-gray-800 border-gray-300";
  const label = VERDICT_LABELS[verdict] ?? verdict;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${color}`}>
      {label}
    </span>
  );
}

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = score >= 8 ? "bg-green-500" : score >= 6 ? "bg-yellow-500" : score >= 4 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-gray-600 w-8">{score}</span>
    </div>
  );
}

export default function ScorecardView({ reviews, scorecard, onRefresh }: ScorecardViewProps) {
  if (!scorecard) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="mb-4">아직 AI 검토 결과가 없어요.</p>
        <Button onClick={onRefresh}>AI 검토 시작</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 전체 verdict */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <p className="text-sm text-gray-500">전체 판정</p>
          <div className="flex items-center gap-3 mt-1">
            <VerdictBadge verdict={scorecard.verdict} />
            <span className="text-2xl font-bold">{scorecard.totalScore}</span>
            <span className="text-sm text-gray-400">/100</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh}>새로 검토</Button>
      </div>

      {/* AI별 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {scorecard.providerVerdicts.map((pv) => (
          <div key={pv.name} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium capitalize">{pv.name}</span>
              <VerdictBadge verdict={pv.verdict} />
            </div>
            <p className="text-xl font-bold">{pv.score}<span className="text-sm text-gray-400">/100</span></p>
          </div>
        ))}
      </div>

      {/* 항목별 점수 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3">항목별 평균 점수</h3>
        <div className="space-y-2">
          {scorecard.sectionAverages.map((sa) => (
            <div key={sa.name} className="flex items-center justify-between">
              <span className="text-sm w-32 truncate">{sa.name}</span>
              <ScoreBar score={sa.avgScore} />
              <span className="text-xs text-gray-500 w-12 text-right">{sa.avgGrade}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 개별 피드백 */}
      {reviews.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">AI별 상세 피드백</h3>
          {reviews.map((r, i) => {
            const feedback = (() => {
              try { return JSON.parse(r.feedback); }
              catch { return []; }
            })() as Array<{ name: string; score: number; grade: string; feedback: string }>;
            return (
              <details key={i} className="mb-2">
                <summary className="cursor-pointer text-sm font-medium capitalize py-1">
                  {r.provider} — {r.score}/100 ({r.verdict})
                </summary>
                <div className="pl-4 pt-2 space-y-1">
                  {feedback.map((f, j) => (
                    <p key={j} className="text-xs text-gray-600">
                      <strong>{f.name}</strong> ({f.score}/10 {f.grade}): {f.feedback}
                    </p>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
