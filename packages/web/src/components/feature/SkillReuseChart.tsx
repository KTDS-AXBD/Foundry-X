// ─── F362: Skill 재사용률 도넛 차트 (Sprint 164) ───

import type { SkillReuseData } from "@foundry-x/shared";

interface Props {
  items: SkillReuseData[];
  overallRate: number;
}

const TYPE_COLORS: Record<string, string> = {
  manual: "#94a3b8",
  derived: "#6366f1",
  captured: "#f59e0b",
  forked: "#10b981",
};

const TYPE_LABELS: Record<string, string> = {
  manual: "Manual",
  derived: "Derived",
  captured: "Captured",
  forked: "Forked",
};

export function SkillReuseChart({ items, overallRate }: Props) {
  // derivationType별 집계
  const groups = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.derivationType] = (acc[item.derivationType] ?? 0) + item.totalExecutions;
    return acc;
  }, {});

  const total = Object.values(groups).reduce((s, v) => s + v, 0);
  const segments = Object.entries(groups).map(([type, count]) => ({
    type,
    count,
    pct: total > 0 ? (count / total) * 100 : 0,
  }));

  // SVG 도넛 차트
  const radius = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {segments.map((seg) => {
          const dashLength = (seg.pct / 100) * circumference;
          const offset = cumulativeOffset;
          cumulativeOffset += dashLength;
          return (
            <circle
              key={seg.type}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={TYPE_COLORS[seg.type] ?? "#e5e7eb"}
              strokeWidth={20}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        {total === 0 && (
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={20} />
        )}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={20} fontWeight={700} fill="#111827">
          {overallRate}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={11} fill="#6b7280">
          재사용률
        </text>
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map((seg) => (
          <div key={seg.type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: TYPE_COLORS[seg.type] }} />
            <span style={{ fontSize: 13, color: "#374151" }}>
              {TYPE_LABELS[seg.type] ?? seg.type}
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {seg.count} ({seg.pct.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
