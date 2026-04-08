"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchOfferings,
  deleteOffering,
  fetchOfferingHtmlPreview,
  type OfferingListItem,
} from "@/lib/api-client";
import { FileOutput, Plus, Trash2, FileText, Presentation, ExternalLink, X, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  generating: "생성중",
  review: "검토중",
  approved: "승인",
  shared: "공유됨",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  generating: "bg-purple-100 text-purple-700",
  review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  shared: "bg-blue-100 text-blue-700",
};

const PURPOSE_LABELS: Record<string, string> = {
  report: "보고용",
  proposal: "제안용",
  review: "검토용",
};

type StatusFilter = "all" | "draft" | "generating" | "review" | "approved" | "shared";
const FILTER_OPTIONS: StatusFilter[] = ["all", "draft", "generating", "review", "approved", "shared"];

export function Component() {
  const [offerings, setOfferings] = useState<OfferingListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOfferings({
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setOfferings(data.items);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("이 사업기획서를 삭제할까요?")) return;
    setDeleting(id);
    try {
      await deleteOffering(id);
      if (previewId === id) {
        setPreviewId(null);
        setPreviewHtml(null);
      }
      await loadData();
    } finally {
      setDeleting(null);
    }
  };

  const handleCardClick = async (id: string) => {
    if (previewId === id) {
      setPreviewId(null);
      setPreviewHtml(null);
      return;
    }
    setPreviewId(id);
    setPreviewHtml(null);
    setPreviewLoading(true);
    try {
      const html = await fetchOfferingHtmlPreview(id);
      setPreviewHtml(html);
    } catch {
      setPreviewHtml(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const openInNewWindow = (html: string) => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offerings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            사업기획서 목록 — 발굴 아이템을 기반으로 보고용/제안용/검토용 기획서를 관리해요
          </p>
        </div>
        <Link to="/shaping/offerings/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            새로 만들기
          </Button>
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 border-b">
        {FILTER_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              statusFilter === status
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {status === "all" ? "전체" : STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-lg" />
          ))}
        </div>
      ) : !offerings || offerings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileOutput className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">사업기획서가 없어요</h3>
          <p className="text-sm text-muted-foreground mb-6">
            첫 번째 사업기획서를 만들어보세요
          </p>
          <Link to="/shaping/offerings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              새로 만들기
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offerings.map((offering) => (
              <div
                key={offering.id}
                className={`border rounded-lg p-4 transition-shadow relative group cursor-pointer ${
                  previewId === offering.id ? "ring-2 ring-primary shadow-md" : "hover:shadow-md"
                }`}
                onClick={() => handleCardClick(offering.id)}
                data-testid={`offering-card-${offering.id}`}
              >
                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(offering.id); }}
                  disabled={deleting === offering.id}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                  title="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                {/* Status + Purpose badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[offering.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {STATUS_LABELS[offering.status] ?? offering.status}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {PURPOSE_LABELS[offering.purpose] ?? offering.purpose}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-base mb-2 line-clamp-2">
                  {offering.title}
                </h3>

                {/* Meta info */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {offering.format === "html" ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <Presentation className="h-3 w-3" />
                    )}
                    {offering.format.toUpperCase()}
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-xs">
                    v{offering.currentVersion}
                  </span>
                  <span>
                    {new Date(offering.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                  <Link to={`/shaping/offering/${offering.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      편집
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Preview Panel */}
          {previewId && (
            <div className="rounded-lg border bg-card" data-testid="offering-preview-panel">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">HTML 미리보기</span>
                  <span className="text-xs text-muted-foreground">
                    {offerings.find((o) => o.id === previewId)?.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {previewHtml && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInNewWindow(previewHtml)}
                      data-testid="offering-open-new-window"
                    >
                      <ExternalLink className="size-4 mr-1" />
                      새 창에서 열기
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPreviewId(null); setPreviewHtml(null); }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
              {previewLoading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin mr-2" />
                  미리보기 로딩 중...
                </div>
              )}
              {!previewLoading && !previewHtml && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  HTML 미리보기를 불러올 수 없어요
                </div>
              )}
              {previewHtml && (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ height: 500 }}
                  sandbox="allow-same-origin"
                  title="Offering HTML 미리보기"
                  data-testid={`offering-iframe-${previewId}`}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
