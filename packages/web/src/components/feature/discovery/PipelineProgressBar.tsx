/**
 * Sprint 223: F460 — 아이템별 파이프라인 6단계 진행률 바
 */

interface PipelineProgressBarProps {
  currentStage: string;
  completedStages: string[];
  overallPercent: number;
  compact?: boolean;
}

const PIPELINE_STAGES = [
  { key: "REGISTERED", label: "등록" },
  { key: "DISCOVERY", label: "발굴" },
  { key: "FORMALIZATION", label: "형상화" },
  { key: "REVIEW", label: "검토" },
  { key: "DECISION", label: "결정" },
  { key: "OFFERING", label: "오퍼링" },
];

export function PipelineProgressBar({
  currentStage,
  completedStages,
  overallPercent,
  compact = false,
}: PipelineProgressBarProps) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((s, i) => {
          const isCompleted = completedStages.includes(s.key);
          const isCurrent = s.key === currentStage;
          const isFuture = !isCompleted && !isCurrent;

          return (
            <div key={s.key} className="flex items-center">
              {/* 스텝 아이콘 */}
              <div className="flex flex-col items-center gap-0.5">
                <div
                  title={s.label}
                  className={[
                    "h-3 w-3 rounded-full transition-all",
                    isCompleted ? "bg-green-500" : "",
                    isCurrent ? "animate-pulse bg-blue-500" : "",
                    isFuture ? "bg-muted" : "",
                  ].join(" ")}
                />
                {!compact && (
                  <span className={["text-[9px] leading-none", isFuture ? "text-muted-foreground" : "text-foreground"].join(" ")}>
                    {s.label}
                  </span>
                )}
              </div>
              {/* 연결선 */}
              {i < PIPELINE_STAGES.length - 1 && (
                <div
                  className={[
                    "mx-0.5 h-px w-4",
                    completedStages.includes(PIPELINE_STAGES[i + 1]!.key) || isCurrent
                      ? "bg-green-400"
                      : "bg-muted",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}

        {/* 진행률 % */}
        <span className="ml-2 text-xs font-medium tabular-nums text-muted-foreground">
          {overallPercent}%
        </span>
      </div>
    </div>
  );
}
