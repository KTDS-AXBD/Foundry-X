"use client";

/**
 * Offering 상세 — HTML 프리뷰를 기본 화면으로, 편집은 별도 /edit 라우트.
 * 2026-04-09: 구 offering_packs API → 신 /offerings/:id 로 이관.
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, Shield, FileSpreadsheet, Edit, Maximize2 } from "lucide-react";
import {
  fetchOfferingDetail,
  fetchOfferingHtmlPreview,
  type OfferingDetail,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  generating: "생성중",
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
  const [offering, setOffering] = useState<OfferingDetail | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    fetchOfferingDetail(id)
      .then(setOffering)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    loadPreview();
  }, [id, loadPreview]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!offering) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/shaping/offerings" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-bold">{offering.title}</h1>
          <Badge>{STATUS_LABELS[offering.status] ?? offering.status}</Badge>
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

    </div>
  );
}
