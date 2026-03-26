"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { TrafficLightResponse } from "@/lib/api-client";

const SIGNAL_CONFIG = {
  green: { bg: "bg-green-500", label: "Go", ringColor: "ring-green-300", textColor: "text-green-700", bgLight: "bg-green-50" },
  yellow: { bg: "bg-yellow-400", label: "Caution", ringColor: "ring-yellow-300", textColor: "text-yellow-700", bgLight: "bg-yellow-50" },
  red: { bg: "bg-red-500", label: "Stop", ringColor: "ring-red-300", textColor: "text-red-700", bgLight: "bg-red-50" },
} as const;

const DECISION_STYLES = {
  go: { color: "text-green-700", bg: "bg-green-50 border-green-200", dot: "bg-green-500" },
  pivot: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", dot: "bg-yellow-400" },
  drop: { color: "text-red-700", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
} as const;

const STAGE_NAMES: Record<string, string> = {
  "2-1": "레퍼런스 분석",
  "2-2": "수요 시장 검증",
  "2-3": "경쟁·자사 분석",
  "2-4": "사업 아이템 도출",
  "2-5": "핵심 아이템 선정",
  "2-6": "타겟 고객 정의",
  "2-7": "비즈니스 모델 정의",
};

interface TrafficLightPanelProps {
  trafficLight: TrafficLightResponse;
}

export default function TrafficLightPanel({ trafficLight }: TrafficLightPanelProps) {
  const signal = SIGNAL_CONFIG[trafficLight.overallSignal];
  const { summary, checkpoints } = trafficLight;

  return (
    <div className="space-y-4">
      {/* Signal + Summary */}
      <div className="flex items-center gap-6">
        {/* Traffic Light */}
        <div className={cn("flex flex-col items-center gap-1.5 rounded-xl border-2 bg-slate-900 p-3", signal.ringColor)}>
          {(["green", "yellow", "red"] as const).map((color) => (
            <div
              key={color}
              className={cn(
                "h-6 w-6 rounded-full transition-opacity",
                trafficLight.overallSignal === color ? SIGNAL_CONFIG[color].bg : "bg-slate-700",
                trafficLight.overallSignal === color ? "opacity-100 ring-2 ring-white/30" : "opacity-40",
              )}
            />
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid flex-1 grid-cols-4 gap-2">
          {[
            { label: "Go", count: summary.go, color: "text-green-600" },
            { label: "Pivot", count: summary.pivot, color: "text-yellow-600" },
            { label: "Drop", count: summary.drop, color: "text-red-600" },
            { label: "대기", count: summary.pending, color: "text-slate-400" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border bg-card p-3 text-center">
              <div className={cn("text-2xl font-bold", item.color)}>{item.count}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Checkpoint Timeline */}
      {checkpoints.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold">체크포인트 이력</h4>
          <div className="relative ml-2.5">
            {checkpoints.map((cp, idx) => {
              const style = DECISION_STYLES[cp.decision as keyof typeof DECISION_STYLES] ?? DECISION_STYLES.go;
              const isLast = idx === checkpoints.length - 1;
              return (
                <div key={cp.id ?? `${cp.stage}-${idx}`} className="relative pb-3 pl-6 last:pb-0">
                  {!isLast && (
                    <div className="absolute left-[4.5px] top-3 h-full w-px bg-border" />
                  )}
                  <div className={cn("absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full", style.dot)} />
                  <div className={cn("rounded-lg border px-3 py-2", style.bg)}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {cp.stage}
                      </Badge>
                      <span className="text-xs font-medium">
                        {STAGE_NAMES[cp.stage] ?? cp.stage}
                      </span>
                      <Badge className={cn("ml-auto text-[10px]", style.color, style.bg)}>
                        {cp.decision.toUpperCase()}
                      </Badge>
                    </div>
                    {cp.reason && (
                      <p className="mt-1 text-xs text-muted-foreground">{cp.reason}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {new Date(cp.decidedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {checkpoints.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          아직 기록된 체크포인트가 없어요.
        </div>
      )}
    </div>
  );
}
