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
import { cn } from "@/lib/utils";

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

const gradeClass = (grade: string) => {
  if (grade === "A") return "text-green-500";
  if (grade === "B") return "text-blue-500";
  if (grade === "C") return "text-yellow-500";
  return "text-destructive";
};

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
    <div>
      <h1 className="mb-6 text-2xl font-bold">Foundry-X Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* SDD Triangle */}
        <DashboardCard
          title="SDD Triangle"
          loading={health.loading}
          error={health.error}
        >
          {health.data && (
            <>
              <div className={cn("text-5xl font-bold", gradeClass(health.data.grade))}>
                {health.data.overall}%
              </div>
              <div className={cn("mb-4 text-xl font-semibold", gradeClass(health.data.grade))}>
                Grade {health.data.grade}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div>
                  Spec↔Code{" "}
                  <strong className="text-foreground">
                    {health.data.specToCode}%
                  </strong>
                </div>
                <div>
                  Code↔Test{" "}
                  <strong className="text-foreground">
                    {health.data.codeToTest}%
                  </strong>
                </div>
                <div>
                  Spec↔Test{" "}
                  <strong className="text-foreground">
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
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-500">
                  {reqCounts.done}
                </div>
                <div className="text-sm text-muted-foreground">Done</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-500">
                  {reqCounts.inProgress}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-muted-foreground">
                  {reqCounts.planned}
                </div>
                <div className="text-sm text-muted-foreground">Planned</div>
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
                className={cn(
                  "mb-3 text-sm font-semibold",
                  freshness.data.overallStale
                    ? "text-destructive"
                    : "text-green-500",
                )}
              >
                {freshness.data.overallStale ? "Stale detected" : "All fresh"}
              </div>
              <div className="text-sm">
                {freshness.data.documents.map((doc) => (
                  <div
                    key={doc.file}
                    className="flex justify-between border-b border-border py-1"
                  >
                    <span className="max-w-[60%] truncate">{doc.file}</span>
                    <span
                      className={cn(
                        "font-semibold",
                        doc.stale ? "text-destructive" : "text-green-500",
                      )}
                    >
                      {doc.stale ? `${doc.staleDays}d stale` : "Fresh"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Checked: {freshness.data.checkedAt}
              </div>
            </>
          )}
        </DashboardCard>
      </div>
    </div>
  );
}
