"use client";

/**
 * Offering Pack 상세 — HTML 프리뷰를 기본 화면으로, 편집은 내부 토글
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, Shield, FileSpreadsheet, Edit, Maximize2 } from "lucide-react";
import {
  fetchOfferingPackDetail,
  fetchOfferingHtmlPreview,
  type OfferingPackDetail,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토중",
  approved: "승인",
  shared: "공유됨",
};

function openHtmlInNewWindow(html: string) {
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<OfferingPackDetail | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);

  const loadPreview = useCallback(async () => {
    if (!id) return;
    setPreviewLoading(true);
    try {
      const html = await fetchOfferingHtmlPreview(id);
      setHtmlPreview(html);
    } catch {
      setHtmlPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchOfferingPackDetail(id)
      .then(setPack)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    loadPreview();
  }, [id, loadPreview]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!pack) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/shaping/offering" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-bold">{pack.title}</h1>
          <Badge>{STATUS_LABELS[pack.status] ?? pack.status}</Badge>
        </div>
        <div className="flex gap-2">
          {htmlPreview && (
            <Button
              size="sm"
              variant="default"
              onClick={() => openHtmlInNewWindow(htmlPreview)}
              title="새 창에서 HTML 열기"
            >
              <Maximize2 className="size-4 mr-1" /> 새 창으로 보기
            </Button>
          )}
          <Link to={`/shaping/offering/${id}/edit`}>
            <Button size="sm" variant="outline">
              <Edit className="size-4 mr-1" /> 편집
            </Button>
          </Link>
          <Link to={`/shaping/offering/${id}/validate`}>
            <Button size="sm" variant="outline">
              <Shield className="size-4 mr-1" /> 검증
            </Button>
          </Link>
          <Link to={`/shaping/offering/${id}/brief`}>
            <Button size="sm" variant="outline">
              <FileSpreadsheet className="size-4 mr-1" /> 브리프
            </Button>
          </Link>
        </div>
      </div>

      {pack.description && (
        <p className="text-sm text-muted-foreground px-4 py-2 border-b">{pack.description}</p>
      )}

      {/* HTML Preview (기본 화면) */}
      <div className="flex-1 overflow-hidden">
        {previewLoading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            HTML 프리뷰 로딩 중...
          </div>
        )}
        {!previewLoading && htmlPreview && (
          <iframe
            srcDoc={htmlPreview}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="Offering HTML Preview"
          />
        )}
        {!previewLoading && !htmlPreview && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <FileText className="size-10" />
            <p>HTML 프리뷰가 아직 없어요.</p>
            <Link to={`/shaping/offering/${id}/edit`}>
              <Button variant="outline">
                <Edit className="size-4 mr-1" /> 에디터에서 생성하기
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 패키지 항목 토글 */}
      <div className="border-t">
        <button
          onClick={() => setShowItems(!showItems)}
          className="w-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50 flex items-center justify-between"
        >
          <span>패키지 항목 ({pack.items.length}개)</span>
          <span>{showItems ? "▲" : "▼"}</span>
        </button>
        {showItems && (
          <div className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto">
            {pack.items.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm rounded border p-2">
                <FileText className="size-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{item.title}</span>
                <Badge variant="outline" className="text-xs">{item.itemType}</Badge>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
