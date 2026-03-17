"use client";

import type { HarnessIntegrity } from "@foundry-x/shared";

const colors = {
  text: "#ededed",
  border: "#333",
  muted: "#888",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
};

export interface HarnessHealthProps {
  data: HarnessIntegrity;
}

export default function HarnessHealth({ data }: HarnessHealthProps) {
  const scoreColor = data.passed ? colors.green : colors.red;

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: scoreColor,
          }}
        >
          {data.score}%
        </span>
        <span
          style={{
            fontSize: 14,
            color: scoreColor,
          }}
        >
          {data.passed ? "PASSED" : "FAILED"}
        </span>
      </div>
      <div style={{ fontSize: 13, color: colors.muted, marginTop: 8 }}>
        {data.checks.length} checks executed
      </div>
      <div style={{ marginTop: 12, fontSize: 13 }}>
        {data.checks.map((ck) => (
          <div
            key={ck.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <span style={{ color: colors.text }}>{ck.name}</span>
            <span
              style={{
                color:
                  ck.level === "PASS"
                    ? colors.green
                    : ck.level === "WARN"
                      ? colors.yellow
                      : colors.red,
                fontWeight: 600,
              }}
            >
              {ck.level}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
