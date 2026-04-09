/**
 * F447 — 파이프라인 단계 스테퍼
 * 아이템별 온보딩→발굴→형상화→Offering 전체 진행률 시각화
 */
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { PipelineItemDetail } from "@/lib/api-client";

const VISIBLE_STAGES = [
  { key: "DISCOVERY", label: "발굴" },
  { key: "FORMALIZATION", label: "형상화" },
  { key: "OFFERING", label: "Offering" },
  { key: "MVP", label: "MVP" },
] as const;

type VisibleStageKey = (typeof VISIBLE_STAGES)[number]["key"];

function getStageIndex(stage: string): number {
  const idx = VISIBLE_STAGES.findIndex((s) => s.key === stage);
  // REGISTERED는 -1 → DISCOVERY(0) 미만으로 처리
  return idx;
}

function getEnteredAt(stage: VisibleStageKey, history: PipelineItemDetail["stageHistory"]): string | null {
  const record = history.find((h) => h.stage === stage);
  if (!record) return null;
  return new Date(record.enteredAt).toLocaleDateString("ko", { month: "short", day: "numeric" });
}

interface PipelineProgressStepperProps {
  detail: PipelineItemDetail;
}

export default function PipelineProgressStepper({ detail }: PipelineProgressStepperProps) {
  const currentIdx = getStageIndex(detail.currentStage);
  const total = VISIBLE_STAGES.length;
  const progressPercent = currentIdx < 0 ? 0 : Math.round(((currentIdx + 1) / total) * 100);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">파이프라인 진행률</p>
        <span className="text-xs font-semibold text-blue-600">{`${progressPercent}% 진행`}</span>
      </div>
      <div className="flex items-center gap-0">
        {VISIBLE_STAGES.map((stage, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const enteredAt = getEnteredAt(stage.key, detail.stageHistory);
          const statusLabel = isDone ? "완료" : isCurrent ? "진행 중" : "";

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-2 transition-colors",
                    isDone && "h-7 w-7 border-green-500 bg-green-500 text-white",
                    isCurrent && "h-8 w-8 border-blue-500 bg-white text-blue-500 ring-2 ring-blue-200 animate-pulse",
                    !isDone && !isCurrent && "h-7 w-7 border-muted bg-muted/30 text-muted-foreground",
                  )}
                >
                  {isDone ? (
                    <Check className="size-3.5 stroke-[2.5]" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                <div className="mt-1 text-center min-w-[48px]">
                  <p
                    className={cn(
                      "text-xs font-medium leading-tight",
                      isCurrent ? "text-blue-600" : isDone ? "text-green-700" : "text-muted-foreground",
                    )}
                  >
                    {stage.label}
                  </p>
                  {statusLabel && (
                    <p
                      className={cn(
                        "text-[10px] font-medium mt-0.5",
                        isDone ? "text-green-600" : "text-blue-500",
                      )}
                    >
                      {statusLabel}
                    </p>
                  )}
                  {enteredAt && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{enteredAt}</p>
                  )}
                </div>
              </div>

              {/* Connector line (마지막 제외) */}
              {idx < VISIBLE_STAGES.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 mb-6 transition-colors",
                    idx < currentIdx ? "bg-green-400" : "bg-muted",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* 전체 진행률 바 */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
