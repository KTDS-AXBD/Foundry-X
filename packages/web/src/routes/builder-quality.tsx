// F390+F391: Builder Quality Dashboard (Sprint 178)
"use client";

import { useEffect, useState } from "react";
import {
  fetchQualityDashboardSummary,
  fetchQualityDimensions,
  fetchQualityTrend,
  fetchCorrelation,
  type QualityDashboardSummaryResponse,
  type DimensionAverageResponse,
  type QualityTrendResponse,
  type CorrelationSummaryResponse,
} from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import ScoreCardGrid from "@/components/feature/builder/ScoreCardGrid";
import DimensionRadar from "@/components/feature/builder/DimensionRadar";
import QualityTrendLine from "@/components/feature/builder/QualityTrendLine";
import CostComparison from "@/components/feature/builder/CostComparison";
import CorrelationPanel from "@/components/feature/builder/CorrelationPanel";

export function Component() {
  const [summary, setSummary] = useState<QualityDashboardSummaryResponse | null>(null);
  const [dimensions, setDimensions] = useState<DimensionAverageResponse | null>(null);
  const [trend, setTrend] = useState<QualityTrendResponse | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchQualityDashboardSummary().catch(() => null),
      fetchQualityDimensions().catch(() => null),
      fetchQualityTrend(30).catch(() => null),
      fetchCorrelation().catch(() => null),
    ])
      .then(([s, d, t, c]) => {
        setSummary(s);
        setDimensions(d);
        setTrend(t);
        setCorrelation(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading quality data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Builder Quality Dashboard</h1>

      {/* Score Cards */}
      {summary && (
        <ScoreCardGrid
          averageScore={summary.averageScore}
          above80Pct={summary.above80Pct}
          totalCostSaved={summary.totalCostSaved}
          totalPrototypes={summary.totalPrototypes}
        />
      )}

      {/* Radar + Trend (2-col) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">5차원 품질 분포</div>
          {dimensions ? (
            <DimensionRadar dimensions={dimensions} />
          ) : (
            <div className="text-sm text-muted-foreground italic py-8 text-center">
              차원별 데이터가 없어요.
            </div>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-sm font-medium mb-2">품질 점수 추이 (30일)</div>
          <QualityTrendLine points={trend?.points ?? []} />
        </Card>
      </div>

      {/* Cost Comparison */}
      {summary && (
        <CostComparison
          generationModes={summary.generationModes}
          totalCostSaved={summary.totalCostSaved}
        />
      )}

      {/* Correlation Panel (F391) */}
      <CorrelationPanel data={correlation} />
    </div>
  );
}
