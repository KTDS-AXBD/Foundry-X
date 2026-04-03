"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api-client";
import ShapingRunCard from "@/components/feature/shaping/ShapingRunCard";

interface ShapingRunItem {
  id: string;
  discoveryPrdId: string;
  status: string;
  mode: string;
  currentPhase: string;
  qualityScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

const FILTERS = ["all", "running", "completed", "escalated", "failed"] as const;

export function Component() {
  const [runs, setRuns] = useState<ShapingRunItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    const query = filter === "all" ? "" : `?status=${filter}`;
    fetchApi<{ items: ShapingRunItem[]; total: number }>(`/shaping/runs${query}`)
      .then((res) => {
        setRuns(res.items);
        setTotal(res.total);
      })
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">BD 형상화</h1>
          <p className="text-sm text-muted-foreground">
            형상화 실행 이력을 확인하고 PRD를 리뷰할 수 있어요.
          </p>
        </div>
        <Badge variant="secondary">{total}건</Badge>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "전체" : f === "running" ? "진행 중" : f === "completed" ? "완료" : f === "escalated" ? "에스컬레이션" : "실패"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">로딩 중...</div>
      ) : runs.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          형상화 실행 이력이 없어요.
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <ShapingRunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
