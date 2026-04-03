"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi, postApi } from "@/lib/api-client";
import { Rocket, Plus } from "lucide-react";

interface MvpItem {
  id: string;
  title: string;
  bizItemId?: string;
  status: "in_dev" | "testing" | "released";
  assignee?: string;
  deployUrl?: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  in_dev: "개발중",
  testing: "테스트",
  released: "출시",
};

const STATUS_COLORS: Record<string, string> = {
  in_dev: "bg-blue-100 text-blue-700",
  testing: "bg-yellow-100 text-yellow-700",
  released: "bg-green-100 text-green-700",
};

type StatusFilter = "all" | "in_dev" | "testing" | "released";

export function Component() {
  const [items, setItems] = useState<MvpItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showRegister, setShowRegister] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formBizItemId, setFormBizItemId] = useState("");
  const [formAssignee, setFormAssignee] = useState("");
  const [formDeployUrl, setFormDeployUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<MvpItem[]>("/mvp-tracking");
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleRegister = async () => {
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      await postApi("/mvp-tracking", {
        title: formTitle.trim(),
        bizItemId: formBizItemId.trim() || undefined,
        assignee: formAssignee.trim() || undefined,
        deployUrl: formDeployUrl.trim() || undefined,
      });
      setShowRegister(false);
      setFormTitle("");
      setFormBizItemId("");
      setFormAssignee("");
      setFormDeployUrl("");
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const filtered =
    items?.filter((item) => statusFilter === "all" || item.status === statusFilter) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">MVP 추적</h1>
          <p className="text-muted-foreground">MVP 개발 현황 및 배포 파이프라인 관리</p>
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <Plus className="h-4 w-4 mr-1" />
          MVP 등록
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 border-b">
        {(["all", "in_dev", "testing", "released"] as StatusFilter[]).map((s) => (
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
        ))}
      </div>

      {/* Register Modal */}
      {showRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">MVP 등록</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">제목 *</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="MVP 제목"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">사업 아이템 ID</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="연결할 Biz Item ID"
                value={formBizItemId}
                onChange={(e) => setFormBizItemId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">담당자</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="담당자 이름"
                value={formAssignee}
                onChange={(e) => setFormAssignee(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">배포 URL</label>
              <input
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="https://..."
                value={formDeployUrl}
                onChange={(e) => setFormDeployUrl(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRegister(false)}>
                취소
              </Button>
              <Button onClick={handleRegister} disabled={submitting || !formTitle.trim()}>
                {submitting ? "등록 중..." : "등록"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Rocket className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">
            {statusFilter === "all"
              ? "등록된 MVP가 없어요. 첫 MVP를 등록해보세요."
              : `${STATUS_LABELS[statusFilter]} 상태인 MVP가 없어요.`}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">제목</th>
                <th className="text-left px-4 py-3 font-medium">Biz Item</th>
                <th className="text-left px-4 py-3 font-medium">상태</th>
                <th className="text-left px-4 py-3 font-medium">담당자</th>
                <th className="text-left px-4 py-3 font-medium">배포 URL</th>
                <th className="text-left px-4 py-3 font-medium">마지막 업데이트</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{item.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.bizItemId ? (
                      <Link
                        to={`/discovery/items/${item.bizItemId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {item.bizItemId.slice(0, 8)}...
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status]}`}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.assignee ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    {item.deployUrl ? (
                      <a
                        href={item.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        {item.deployUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
