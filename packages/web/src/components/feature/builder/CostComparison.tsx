// F390: Builder Quality — CLI vs API 비용 비교 (Sprint 178)

import { Card } from "@/components/ui/card";

interface CostComparisonProps {
  generationModes: Record<string, number>;
  totalCostSaved: number;
}

export default function CostComparison({
  generationModes,
  totalCostSaved,
}: CostComparisonProps) {
  const cliCount = generationModes["cli"] ?? 0;
  const apiCount = generationModes["api"] ?? 0;
  const total = cliCount + apiCount;

  const cliPct = total > 0 ? (cliCount / total) * 100 : 0;
  const apiPct = total > 0 ? (apiCount / total) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-3">Generation Mode 비용 비교</div>
      <div className="space-y-3">
        {/* 모드 비율 바 */}
        <div className="flex h-6 rounded overflow-hidden bg-muted">
          {cliPct > 0 && (
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${cliPct}%` }}
            >
              {cliPct >= 15 ? `CLI ${cliPct.toFixed(0)}%` : ""}
            </div>
          )}
          {apiPct > 0 && (
            <div
              className="bg-amber-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${apiPct}%` }}
            >
              {apiPct >= 15 ? `API ${apiPct.toFixed(0)}%` : ""}
            </div>
          )}
        </div>

        {/* 상세 */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            CLI (Max): {cliCount}회 ($0)
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            API: {apiCount}회
          </div>
        </div>

        {totalCostSaved > 0 && (
          <div className="text-xs text-green-600 font-medium">
            CLI 전환으로 약 ${totalCostSaved.toFixed(2)} 절감
          </div>
        )}
      </div>
    </Card>
  );
}
