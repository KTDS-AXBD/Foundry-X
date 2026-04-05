/**
 * Sprint 155 F345: EvalProgress — 8단계 순차 프로그레스 바 (SSE 실시간)
 */
import { CheckCircle2, Loader2, Circle, AlertCircle } from "lucide-react";
import type { EvalStepStatus } from "@/lib/stores/persona-eval-store";

interface EvalProgressProps {
  evaluations: EvalStepStatus[];
  isRunning: boolean;
}

const STATUS_ICONS = {
  idle: <Circle className="size-5 text-muted-foreground" />,
  evaluating: <Loader2 className="size-5 text-[#8b5cf6] animate-spin" />,
  complete: <CheckCircle2 className="size-5 text-green-500" />,
  error: <AlertCircle className="size-5 text-red-500" />,
};

export default function EvalProgress({ evaluations, isRunning }: EvalProgressProps) {
  const completed = evaluations.filter((e) => e.status === "complete").length;
  const total = evaluations.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">AI 페르소나 평가 진행</h3>
        <span className="text-xs text-muted-foreground">
          {completed}/{total} 완료 ({progressPercent}%)
        </span>
      </div>

      {/* 전체 프로그레스 바 */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-[#8b5cf6] rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 각 페르소나 상태 */}
      <div className="grid grid-cols-2 gap-2">
        {evaluations.map((evalStep) => (
          <div
            key={evalStep.personaId}
            className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
              evalStep.status === "evaluating" ? "border-[#8b5cf6]/50 bg-[#8b5cf6]/5" :
              evalStep.status === "complete" ? "border-green-200 bg-green-50" :
              "border-border"
            }`}
          >
            {STATUS_ICONS[evalStep.status]}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{evalStep.personaName}</div>
              {evalStep.status === "complete" && evalStep.verdict && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    evalStep.verdict === "green" ? "bg-green-100 text-green-700" :
                    evalStep.verdict === "red" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {evalStep.verdict === "green" ? "Go" : evalStep.verdict === "red" ? "NoGo" : "Conditional"}
                  </span>
                </div>
              )}
              {evalStep.status === "evaluating" && (
                <span className="text-[10px] text-[#8b5cf6]">평가 중...</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {isRunning && (
        <p className="text-xs text-muted-foreground text-center animate-pulse">
          AI가 각 페르소나의 관점에서 사업 아이템을 평가하고 있어요...
        </p>
      )}
    </div>
  );
}
