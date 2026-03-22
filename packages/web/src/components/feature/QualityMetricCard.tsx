"use client";

import type { ModelQualityMetric } from "@foundry-x/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function rateColor(rate: number): string {
  if (rate >= 90) return "text-green-500";
  if (rate >= 70) return "text-yellow-500";
  return "text-destructive";
}

function rateBg(rate: number): string {
  if (rate >= 90) return "bg-green-500";
  if (rate >= 70) return "bg-yellow-500";
  return "bg-destructive";
}

export default function QualityMetricCard({ metric }: { metric: ModelQualityMetric }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{metric.model}</CardTitle>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium text-white",
              rateBg(metric.successRate),
            )}
          >
            {metric.successRate.toFixed(1)}%
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 w-full rounded-full bg-muted">
          <div
            className={cn("h-2 rounded-full", rateBg(metric.successRate))}
            style={{ width: `${Math.min(metric.successRate, 100)}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">Executions</div>
            <div className="font-semibold">{metric.totalExecutions.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Avg Duration</div>
            <div className="font-semibold">{(metric.avgDurationMs / 1000).toFixed(1)}s</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total Cost</div>
            <div className={cn("font-semibold", rateColor(metric.successRate))}>
              ${metric.totalCostUsd.toFixed(4)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Efficiency</div>
            <div className="font-semibold">{metric.tokenEfficiency.toFixed(2)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
