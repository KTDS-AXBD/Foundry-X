"use client";

/**
 * F440 — 사업기획서 열람 컴포넌트
 * HTML 원본을 iframe으로 인라인 표시 + 내보내기 버튼
 * S229: HTML iframe 렌더링으로 전환 (마크다운 변환 제거)
 */
import { useState, useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BASE_URL, exportBusinessPlanPptx, exportBusinessPlanHtml } from "@/lib/api-client";
import type { BdpVersion } from "@/lib/api-client";

interface BusinessPlanViewerProps {
  plan: BdpVersion;
  bizItemId: string;
}

export default function BusinessPlanViewer({ plan, bizItemId }: BusinessPlanViewerProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [htmlLoading, setHtmlLoading] = useState(false);

  // HTML 원본을 export API에서 가져와 인라인 iframe으로 표시
  useEffect(() => {
    setHtmlLoading(true);
    exportBusinessPlanHtml(bizItemId)
      .then(setHtmlContent)
      .catch(() => setHtmlContent(null))
      .finally(() => setHtmlLoading(false));
  }, [bizItemId]);

  function handleHtmlNewTab() {
    if (htmlContent) {
      const blob = new Blob([htmlContent], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    } else {
      window.open(`${BASE_URL}/biz-items/${bizItemId}/business-plan/export?format=html`, "_blank");
    }
  }

  async function handlePptxExport() {
    setIsExporting(true);
    try {
      const blob = await exportBusinessPlanPptx(bizItemId);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `business-plan-${bizItemId}.pptx`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("PPTX 내보내기 실패", err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <FileText className="size-5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">사업기획서</p>
          <p className="text-xs text-muted-foreground">
            {new Date(plan.createdAt).toLocaleDateString("ko", { year: "numeric", month: "long", day: "numeric" })} 생성
          </p>
        </div>
        <Badge variant="outline">v{plan.versionNum}</Badge>
        {plan.isFinal && <Badge className="bg-green-100 text-green-700 border-green-200">최종</Badge>}
        <Button variant="outline" size="sm" onClick={handleHtmlNewTab}>
          새 창에서 보기
        </Button>
        <Button variant="outline" size="sm" onClick={handlePptxExport} disabled={isExporting}>
          {isExporting ? "변환 중..." : "PPTX 내보내기"}
        </Button>
      </div>

      {/* 본문 — HTML 원본을 iframe으로 인라인 표시 */}
      {htmlLoading ? (
        <div className="flex items-center justify-center p-12 rounded-lg border bg-card">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">HTML 원본 로딩 중...</span>
        </div>
      ) : htmlContent ? (
        <iframe
          srcDoc={htmlContent}
          sandbox="allow-same-origin"
          className="w-full rounded-lg border bg-white"
          style={{ minHeight: 700 }}
          onLoad={(e) => {
            const frame = e.currentTarget;
            if (frame.contentDocument?.body) {
              frame.style.height = `${frame.contentDocument.body.scrollHeight + 40}px`;
            }
          }}
          title="사업기획서"
        />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground text-center">
          HTML 원본을 불러올 수 없어요. "새 창에서 보기"를 이용해주세요.
        </div>
      )}
    </div>
  );
}
