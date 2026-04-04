import type { SkillMetricSummary } from "@foundry-x/shared";

interface Props {
  metrics: SkillMetricSummary | null;
}

const cards = [
  { key: "totalExecutions", label: "실행 횟수", format: (v: number) => String(v) },
  { key: "successRate", label: "성공률", format: (v: number) => `${(v * 100).toFixed(0)}%` },
  { key: "totalCostUsd", label: "총 비용", format: (v: number) => `$${v.toFixed(2)}` },
  { key: "avgTokensPerExecution", label: "평균 토큰", format: (v: number) => v.toLocaleString() },
] as const;

export default function SkillMetricsCards({ metrics }: Props) {
  if (!metrics) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        메트릭 데이터가 없어요.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(({ key, label, format }) => (
        <div key={key} className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-semibold">
            {format(metrics[key] as number)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}
