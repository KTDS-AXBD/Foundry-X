/**
 * F493: MetricBlock — MetricSchema 배열 렌더러
 */
interface Metric {
  value: string;
  label: string;
  color?: "default" | "mint" | "blue" | "amber" | "red" | "purple";
}

const COLOR_MAP: Record<string, string> = {
  mint: "var(--discovery-mint)",
  blue: "var(--discovery-blue)",
  amber: "var(--discovery-amber)",
  red: "var(--discovery-red)",
  purple: "var(--discovery-purple)",
  default: "var(--foreground)",
};

interface MetricBlockProps {
  metrics: Metric[];
}

export function MetricBlock({ metrics }: MetricBlockProps) {
  if (metrics.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-4">
      {metrics.map((m, i) => (
        <div
          key={i}
          className="flex flex-col items-center rounded-lg border px-4 py-3 min-w-[120px]"
        >
          <span
            className="text-xl font-bold"
            style={{ color: COLOR_MAP[m.color ?? "default"] }}
          >
            {m.value}
          </span>
          <span className="text-xs text-muted-foreground mt-1 text-center">{m.label}</span>
        </div>
      ))}
    </div>
  );
}
