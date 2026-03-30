"use client";

import { useEffect, useState } from "react";
import { getProjectsOverview, getMonitoringStats, type ProjectsOverview, type MonitoringStats } from "@/lib/api-client";
import DashboardCard from "@/components/feature/DashboardCard";
import ProjectCard from "@/components/feature/ProjectCard";
import AgentActivitySummary from "@/components/feature/AgentActivitySummary";
import MonitorPanel from "@/components/feature/MonitorPanel";
import { cn } from "@/lib/utils";

const ORG_ID_KEY = "orgId";

function useOrgId(): string {
  const [orgId, setOrgId] = useState("");
  useEffect(() => {
    setOrgId(localStorage.getItem(ORG_ID_KEY) ?? "");
  }, []);
  return orgId;
}

export function Component() {
  const orgId = useOrgId();
  const [overview, setOverview] = useState<ProjectsOverview | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    Promise.all([
      getProjectsOverview(orgId),
      getMonitoringStats(orgId).catch(() => null),
    ])
      .then(([ov, mon]) => {
        if (cancelled) return;
        setOverview(ov);
        setMonitoring(mon);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [orgId]);

  if (!orgId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Projects</h1>
        <p className="text-muted-foreground">Organization을 먼저 선택해주세요.</p>
      </div>
    );
  }

  const gradeClass = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 75) return "text-blue-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Projects Overview</h1>

      {/* Summary Stats */}
      <DashboardCard title="Overall Status" loading={loading} error={error}>
        {overview && (
          <div className="flex flex-wrap gap-6">
            <div className="text-center">
              <div className={cn("text-4xl font-bold", gradeClass(overview.overallHealth))}>
                {overview.overallHealth.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{overview.totalProjects}</div>
              <div className="text-sm text-muted-foreground">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-500">
                {overview.projects.reduce((sum, p) => sum + p.activeAgents, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Active Agents</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-500">
                {overview.projects.reduce((sum, p) => sum + p.openTasks, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Open Tasks</div>
            </div>
          </div>
        )}
      </DashboardCard>

      {/* Monitoring */}
      {monitoring && (
        <div className="mt-4">
          <h2 className="mb-3 text-lg font-semibold">Workers Monitoring</h2>
          <MonitorPanel stats={monitoring} />
        </div>
      )}

      {/* Project Cards */}
      {overview && overview.projects.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Projects</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {overview.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Agent Activity */}
      {overview && (
        <div className="mt-6">
          <AgentActivitySummary
            last24h={overview.agentActivity.last24h}
            last7d={overview.agentActivity.last7d}
          />
        </div>
      )}
    </div>
  );
}
