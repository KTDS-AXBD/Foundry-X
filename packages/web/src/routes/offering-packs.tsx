"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi, postApi } from "@/lib/api-client";
import { Package, Plus } from "lucide-react";

interface OfferingPack {
  id: string;
  title: string;
  description?: string;
  bizItemId?: string;
  status: "draft" | "review" | "approved" | "shared";
  itemCount: number;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토중",
  approved: "승인",
  shared: "공유됨",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  shared: "bg-blue-100 text-blue-700",
};

type StatusFilter = "all" | "draft" | "review" | "approved" | "shared";

export function Component() {
  const [packs, setPacks] = useState<OfferingPack[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createBizItemId, setCreateBizItemId] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<OfferingPack[]>("/offering-packs");
      setPacks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!createTitle.trim()) return;
    setCreating(true);
    try {
      await postApi("/offering-packs", {
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        bizItemId: createBizItemId.trim() || undefined,
      });
      setShowCreate(false);
      setCreateTitle("");
      setCreateDescription("");
      setCreateBizItemId("");
      await loadData();
    } finally {
      setCreating(false);
    }
  };

  const filtered =
    packs?.filter((p) => statusFilter === "all" || p.status === statusFilter) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offering Pack</h1>
          <p className="text-muted-foreground">영업·제안용 번들 패키지 관리</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          패키지 생성
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 border-b">
        {(["all", "draft", "review", "approved", "shared"] as StatusFilter[]).map(
          (s) => (
            <button
              key={s}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                statusFilter === s
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "전체" : STATUS_LABELS[s]}
            </button>
          ),
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">Offering Pack 생성</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">제목 *</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="패키지 제목"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="패키지 설명"
                rows={3}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">사업 아이템 ID</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="연결할 Biz Item ID"
                value={createBizItemId}
                onChange={(e) => setCreateBizItemId(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                취소
              </Button>
              <Button onClick={handleCreate} disabled={creating || !createTitle.trim()}>
                {creating ? "생성 중..." : "생성"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Package className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">
            {statusFilter === "all"
              ? "Offering Pack이 없어요. 첫 패키지를 생성해보세요."
              : `${STATUS_LABELS[statusFilter]} 상태인 패키지가 없어요.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pack) => (
            <div
              key={pack.id}
              className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-sm leading-snug">{pack.title}</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[pack.status]}`}
                >
                  {STATUS_LABELS[pack.status]}
                </span>
              </div>
              {pack.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {pack.description}
                </p>
              )}
              {pack.bizItemId && (
                <p className="text-xs text-muted-foreground">
                  Biz Item: <span className="font-mono">{pack.bizItemId}</span>
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>항목 {pack.itemCount}개</span>
                <span>{new Date(pack.createdAt).toLocaleDateString("ko-KR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
