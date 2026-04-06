// F391: Builder Quality — 자동-수동 상관관계 패널 (Sprint 178)

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CorrelationResult {
  dimension: string;
  pearson: number;
  sampleSize: number;
  autoMean: number;
  manualMean: number;
}

interface CorrelationSummary {
  correlations: CorrelationResult[];
  overallPearson: number;
  totalEvaluations: number;
  calibrationStatus: "good" | "needs_attention" | "insufficient_data";
}

interface CorrelationPanelProps {
  data: CorrelationSummary | null;
  loading?: boolean;
}

const STATUS_CONFIG = {
  good: { label: "양호", variant: "default" as const, color: "text-green-600" },
  needs_attention: { label: "주의 필요", variant: "secondary" as const, color: "text-amber-600" },
  insufficient_data: { label: "데이터 부족", variant: "outline" as const, color: "text-muted-foreground" },
};

const DIMENSION_LABELS: Record<string, string> = {
  build: "Build",
  ui: "UI",
  functional: "Functional",
  prd: "PRD",
  code: "Code",
};

function pearsonColor(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return "text-green-600";
  if (abs >= 0.4) return "text-amber-600";
  return "text-red-600";
}

export default function CorrelationPanel({ data, loading }: CorrelationPanelProps) {
  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">상관관계 분석 로딩 중...</div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground italic">
          수동 평가 데이터가 없어요. 프로토타입 상세 페이지에서 평가를 등록하세요.
        </div>
      </Card>
    );
  }

  const statusCfg = STATUS_CONFIG[data.calibrationStatus];

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">자동-수동 평가 상관관계</div>
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>전체 평가: {data.totalEvaluations}건</span>
        <span>
          Overall r ={" "}
          <span className={`font-medium ${pearsonColor(data.overallPearson)}`}>
            {data.overallPearson.toFixed(3)}
          </span>
        </span>
      </div>

      {data.correlations.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-1 font-medium">차원</th>
              <th className="text-right py-1 font-medium">Pearson r</th>
              <th className="text-right py-1 font-medium">자동 평균</th>
              <th className="text-right py-1 font-medium">수동 평균</th>
              <th className="text-right py-1 font-medium">N</th>
            </tr>
          </thead>
          <tbody>
            {data.correlations.map((c) => (
              <tr key={c.dimension} className="border-b border-border/50">
                <td className="py-1">{DIMENSION_LABELS[c.dimension] ?? c.dimension}</td>
                <td className={`text-right py-1 font-mono ${pearsonColor(c.pearson)}`}>
                  {c.pearson.toFixed(3)}
                </td>
                <td className="text-right py-1 font-mono">{(c.autoMean * 100).toFixed(0)}%</td>
                <td className="text-right py-1 font-mono">{(c.manualMean * 100).toFixed(0)}%</td>
                <td className="text-right py-1 text-muted-foreground">{c.sampleSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data.calibrationStatus === "needs_attention" && (
        <div className="text-xs text-amber-600 bg-amber-50 rounded p-2">
          일부 차원의 상관관계가 낮아요. 평가 기준을 조정하거나 추가 수동 평가를 수집하는 것을 권장해요.
        </div>
      )}
    </Card>
  );
}
