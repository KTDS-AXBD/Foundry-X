"use client";

import type { AgentProfile, AgentStatus } from "@foundry-x/shared";

const colors = {
  bg: "#0a0a0a",
  text: "#ededed",
  card: "#1a1a1a",
  border: "#333",
  accent: "#3b82f6",
  muted: "#888",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

const cardStyle: React.CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: 20,
};

const statusColor = (s: AgentStatus): string => {
  switch (s) {
    case "idle":
    case "completed":
      return colors.green;
    case "running":
    case "waiting":
      return colors.accent;
    case "error":
      return colors.red;
    default:
      return colors.muted;
  }
};

const tierColor = (tier: "always" | "ask" | "never"): string => {
  switch (tier) {
    case "always":
      return colors.green;
    case "ask":
      return colors.yellow;
    case "never":
      return colors.red;
  }
};

const badgeStyle = (color: string): React.CSSProperties => ({
  display: "inline-block",
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 11,
  fontWeight: 600,
  color: "#fff",
  background: color,
});

export interface AgentCardProps {
  agent: AgentProfile;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const status = agent.activity?.status ?? "idle";

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {agent.name}
        </h3>
        <span style={badgeStyle(statusColor(status))}>{status}</span>
      </div>

      {/* Capabilities */}
      {agent.capabilities.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.accent,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Capabilities
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {agent.capabilities.map((cap, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  background: colors.bg,
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: colors.accent, fontWeight: 600 }}>
                    {cap.action}
                  </span>
                  <span style={{ color: colors.muted }}>-&gt; {cap.scope}</span>
                </div>
                {cap.tools.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {cap.tools.map((tool) => (
                      <span
                        key={tool}
                        style={{
                          padding: "1px 6px",
                          background: colors.border,
                          borderRadius: 4,
                          fontSize: 11,
                          color: colors.muted,
                        }}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Constraints */}
      {agent.constraints.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.accent,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Constraints
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {agent.constraints.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: `1px solid ${colors.border}`,
                  fontSize: 13,
                }}
              >
                <span style={badgeStyle(tierColor(c.tier))}>{c.tier}</span>
                <div>
                  <div style={{ color: colors.text }}>{c.rule}</div>
                  <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                    {c.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      {agent.activity && (
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.accent,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Activity
          </div>
          <div style={{ fontSize: 13 }}>
            {agent.activity.currentTask && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ color: colors.muted }}>Task: </span>
                <span style={{ color: colors.text }}>
                  {agent.activity.currentTask}
                </span>
              </div>
            )}
            {agent.activity.progress != null && (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ color: colors.muted }}>Progress</span>
                  <span style={{ color: colors.text }}>
                    {agent.activity.progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: colors.border,
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${agent.activity.progress}%`,
                      height: "100%",
                      background: colors.accent,
                      borderRadius: 3,
                      transition: "width 0.3s",
                    }}
                  />
                </div>
              </div>
            )}
            {agent.activity.tokenUsed != null && (
              <div>
                <span style={{ color: colors.muted }}>Tokens: </span>
                <span style={{ color: colors.text }}>
                  {agent.activity.tokenUsed.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
