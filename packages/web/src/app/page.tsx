"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../lib/api-client";
import type {
  HealthScore,
  RequirementItem,
  HarnessIntegrity,
  FreshnessReport,
} from "@foundry-x/shared";
import DashboardCard from "../components/feature/DashboardCard";
import HarnessHealth from "../components/feature/HarnessHealth";

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

const gradeColor = (grade: string) => {
  if (grade === "A") return colors.green;
  if (grade === "B") return colors.accent;
  if (grade === "C") return colors.yellow;
  return colors.red;
};

/* ─── State helper ─── */
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useApi<T>(path: string): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetchApi<T>(path)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled)
          setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}

/* ─── Dashboard Page ─── */
export default function DashboardPage() {
  const health = useApi<HealthScore>("/health");
  const reqs = useApi<RequirementItem[]>("/requirements");
  const integrity = useApi<HarnessIntegrity>("/integrity");
  const freshness = useApi<FreshnessReport>("/freshness");

  const reqCounts = reqs.data
    ? {
        done: reqs.data.filter((r) => r.status === "done").length,
        inProgress: reqs.data.filter((r) => r.status === "in_progress").length,
        planned: reqs.data.filter((r) => r.status === "planned").length,
      }
    : null;

  return (
    <div style={{ color: colors.text }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
        Foundry-X Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
        }}
      >
        {/* SDD Triangle */}
        <DashboardCard
          title="SDD Triangle"
          loading={health.loading}
          error={health.error}
        >
          {health.data && (
            <>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 700,
                  color: gradeColor(health.data.grade),
                }}
              >
                {health.data.overall}%
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: gradeColor(health.data.grade),
                  marginBottom: 16,
                }}
              >
                Grade {health.data.grade}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                  fontSize: 13,
                  color: colors.muted,
                }}
              >
                <div>
                  Spec↔Code{" "}
                  <strong style={{ color: colors.text }}>
                    {health.data.specToCode}%
                  </strong>
                </div>
                <div>
                  Code↔Test{" "}
                  <strong style={{ color: colors.text }}>
                    {health.data.codeToTest}%
                  </strong>
                </div>
                <div>
                  Spec↔Test{" "}
                  <strong style={{ color: colors.text }}>
                    {health.data.specToTest}%
                  </strong>
                </div>
              </div>
            </>
          )}
        </DashboardCard>

        {/* Sprint Status */}
        <DashboardCard
          title="Sprint Status"
          loading={reqs.loading}
          error={reqs.error}
        >
          {reqCounts && (
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: colors.green,
                  }}
                >
                  {reqCounts.done}
                </div>
                <div style={{ fontSize: 13, color: colors.muted }}>Done</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: colors.yellow,
                  }}
                >
                  {reqCounts.inProgress}
                </div>
                <div style={{ fontSize: 13, color: colors.muted }}>
                  In Progress
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: colors.muted,
                  }}
                >
                  {reqCounts.planned}
                </div>
                <div style={{ fontSize: 13, color: colors.muted }}>
                  Planned
                </div>
              </div>
            </div>
          )}
        </DashboardCard>

        {/* Harness Health */}
        <DashboardCard
          title="Harness Health"
          loading={integrity.loading}
          error={integrity.error}
        >
          {integrity.data && <HarnessHealth data={integrity.data} />}
        </DashboardCard>

        {/* Harness Freshness */}
        <DashboardCard
          title="Harness Freshness"
          loading={freshness.loading}
          error={freshness.error}
        >
          {freshness.data && (
            <>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: freshness.data.overallStale
                    ? colors.red
                    : colors.green,
                  marginBottom: 12,
                }}
              >
                {freshness.data.overallStale ? "Stale detected" : "All fresh"}
              </div>
              <div style={{ fontSize: 13 }}>
                {freshness.data.documents.map((doc) => (
                  <div
                    key={doc.file}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px 0",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "60%",
                      }}
                    >
                      {doc.file}
                    </span>
                    <span
                      style={{
                        color: doc.stale ? colors.red : colors.green,
                        fontWeight: 600,
                      }}
                    >
                      {doc.stale ? `${doc.staleDays}d stale` : "Fresh"}
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: colors.muted,
                  marginTop: 8,
                }}
              >
                Checked: {freshness.data.checkedAt}
              </div>
            </>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
