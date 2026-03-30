"use client";

import { STAGE_LABELS } from "./item-card";

interface StageStats {
  totalItems: number;
  byStage: Record<string, number>;
  avgDaysInStage: Record<string, number>;
}

interface PipelineViewProps {
  stats: StageStats;
}

const STAGES = ["REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING", "MVP"];

export function PipelineView({ stats }: PipelineViewProps) {
  const maxCount = Math.max(...Object.values(stats.byStage), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>전체 아이템: {stats.totalItems}개</span>
      </div>
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const count = stats.byStage[stage] ?? 0;
          const avgDays = stats.avgDaysInStage[stage] ?? 0;
          const width = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={stage} className="flex items-center gap-3">
              <div className="w-20 text-xs font-medium text-right">
                {STAGE_LABELS[stage] ?? stage}
              </div>
              {idx > 0 && (
                <span className="text-muted-foreground text-xs">→</span>
              )}
              <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(width, 2)}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {count}개 {avgDays > 0 && `(평균 ${avgDays}일)`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
