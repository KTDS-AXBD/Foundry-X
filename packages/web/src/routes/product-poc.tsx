"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi, postApi, patchApi } from "@/lib/api-client";
import { TestTubes, Plus, BarChart3, ChevronDown, ChevronRight } from "lucide-react";

interface PocItem {
  id: string;
  title: string;
  bizItemId?: string | null;
  description?: string | null;
  status: "planning" | "in_progress" | "completed" | "cancelled";
  framework?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  updatedAt: string;
}

interface PocKpi {
  id: string;
  metricName: string;
  targetValue: number | null;
  actualValue: number | null;
  unit: string;
  measuredAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "계획",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

type StatusFilter = "all" | "planning" | "in_progress" | "completed" | "cancelled";

export function Component() {
  const [items, setItems] = useState<PocItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showRegister, setShowRegister] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFramework, setFormFramework] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [kpis, setKpis] = useState<PocKpi[]>([]);
  const [kpisLoading, setKpisLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const data = await fetchApi<PocItem[]>(`/poc${params}`);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRegister = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await postApi("/poc", {
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        framework: formFramework.trim() || undefined,
      });
      setShowRegister(false);
      setFormTitle("");
      setFormDescription("");
      setFormFramework("");
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setKpisLoading(true);
    try {
      const data = await fetchApi<PocKpi[]>(`/poc/${id}/kpi`);
      setKpis(data);
    } finally {
      setKpisLoading(false);
    }
  };

  const filtered = items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TestTubes className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold">PoC 관리</h1>
        </div>
        <Button onClick={() => setShowRegister(!showRegister)} size="sm">
          <Plus className="mr-1 h-4 w-4" />
          PoC 등록
        </Button>
      </div>

      {/* Register Form */}
      {showRegister && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="PoC 제목"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="설명 (선택)"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />
          <input
            className="w-full rounded border px-3 py-2 text-sm"
            placeholder="프레임워크 (선택)"
            value={formFramework}
            onChange={(e) => setFormFramework(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRegister} disabled={submitting || !formTitle.trim()}>
              {submitting ? "등록중..." : "등록"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowRegister(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {(["all", "planning", "in_progress", "completed", "cancelled"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "전체" : STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          등록된 PoC가 없어요
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-lg border bg-card">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50"
                onClick={() => handleExpand(item.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedId === item.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">{item.title}</div>
                    {item.framework && (
                      <div className="text-xs text-muted-foreground">{item.framework}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </div>

              {/* KPI Panel */}
              {expandedId === item.id && (
                <div className="border-t p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium">KPI 대시보드</span>
                  </div>
                  {kpisLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : kpis.length === 0 ? (
                    <p className="text-sm text-muted-foreground">등록된 KPI가 없어요</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {kpis.map((kpi) => (
                        <div key={kpi.id} className="rounded border bg-card p-3">
                          <div className="text-xs text-muted-foreground">{kpi.metricName}</div>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-lg font-bold">
                              {kpi.actualValue ?? "-"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              / {kpi.targetValue ?? "-"} {kpi.unit}
                            </span>
                          </div>
                          {kpi.targetValue != null && kpi.actualValue != null && (
                            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{
                                  width: `${Math.min(100, (kpi.actualValue / kpi.targetValue) * 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
