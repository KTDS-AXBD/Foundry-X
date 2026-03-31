"use client";

import { useEffect, useState } from "react";
import { getOrgNpsSummary } from "@/lib/api-client";
import type { NpsOrgSummary } from "@/lib/api-client";
import { useOrgStore } from "@/lib/stores/org-store";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function TrendBar({ week, avgNps, count }: { week: string; avgNps: number; count: number }) {
  const widthPercent = Math.min((avgNps / 10) * 100, 100);

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-muted-foreground">{week}</span>
      <div className="flex-1">
        <div className="h-5 rounded-sm bg-muted">
          <div
            className="flex h-full items-center rounded-sm bg-primary px-2 text-[10px] font-medium text-primary-foreground"
            style={{ width: `${widthPercent}%` }}
          >
            {avgNps}
          </div>
        </div>
      </div>
      <span className="w-10 text-right text-xs text-muted-foreground">{count}건</span>
    </div>
  );
}

export function Component() {
  const [summary, setSummary] = useState<NpsOrgSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeOrgId } = useOrgStore();

  useEffect(() => {
    if (!activeOrgId) return;
    setLoading(true);
    setError(null);

    getOrgNpsSummary(activeOrgId)
      .then(setSummary)
      .catch((e) => setError(e.message ?? "Failed to load NPS data"))
      .finally(() => setLoading(false));
  }, [activeOrgId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">NPS 대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          팀 만족도와 피드백 트렌드를 확인하세요 (최근 30일)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="평균 NPS" value={String(summary.averageNps)} />
        <StatCard label="총 응답" value={String(summary.totalResponses)} />
        <StatCard label="응답률" value={`${Math.round(summary.responseRate * 100)}%`} />
      </div>

      {summary.weeklyTrend.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold">주간 트렌드</h2>
          <div className="space-y-2">
            {summary.weeklyTrend.map((t) => (
              <TrendBar key={t.week} week={t.week} avgNps={t.avgNps} count={t.count} />
            ))}
          </div>
        </div>
      )}

      {summary.recentFeedback.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold">최근 피드백</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {summary.recentFeedback.map((fb) => (
              <div key={fb.id} className="flex items-start gap-3 p-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {fb.npsScore}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{fb.userId}</p>
                  {fb.comment && <p className="mt-0.5 text-sm">{fb.comment}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(fb.createdAt).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
