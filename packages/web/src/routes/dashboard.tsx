"use client";

import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "@/lib/api-client";
import { STAGES } from "@/components/feature/ProcessStageGuide";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Search,
  Lightbulb,
  FileText,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodoSection } from "@/components/feature/TodoSection";

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

/* ------------------------------------------------------------------ */
/*  프로세스 파이프라인 진행률                                          */
/* ------------------------------------------------------------------ */

interface PipelineStats {
  totalItems: number;
  byStage: Record<string, number>;
  avgDaysInStage: Record<string, number>;
}

const stageColors = [
  "bg-violet-500",
  "bg-amber-500",
];

// BD 파이프라인 단계 키(stage 번호 2-3) → DB 스테이지명 매핑
const STAGE_NUM_TO_DB_KEY: Record<number, string> = {
  2: "DISCOVERY",
  3: "FORMALIZATION",
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
                aria-label={`${stage.label} 단계 진행 중 (${count}건)`}
                title={`${stage.label} 단계 진행 중 (${count}건)`}
                className="group flex flex-col items-center rounded-lg p-2 transition-colors hover:bg-muted"
              >
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full text-white text-sm font-bold",
                    stageColors[i],
                  )}
                >
                  {count}건
                </div>
                <span className="mt-1.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                  {stage.stage}단계 · {stage.label}
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
  { label: "발굴 아이템", href: "/discovery/items", icon: Search },
  { label: "아이디어/BMC", href: "/discovery/ideas-bmc", icon: Lightbulb },
  { label: "PRD 작성", href: "/shaping/prd", icon: FileText },
  { label: "Offering", href: "/shaping/offerings", icon: Package },
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

export function Component() {
  const pipelineStats = useApi<PipelineStats>("/pipeline/stats");
  const bizItemSummaryRaw = useApi<{ items: Array<{ bizItemId: string; title: string; currentStage: number }> }>("/biz-items/summary");
  const bizItemSummaryData = bizItemSummaryRaw.data?.items ?? null;

  // biz-items/summary → byStage (2-3단계만 집계)
  const bdByStage = useMemo(() => {
    if (!bizItemSummaryData) return {};
    const counts: Record<string, number> = {};
    for (const item of bizItemSummaryData) {
      const key = STAGE_NUM_TO_DB_KEY[item.currentStage];
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [bizItemSummaryData]);

  const mergedStats: PipelineStats | null = pipelineStats.data
    ? { ...pipelineStats.data, byStage: bdByStage }
    : bizItemSummaryData
      ? { totalItems: bizItemSummaryData.length, byStage: bdByStage, avgDaysInStage: {} }
      : null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">홈</h1>

      {/* 프로세스 파이프라인 (상단 메인) */}
      <ProcessPipeline stats={mergedStats} />

      {/* 퀵 액션 */}
      <div className="mt-4">
        <QuickActions />
      </div>

      {/* F323: ToDo List */}
      <section className="mt-8 space-y-6">
        <TodoSection />
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          📖 업무 가이드는{" "}
          <a
            href="https://wiki.ktds.co.kr"
            className="text-primary underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wiki
          </a>
          를 참고하세요.
        </div>
      </section>
    </div>
  );
}
