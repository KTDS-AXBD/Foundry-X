"use client";

const colors = {
  text: "#ededed",
  border: "#333",
  accent: "#3b82f6",
  muted: "#888",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  color: colors.accent,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  borderBottom: `2px solid ${colors.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  borderBottom: `1px solid ${colors.border}`,
};

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

export interface TokenUsageChartProps {
  title: string;
  data: Record<string, { tokens: number; cost: number }>;
}

export default function TokenUsageChart({ title, data }: TokenUsageChartProps) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b.cost - a.cost);

  if (entries.length === 0) {
    return (
      <div>
        <h2
          style={{
            margin: "0 0 16px",
            fontSize: 16,
            fontWeight: 600,
            color: colors.accent,
          }}
        >
          {title}
        </h2>
        <p style={{ color: colors.muted, fontSize: 13 }}>No data available.</p>
      </div>
    );
  }

  const totalCost = entries.reduce((sum, [, v]) => sum + v.cost, 0);

  return (
    <div>
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 16,
          fontWeight: 600,
          color: colors.accent,
        }}
      >
        {title}
      </h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Tokens</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Cost</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, val]) => {
            const share = totalCost > 0 ? (val.cost / totalCost) * 100 : 0;
            return (
              <tr key={name}>
                <td style={{ ...tdStyle, color: colors.text, fontWeight: 500 }}>
                  {name}
                </td>
                <td
                  style={{ ...tdStyle, textAlign: "right", color: colors.muted }}
                >
                  {formatTokens(val.tokens)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", color: colors.text }}>
                  {formatCost(val.cost)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 60,
                        height: 6,
                        background: colors.border,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${share}%`,
                          height: "100%",
                          background: colors.accent,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: colors.muted,
                        minWidth: 36,
                      }}
                    >
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
