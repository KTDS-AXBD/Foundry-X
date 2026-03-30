"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/api-client";
import { KanbanBoard } from "@/components/feature/pipeline/kanban-board";
import { PipelineView } from "@/components/feature/pipeline/pipeline-view";
import type { PipelineItemData } from "@/components/feature/pipeline/item-card";
import { LayoutGrid, GitBranch } from "lucide-react";

interface KanbanColumn {
  stage: string;
  items: PipelineItemData[];
  count: number;
}

interface PipelineStats {
  totalItems: number;
  byStage: Record<string, number>;
  avgDaysInStage: Record<string, number>;
}

type ViewMode = "kanban" | "pipeline";

export default function PipelinePage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [kanbanData, setKanbanData] = useState<KanbanColumn[] | null>(null);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kanban, statsData] = await Promise.all([
        fetchApi<KanbanColumn[]>("/pipeline/kanban"),
        fetchApi<PipelineStats>("/pipeline/stats"),
      ]);
      setKanbanData(kanban);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleItemClick = (id: string) => {
    // Navigate to item detail (future: side panel)
    window.location.href = `/ax-bd/${id}`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BD 파이프라인</h1>
          <p className="text-muted-foreground">사업 아이템 파이프라인 현황</p>
        </div>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={view === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            칸반
          </Button>
          <Button
            variant={view === "pipeline" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("pipeline")}
          >
            <GitBranch className="h-4 w-4 mr-1" />
            파이프라인
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-72" />
            ))}
          </div>
        </div>
      ) : view === "kanban" && kanbanData ? (
        <KanbanBoard columns={kanbanData} onItemClick={handleItemClick} />
      ) : stats ? (
        <PipelineView stats={stats} />
      ) : null}
    </div>
  );
}
