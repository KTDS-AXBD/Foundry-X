/**
 * F262: 아이템별 BD 프로세스 진행 카드
 */
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { ProcessProgress } from "@/lib/api-client";

const SIGNAL_STYLES = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
} as const;

const SIGNAL_LABEL = {
  green: "Green",
  yellow: "Yellow",
  red: "Red",
} as const;

interface Props {
  progress: ProcessProgress;
}

export default function ProcessProgressCard({ progress }: Props) {
  const { trafficLight, discoveryStages, completedStageCount, totalStageCount } = progress;
  const completionPct = Math.round((completedStageCount / totalStageCount) * 100);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{progress.title}</h3>
          <Badge variant="outline" className="text-xs">
            {progress.pipelineStage}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={cn("h-2.5 w-2.5 rounded-full", SIGNAL_STYLES[trafficLight.overallSignal])}
          />
          <span className="text-xs font-medium">
            {SIGNAL_LABEL[trafficLight.overallSignal]}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>
            {completedStageCount}/{totalStageCount} 단계 ({completionPct}%)
          </span>
          <span>현재: {progress.currentDiscoveryStage}</span>
        </div>
        <div className="flex gap-0.5">
          {discoveryStages.map((stage) => (
            <div
              key={stage.stageId}
              className={cn(
                "h-2 flex-1 rounded-sm",
                stage.hasArtifacts ? "bg-primary" : "bg-muted",
              )}
              title={`${stage.stageId} ${stage.stageName}${stage.hasArtifacts ? ` (${stage.artifactCount}건)` : ""}`}
            />
          ))}
        </div>
      </div>

      {/* Traffic Light Summary */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Go <span className="font-medium text-green-600">{trafficLight.go}</span>
        </span>
        <span>
          Pivot <span className="font-medium text-yellow-600">{trafficLight.pivot}</span>
        </span>
        <span>
          Drop <span className="font-medium text-red-600">{trafficLight.drop}</span>
        </span>
        <span>
          대기 <span className="font-medium">{trafficLight.pending}</span>
        </span>
        {progress.commitGate && (
          <span className="ml-auto">
            Gate: <span className="font-medium">{progress.commitGate.decision}</span>
          </span>
        )}
      </div>

      {/* Last Decision */}
      {progress.lastDecision && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          최근 결정:{" "}
          <span className="font-medium">{progress.lastDecision.decision}</span>
          {" — "}
          {progress.lastDecision.comment.slice(0, 50)}
          {progress.lastDecision.comment.length > 50 ? "..." : ""}
        </div>
      )}
    </div>
  );
}
