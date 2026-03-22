"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { SrStatsResponse } from "@/lib/api-client";

interface SrStatsCardsProps {
  stats: SrStatsResponse;
}

export default function SrStatsCards({ stats }: SrStatsCardsProps) {
  const avgConfidence = stats.typeDistribution.length > 0
    ? stats.typeDistribution.reduce((sum, t) => sum + t.avg_confidence * t.count, 0) /
      stats.typeDistribution.reduce((sum, t) => sum + t.count, 0)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total SRs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{stats.totalCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Confidence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {(avgConfidence * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Misclassification Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${stats.misclassificationRate > 0.1 ? "text-destructive" : "text-green-500"}`}>
            {(stats.misclassificationRate * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
