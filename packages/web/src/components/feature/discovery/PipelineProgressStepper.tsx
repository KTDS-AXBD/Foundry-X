/**
 * F447 — 파이프라인 단계 스테퍼
 * F495 — 발굴/형상화 2-stage + 세부 진행률 (OFFERING/MVP 제거)
 * 발굴: 9 sub-stages 진척, 형상화: 4 artifacts 진척
 */
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { PipelineItemDetail, ShapingArtifacts } from "@/lib/api-client";

const VISIBLE_STAGES = [
  { key: "DISCOVERY", label: "발굴" },
  { key: "FORMALIZATION", label: "형상화" },
] as const;

type VisibleStageKey = (typeof VISIBLE_STAGES)[number]["key"];

interface PipelineProgressStepperProps {
  detail: PipelineItemDetail;
  /** 발굴 9기준 진척 (0~9) */
  discoveryProgress?: { done: number; total: number };
  /** 형상화 4 artifacts 진척 */
  shapingArtifacts?: ShapingArtifacts | null;
}

function getEnteredAt(
  stage: VisibleStageKey,
  history: PipelineItemDetail["stageHistory"],
): string | null {
  const record = history.find((h) => h.stage === stage);
  if (!record) return null;
  return new Date(record.enteredAt).toLocaleDateString("ko", {
    month: "short",
    day: "numeric",
  });
}

function computeShapingProgress(artifacts: ShapingArtifacts | null | undefined): {
  done: number;
  total: number;
} {
  const total = 4;
  if (!artifacts) return { done: 0, total };
  const done =
    (artifacts.businessPlan ? 1 : 0) +
    (artifacts.offering ? 1 : 0) +
    (artifacts.prd ? 1 : 0) +
    (artifacts.prototype ? 1 : 0);
  return { done, total };
}

export default function PipelineProgressStepper({
  detail,
  discoveryProgress,
  shapingArtifacts,
}: PipelineProgressStepperProps) {
  // currentStage가 OFFERING/MVP/REVIEW/DECISION이어도 형상화 이후로 간주
  const isPostFormalization = ["OFFERING", "MVP", "REVIEW", "DECISION"].includes(
    detail.currentStage,
  );

  const discovery = discoveryProgress ?? { done: 0, total: 9 };
  const shaping = computeShapingProgress(shapingArtifacts);

  // Stage 상태 계산:
  // - DISCOVERY: 9/9이거나 currentStage가 FORMALIZATION 이상이면 완료
  // - FORMALIZATION: 4/4이거나 currentStage가 FORMALIZATION 이후면 완료
  const discoveryDone =
    discovery.done >= discovery.total ||
    detail.currentStage === "FORMALIZATION" ||
    isPostFormalization;
  const formalizationDone = shaping.done >= shaping.total || isPostFormalization;

  const formalizationCurrent = discoveryDone && !formalizationDone;
  const discoveryCurrent =
    !discoveryDone && (detail.currentStage === "DISCOVERY" || detail.currentStage === "REGISTERED");

  const stageStates = [
    {
      ...VISIBLE_STAGES[0],
      done: discoveryDone,
      current: discoveryCurrent,
      sub: discovery,
    },
    {
      ...VISIBLE_STAGES[1],
      done: formalizationDone,
      current: formalizationCurrent,
      sub: shaping,
    },
  ];

  const overallDone = stageStates.filter((s) => s.done).length;
  // 전체 진행률 = 발굴 50% + 형상화 50% (sub-progress 기반 분수 누적)
  const progressPercent = Math.round(
    ((discovery.done / discovery.total) * 50 + (shaping.done / shaping.total) * 50),
  );

  return (
    <div className="rounded-lg border bg-card p-4" data-testid="pipeline-progress-stepper">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">파이프라인 진행률</p>
        <span className="text-xs font-semibold text-blue-600">{`${progressPercent}% 진행`}</span>
      </div>

      <div className="flex items-stretch gap-2">
        {stageStates.map((stage, idx) => {
          const enteredAt = getEnteredAt(stage.key, detail.stageHistory);
          const statusLabel = stage.done ? "완료" : stage.current ? "진행 중" : "대기";

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              {/* Step card */}
              <div
                className={cn(
                  "flex-1 rounded-lg border p-3 transition-colors",
                  stage.done && "border-green-300 bg-green-50",
                  stage.current && "border-blue-400 bg-blue-50 ring-2 ring-blue-100 animate-pulse",
                  !stage.done && !stage.current && "border-muted bg-muted/20",
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full border-2 shrink-0",
                      stage.done && "h-6 w-6 border-green-500 bg-green-500 text-white",
                      stage.current && "h-6 w-6 border-blue-500 bg-white text-blue-500",
                      !stage.done && !stage.current && "h-6 w-6 border-muted-foreground/30 bg-muted/30 text-muted-foreground",
                    )}
                  >
                    {stage.done ? (
                      <Check className="size-3.5 stroke-[2.5]" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      stage.current && "text-blue-700",
                      stage.done && "text-green-700",
                      !stage.done && !stage.current && "text-muted-foreground",
                    )}
                  >
                    {stage.label}
                  </p>
                  <span
                    className={cn(
                      "ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded",
                      stage.done && "bg-green-100 text-green-700",
                      stage.current && "bg-blue-100 text-blue-700",
                      !stage.done && !stage.current && "bg-muted text-muted-foreground",
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Sub-progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{stage.sub.done} / {stage.sub.total} {stage.key === "DISCOVERY" ? "기준" : "산출물"}</span>
                    {enteredAt && <span>{enteredAt}</span>}
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        stage.done ? "bg-green-500" : stage.current ? "bg-blue-500" : "bg-muted-foreground/30",
                      )}
                      style={{
                        width: `${(stage.sub.done / stage.sub.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
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
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {overallDone}/{stageStates.length} 단계
        </span>
      </div>
    </div>
  );
}
