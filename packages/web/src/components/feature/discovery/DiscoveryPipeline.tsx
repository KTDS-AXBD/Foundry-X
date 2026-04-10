"use client";

/**
 * F495 — 발굴 파이프라인 시각화 (ShapingPipeline 미러)
 * AX BD 9 스테이지(2-1~2-9) 읽기전용 진척 카드
 * 실행 액션은 DiscoveryStageStepper가 담당 (중복 방지)
 */
import { CheckCircle2, Circle, Loader2, ArrowRight } from "lucide-react";
import type { DiscoveryProgress } from "@/lib/api-client";

interface DiscoveryPipelineProps {
  progress: DiscoveryProgress | null;
}

// 2-0(분류) / 2-10(최종보고서)는 제외 — 9 핵심 스테이지만
const VISIBLE_STAGES = [
  { stage: "2-1", label: "레퍼런스" },
  { stage: "2-2", label: "시장 검증" },
  { stage: "2-3", label: "경쟁 환경" },
  { stage: "2-4", label: "기회 도출" },
  { stage: "2-5", label: "기회 선정" },
  { stage: "2-6", label: "고객 정의" },
  { stage: "2-7", label: "비즈니스 모델" },
  { stage: "2-8", label: "패키징" },
  { stage: "2-9", label: "페르소나 평가" },
] as const;

export default function DiscoveryPipeline({ progress }: DiscoveryPipelineProps) {
  const statusByStage = new Map(
    (progress?.stages ?? []).map((s) => [s.stage, s.status]),
  );

  const completedCount = VISIBLE_STAGES.filter(
    (s) => statusByStage.get(s.stage) === "completed",
  ).length;

  return (
    <div className="space-y-4" data-testid="discovery-pipeline">
      {/* 상단 pill row */}
      <div className="flex items-center gap-1 flex-wrap">
        {VISIBLE_STAGES.map((s, idx) => {
          const status = statusByStage.get(s.stage) ?? "pending";
          const done = status === "completed";
          const inProgress = status === "in_progress";
          return (
            <div key={s.stage} className="flex items-center">
              {idx > 0 && (
                <ArrowRight
                  className={`size-4 mx-1 ${
                    done ? "text-green-400" : "text-slate-200"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  done
                    ? "bg-green-100 text-green-700"
                    : inProgress
                      ? "bg-blue-50 text-blue-700 border border-blue-200 animate-pulse"
                      : "bg-slate-50 text-slate-400"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="size-3.5" />
                ) : inProgress ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Circle className="size-3.5" />
                )}
                <span className="font-mono text-[10px]">{s.stage}</span>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* 진척 요약 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>발굴 진행: {completedCount} / {VISIBLE_STAGES.length} 단계 완료</span>
        <span className="font-semibold text-blue-600">
          {Math.round((completedCount / VISIBLE_STAGES.length) * 100)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${(completedCount / VISIBLE_STAGES.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
