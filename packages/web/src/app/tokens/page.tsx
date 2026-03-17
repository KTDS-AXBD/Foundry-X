"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../lib/api-client";
import type { TokenSummary } from "@foundry-x/shared";
import TokenUsageChart from "../../components/feature/TokenUsageChart";

/* ─── Styles ─── */
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
  padding: 24,
};

/* ─── Helpers ─── */
function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}



/* ─── Tokens Page ─── */
export default function TokensPage() {
  const [summary, setSummary] = useState<TokenSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApi<TokenSummary>("/tokens/summary")
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ color: colors.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Token & Cost Management
      </h1>

      {loading && <p style={{ color: colors.muted }}>Loading token data...</p>}
      {error && <p style={{ color: colors.red, fontSize: 13 }}>{error}</p>}

      {summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary Card */}
          <div style={cardStyle}>
            <h2
              style={{
                margin: "0 0 16px",
                fontSize: 16,
                fontWeight: 600,
                color: colors.accent,
              }}
            >
              Summary
            </h2>
            <div style={{ display: "flex", gap: 48 }}>
              <div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: summary.totalCost > 10
                      ? colors.red
                      : summary.totalCost > 5
                        ? colors.yellow
                        : colors.green,
                  }}
                >
                  {formatCost(summary.totalCost)}
                </div>
                <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                  Total Cost
                </div>
              </div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 700, color: colors.text }}>
                  {summary.period}
                </div>
                <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                  Period
                </div>
              </div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 700, color: colors.accent }}>
                  {Object.keys(summary.byModel).length}
                </div>
                <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                  Models
                </div>
              </div>
              <div>
                <div style={{ fontSize: 36, fontWeight: 700, color: colors.accent }}>
                  {Object.keys(summary.byAgent).length}
                </div>
                <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>
                  Agents
                </div>
              </div>
            </div>
          </div>

          {/* By Model */}
          <div style={cardStyle}>
            <TokenUsageChart title="Cost by Model" data={summary.byModel} />
          </div>

          {/* By Agent */}
          <div style={cardStyle}>
            <TokenUsageChart title="Cost by Agent" data={summary.byAgent} />
          </div>
        </div>
      )}
    </div>
  );
}
