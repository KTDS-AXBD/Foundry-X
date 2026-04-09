/**
 * F493: ChartBlock — ChartDataSchema → recharts BarChart 렌더러
 * recharts는 이미 packages/web에 설치됨 (chart.js 대신 사용)
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string[];
}

interface ChartData {
  type: "bar" | "doughnut" | "line";
  labels: string[];
  datasets: ChartDataset[];
}

interface ChartBlockProps {
  chart: ChartData;
}

function formatValue(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}조`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천억`;
  if (value >= 100) return `${value}억`;
  return String(value);
}

export function ChartBlock({ chart }: ChartBlockProps) {
  // recharts용 데이터 변환: labels → {name, dataset1, dataset2, ...}
  const data = chart.labels.map((label, i) => {
    const entry: Record<string, string | number> = { name: label };
    chart.datasets.forEach((ds) => {
      entry[ds.label] = ds.data[i] ?? 0;
    });
    return entry;
  });

  // 기본 색상 팔레트
  const defaultColors = [
    "var(--discovery-mint)",
    "var(--discovery-blue)",
    "var(--discovery-amber)",
    "var(--discovery-red)",
    "var(--discovery-purple)",
  ];

  if (chart.type === "bar") {
    return (
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(value) => [formatValue(Number(value)), ""]} />
            {chart.datasets.length > 1 && <Legend />}
            {chart.datasets.map((ds, dsIdx) => (
              <Bar key={ds.label} dataKey={ds.label} name={ds.label}>
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      ds.backgroundColor?.[i] ??
                      ds.backgroundColor?.[0] ??
                      defaultColors[dsIdx % defaultColors.length]
                    }
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // doughnut / line은 현재 bar로 폴백
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatValue} tick={{ fontSize: 11 }} width={60} />
          <Tooltip formatter={(value) => [formatValue(Number(value)), ""]} />
          {chart.datasets.map((ds, dsIdx) => (
            <Bar
              key={ds.label}
              dataKey={ds.label}
              fill={defaultColors[dsIdx % defaultColors.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
