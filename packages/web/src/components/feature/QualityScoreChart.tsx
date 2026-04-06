// F355: O-G-D 라운드별 품질 스코어 시각화 (Sprint 160)

import type { OgdRoundItem } from "@/lib/api-client";

interface QualityScoreChartProps {
  rounds: OgdRoundItem[];
  threshold?: number;
}

export default function QualityScoreChart({
  rounds,
  threshold = 0.85,
}: QualityScoreChartProps) {
  if (rounds.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        O-G-D 라운드 데이터가 없어요.
      </div>
    );
  }

  const maxScore = 1;
  const barHeight = 32;
  const gap = 8;

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-1">
        O-G-D Quality Rounds (threshold: {(threshold * 100).toFixed(0)}%)
      </div>
      <div className="relative">
        {rounds.map((round) => {
          const score = round.qualityScore ?? 0;
          const pct = (score / maxScore) * 100;
          const passed = score >= threshold;

          return (
            <div
              key={round.id}
              className="flex items-center gap-3 mb-1"
              style={{ height: barHeight + gap }}
            >
              <span className="text-xs w-8 text-right text-muted-foreground">
                R{round.roundNumber}
              </span>
              <div className="flex-1 relative h-6 bg-muted rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${
                    passed ? "bg-green-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
                {/* Threshold line */}
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-400"
                  style={{ left: `${threshold * 100}%` }}
                />
              </div>
              <span
                className={`text-xs font-medium w-12 ${
                  passed ? "text-green-600" : "text-amber-600"
                }`}
              >
                {(score * 100).toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground w-16">
                ${round.costUsd.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
