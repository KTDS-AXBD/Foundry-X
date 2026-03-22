"use client";

import { useEffect, useState } from "react";
import type { ModelQualityMetric, AgentModelCell } from "@foundry-x/shared";
import { getModelQuality, getAgentModelMatrix } from "@/lib/api-client";
import QualityMetricCard from "@/components/feature/QualityMetricCard";
import AgentModelHeatmap from "@/components/feature/AgentModelHeatmap";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = [7, 30, 90] as const;

export default function ModelQualityTab() {
  const [metrics, setMetrics] = useState<ModelQualityMetric[]>([]);
  const [matrix, setMatrix] = useState<AgentModelCell[]>([]);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getModelQuality(days), getAgentModelMatrix(days)])
      .then(([qualityRes, matrixRes]) => {
        if (!cancelled) {
          setMetrics(qualityRes.metrics);
          setMatrix(matrixRes.matrix);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  return (
    <div className="flex flex-col gap-6">
      {/* Period filter */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              days === d
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {d} days
          </button>
        ))}
      </div>

      {loading && <p className="text-muted-foreground">Loading model quality data...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && metrics.length === 0 && (
        <p className="text-muted-foreground">No model execution data available.</p>
      )}

      {!loading && !error && metrics.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {metrics.map((m) => (
              <QualityMetricCard key={m.model} metric={m} />
            ))}
          </div>

          <h3 className="text-lg font-semibold">Agent × Model Matrix</h3>
          <AgentModelHeatmap matrix={matrix} />
        </>
      )}
    </div>
  );
}
