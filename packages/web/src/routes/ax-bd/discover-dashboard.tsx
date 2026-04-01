"use client";

/**
 * Sprint 100: F269 — 발굴 대시보드 통합 페이지
 * 기존 /ax-bd/progress + /discovery-progress + /ax-bd/artifacts를 탭으로 통합
 */
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProcessProgressCard from "@/components/feature/ProcessProgressCard";
import PortfolioSummaryWidget from "@/components/feature/PortfolioSummary";
import DiscoveryProgressDashboard from "@/components/feature/DiscoveryProgressDashboard";
import ArtifactList from "@/components/feature/ax-bd/ArtifactList";
import {
  getPortfolioProgress,
  fetchApi,
  type ProcessProgress,
  type PortfolioSummary,
} from "@/lib/api-client";

type SignalFilter = "all" | "green" | "yellow" | "red";

interface DiscoveryPortfolioProgress {
  totalItems: number;
  byGateStatus: { blocked: number; warning: number; ready: number };
  byCriterion: Array<{
    criterionId: number;
    name: string;
    completed: number;
    inProgress: number;
    needsRevision: number;
    pending: number;
    completionRate: number;
  }>;
  items: Array<{
    bizItemId: string;
    title: string;
    completedCount: number;
    gateStatus: "blocked" | "warning" | "ready";
    criteria: Array<{ criterionId: number; status: "pending" | "in_progress" | "completed" | "needs_revision" }>;
  }>;
  bottleneck: { criterionId: number; name: string; completionRate: number } | null;
}

function ProgressTrackingTab() {
  const [items, setItems] = useState<ProcessProgress[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = signalFilter !== "all" ? { signal: signalFilter } : undefined;
        const data = await getPortfolioProgress(params);
        setItems(data.items);
        setSummary(data.summary);
      } catch (e) {
        setError(e instanceof Error ? e.message : "데이터를 불러올 수 없어요");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [signalFilter]);

  return (
    <div className="space-y-6">
      {summary && <PortfolioSummaryWidget summary={summary} />}

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">신호등:</span>
        {(["all", "green", "yellow", "red"] as const).map((f) => (
          <Badge
            key={f}
            variant={signalFilter === f ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSignalFilter(f)}
          >
            {f === "all" ? "전체" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Badge>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</div>
      )}
      {error && (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {signalFilter === "all"
            ? "파이프라인에 등록된 아이템이 없어요"
            : `${signalFilter} 신호등인 아이템이 없어요`}
        </div>
      )}
      <div className="space-y-3">
        {items.map((item) => (
          <Link key={item.bizItemId} to={`/ax-bd/discovery/${item.bizItemId}`}>
            <ProcessProgressCard progress={item} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function DiscoveryProgressTab() {
  const [progress, setProgress] = useState<DiscoveryPortfolioProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<DiscoveryPortfolioProgress>("/discovery/progress");
        setProgress(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">로딩 중...</span>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {progress && <DiscoveryProgressDashboard progress={progress} />}
    </div>
  );
}

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "tracking";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold">발굴 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          BD 아이템 진행 현황, Discovery 기준 달성률, 산출물을 한 곳에서 확인해요.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="tracking">진행 추적</TabsTrigger>
          <TabsTrigger value="criteria">기준 달성률</TabsTrigger>
          <TabsTrigger value="artifacts">산출물</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking">
          <ProgressTrackingTab />
        </TabsContent>

        <TabsContent value="criteria">
          <DiscoveryProgressTab />
        </TabsContent>

        <TabsContent value="artifacts">
          <ArtifactList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
