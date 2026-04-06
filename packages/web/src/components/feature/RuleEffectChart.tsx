// ─── F361: Rule 효과 점수 바 차트 (Sprint 164) ───

import type { RuleEffectiveness } from "@foundry-x/shared";

interface Props {
  items: RuleEffectiveness[];
}

function scoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

export function RuleEffectChart({ items }: Props) {
  if (items.length === 0) {
    return <p style={{ color: "#9ca3af", fontSize: 14 }}>승인된 Rule이 없어요</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={item.proposalId} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 140,
              fontSize: 13,
              color: "#374151",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
            title={item.ruleFilename}
          >
            {item.ruleFilename}
          </span>
          {item.status === "measuring" || item.status === "insufficient_data" ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 20,
                  background: "#f3f4f6",
                  borderRadius: 4,
                }}
              />
              <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 60 }}>
                {item.status === "measuring" ? "측정 중..." : "데이터 부족"}
              </span>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
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
                    width: `${item.effectivenessScore}%`,
                    height: "100%",
                    background: scoreColor(item.effectivenessScore),
                    borderRadius: 4,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: scoreColor(item.effectivenessScore),
                  minWidth: 40,
                  textAlign: "right",
                }}
              >
                {item.effectivenessScore}%
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
