/**
 * F262: 포트폴리오 신호등 요약 컴포넌트
 */
import { cn } from "@/lib/utils";
import type { PortfolioSummary as PortfolioSummaryType } from "@/lib/api-client";

interface Props {
  summary: PortfolioSummaryType;
}

export default function PortfolioSummary({ summary }: Props) {
  const { totalItems, bySignal, avgCompletionRate, bottleneck } = summary;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="text-sm font-bold">포트폴리오 요약</h2>

      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{totalItems}</div>
          <div className="text-xs text-muted-foreground">전체 아이템</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{avgCompletionRate}%</div>
          <div className="text-xs text-muted-foreground">평균 완료율</div>
        </div>
        <div>
          <div className="text-2xl font-bold">
            {Object.keys(summary.byPipelineStage).length}
          </div>
          <div className="text-xs text-muted-foreground">활성 단계</div>
        </div>
      </div>

      {/* Signal Distribution */}
      <div className="flex items-center gap-4 justify-center">
        <SignalBadge color="bg-green-500" label="Green" count={bySignal.green} />
        <SignalBadge color="bg-yellow-400" label="Yellow" count={bySignal.yellow} />
        <SignalBadge color="bg-red-500" label="Red" count={bySignal.red} />
      </div>

      {/* Bottleneck */}
      {bottleneck && bottleneck.itemCount > 1 && (
        <div className="text-xs text-muted-foreground border-t pt-3">
          병목:{" "}
          <span className="font-medium text-foreground">
            {bottleneck.stageId} {bottleneck.stageName}
          </span>
          {" "}({bottleneck.itemCount}건 정체)
        </div>
      )}
    </div>
  );
}

function SignalBadge({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-full", color)} />
      <span className="text-sm font-medium">{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
