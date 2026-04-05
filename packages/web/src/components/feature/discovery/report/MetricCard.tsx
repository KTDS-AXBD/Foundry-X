/**
 * Sprint 156: F346 — 숫자 메트릭 카드
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
}

const TrendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
} as const;

const trendColors = {
  up: "text-green-600",
  down: "text-red-600",
  neutral: "text-muted-foreground",
} as const;

export function MetricCard({ label, value, unit, trend }: MetricCardProps) {
  const Icon = trend ? TrendIcon[trend] : null;

  return (
    <div className="rounded-lg border bg-card p-4 text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold flex items-center justify-center gap-1">
        {value}
        {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
        {Icon && <Icon className={`size-4 ${trendColors[trend!]}`} />}
      </div>
    </div>
  );
}
