"use client";

import { useState, useEffect } from "react";
import DiscoveryProgressDashboard from "@/components/feature/DiscoveryProgressDashboard";
import { fetchApi } from "@/lib/api-client";

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

export default function DiscoveryProgressPage() {
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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold">Discovery 진행률</h1>
        <p className="text-sm text-muted-foreground">
          전체 사업 아이템의 Discovery 9기준 달성 현황
        </p>
      </div>

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
