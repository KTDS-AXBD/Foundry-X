"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "@/lib/api-client";
import type {
  HealthScore,
  RequirementItem,
  HarnessIntegrity,
  FreshnessReport,
} from "@foundry-x/shared";
import DashboardCard from "@/components/feature/DashboardCard";
import HarnessHealth from "@/components/feature/HarnessHealth";
import { STAGES } from "@/components/feature/ProcessStageGuide";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ClipboardList,
  Lightbulb,
  FileText,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodoSection } from "@/components/feature/TodoSection";
import { WorkGuideSection } from "@/components/feature/WorkGuideSection";

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  프로세스 파이프라인 진행률                                          */
/* ------------------------------------------------------------------ */

interface PipelineStats {
  totalItems: number;
  byStage: Record<string, number>;
  avgDaysInStage: Record<string, number>;
}

const stageColors = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-indigo-500",
  "bg-rose-500",
];

// BD 파이프라인 단계 키(stage 번호 1-6) → DB 스테이지명 매핑
const STAGE_NUM_TO_DB_KEY: Record<number, string> = {
  1: "REGISTERED",
  2: "DISCOVERY",
  3: "FORMALIZATION",
  4: "REVIEW",
  5: "DECISION",
  6: "OFFERING",
};

function ProcessPipeline({ stats }: { stats: PipelineStats | null }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        프로세스 파이프라인
      </h2>
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const dbKey = STAGE_NUM_TO_DB_KEY[stage.stage] ?? stage.label;
          const count = stats?.byStage?.[dbKey] ?? stats?.byStage?.[stage.label] ?? 0;
          return (
            <div key={stage.stage} className="flex items-center">
              <Link
                to={stage.paths[0]}
                className="group flex flex-col items-center rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full text-white text-sm font-bold",
                    stageColors[i],
                  )}
                >
                  {count}
                </div>
                <span className="mt-1.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                  {stage.stage}. {stage.label}
                </span>
              </Link>
              {i < STAGES.length - 1 && (
                <ArrowRight className="mx-0.5 size-3.5 shrink-0 text-muted-foreground/40" />
              )}
            </div>
          );
        })}
      </div>
      {stats && (
        <div className="mt-3 text-xs text-muted-foreground">
          전체 {stats.totalItems}건 진행 중
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  퀵 액션                                                            */
/* ------------------------------------------------------------------ */

const quickActions = [
  { label: "SR 등록", href: "/collection/sr", icon: ClipboardList },
  { label: "아이디어 추가", href: "/ax-bd/ideas", icon: Lightbulb },
  { label: "Spec 생성", href: "/shaping/prd", icon: FileText },
  { label: "파이프라인", href: "/validation/pipeline", icon: GitBranch },
];

function QuickActions() {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        퀵 액션
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Link key={action.href} to={action.href}>
            <Button
              variant="outline"
              className="h-auto w-full justify-start gap-2 px-3 py-2.5"
            >
              <action.icon className="size-4 shrink-0" />
              <span className="text-sm">{action.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard Page                                                     */
/* ------------------------------------------------------------------ */

// Sprint 223: F460 — /biz-items/summary로 파이프라인 카운트 실제 데이터 연동
const BD_STAGE_KEYS = ["REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING"];

export function Component() {
  const health = useApi<HealthScore>("/health");
  const reqs = useApi<RequirementItem[]>("/requirements");
  const integrity = useApi<HarnessIntegrity>("/integrity");
  const freshness = useApi<FreshnessReport>("/freshness");
  const pipelineStats = useApi<PipelineStats>("/pipeline/stats");
  const bizItemSummaryRaw = useApi<{ items: Array<{ bizItemId: string; title: string; currentStage: number }> }>("/biz-items/summary");
  const bizItemSummaryData = bizItemSummaryRaw.data?.items ?? null;

  // biz-items/summary → byStage (stageNum 기반 집계)
  const bdByStage = useMemo(() => {
    if (!bizItemSummaryData) return {};
    const counts: Record<string, number> = {};
    for (const item of bizItemSummaryData) {
      const key = BD_STAGE_KEYS[item.currentStage - 1] ?? "REGISTERED";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [bizItemSummaryData]);

  // pipeline/stats byStage 키가 DB 스테이지명(DISCOVERY 등)이지만,
  // dashboard STAGES.label은 한국어(수집, 발굴...) — 실제 수치는 bizItemSummary로 보완
  const mergedStats: PipelineStats | null = pipelineStats.data
    ? { ...pipelineStats.data, byStage: bdByStage }
    : bizItemSummaryData
      ? { totalItems: bizItemSummaryData.length, byStage: bdByStage, avgDaysInStage: {} }
      : null;

  const reqCounts = reqs.data
    ? {
        done: reqs.data.filter((r) => r.status === "done").length,
        inProgress: reqs.data.filter((r) => r.status === "in_progress").length,
        planned: reqs.data.filter((r) => r.status === "planned").length,
      }
    : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">홈</h1>

      {/* 프로세스 파이프라인 (상단 메인) */}
      <ProcessPipeline stats={mergedStats} />

      {/* 퀵 액션 + Sprint Status */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <QuickActions />

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
      </div>

      {/* 기존 위젯 (하단 보조) */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
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

        <DashboardCard
          title="Harness Health"
          loading={integrity.loading}
          error={integrity.error}
        >
          {integrity.data && <HarnessHealth data={integrity.data} />}
        </DashboardCard>

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

      {/* F323: ToDo List + 업무 가이드 */}
      <section className="mt-8 space-y-6">
        <TodoSection />
        <WorkGuideSection />
      </section>
    </div>
  );
}
