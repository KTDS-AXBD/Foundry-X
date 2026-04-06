// ─── F362: 에이전트/스킬 활용률 수평 바 차트 (Sprint 164) ───

import type { AgentUsageData } from "@foundry-x/shared";

interface Props {
  items: AgentUsageData[];
}

export function AgentUsageChart({ items }: Props) {
  if (items.length === 0) {
    return <p style={{ color: "#9ca3af", fontSize: 14 }}>활용 데이터가 없어요</p>;
  }

  const maxCount = Math.max(...items.map((i) => i.eventCount), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((item) => (
        <div key={item.source} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 120,
              fontSize: 13,
              color: item.isUnused ? "#ef4444" : "#374151",
              fontWeight: item.isUnused ? 600 : 400,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            title={item.source}
          >
            {item.source}
          </span>
          <div
            style={{
              flex: 1,
              height: 20,
              background: "#f3f4f6",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(item.eventCount / maxCount) * 100}%`,
                height: "100%",
                background: item.isUnused ? "#fecaca" : "#6366f1",
                borderRadius: 4,
                transition: "width 0.3s ease",
                minWidth: item.eventCount > 0 ? 2 : 0,
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: "#6b7280", minWidth: 40, textAlign: "right" }}>
            {item.eventCount}
          </span>
        </div>
      ))}
    </div>
  );
}
