"use client";

/**
 * F483 — 평가결과서 HTML 뷰어
 * iframe srcdoc으로 HTML 인라인 렌더링 + 공유 링크 생성
 * 패턴: BusinessPlanViewer.tsx 동일 구조
 */
import { useState, useEffect } from "react";
import { FileBarChart, Loader2, ExternalLink, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchEvaluationReportHtml, shareEvaluationReport, BASE_URL } from "@/lib/api-client";

interface EvaluationReportViewerProps {
  bizItemId: string;
}

export default function EvaluationReportViewer({ bizItemId }: EvaluationReportViewerProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchEvaluationReportHtml(bizItemId)
      .then(setHtml)
      .catch(() => setHtml(null))
      .finally(() => setLoading(false));
  }, [bizItemId]);

  function handleNewTab() {
    if (html) {
      const blob = new Blob([html], { type: "text/html" });
      window.open(URL.createObjectURL(blob), "_blank");
    }
  }

  async function handleShare() {
    setSharing(true);
    try {
      const token = await shareEvaluationReport(bizItemId);
      const url = `${BASE_URL}/ax-bd/discovery-reports/share/${token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("공유 링크 생성 실패", err);
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 rounded-lg border bg-card">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">평가결과서 로딩 중...</span>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <FileBarChart className="size-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">등록된 평가결과서가 없어요</p>
        <p className="text-xs text-muted-foreground">
          Claude Code 스킬에서 분석을 완료하면 평가결과서가 자동으로 등록돼요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
        <FileBarChart className="size-5 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">발굴단계완료 평가결과서</p>
          <p className="text-xs text-muted-foreground">9탭 HTML 포맷</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleNewTab}>
          <ExternalLink className="size-3.5 mr-1.5" />
          새 창에서 보기
        </Button>
        <Button variant="outline" size="sm" onClick={handleShare} disabled={sharing}>
          {copied ? (
            <>
              <Check className="size-3.5 mr-1.5" />
              복사됨
            </>
          ) : sharing ? (
            <>
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <Share2 className="size-3.5 mr-1.5" />
              공유 링크
            </>
          )}
        </Button>
      </div>

      {/* 공유 URL 표시 */}
      {shareUrl && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted/50 text-xs">
          <span className="text-muted-foreground">공유 URL:</span>
          <code className="flex-1 truncate font-mono">{shareUrl}</code>
        </div>
      )}

      {/* HTML 렌더링 (iframe) */}
      <iframe
        srcDoc={html}
        // 백엔드 생성 템플릿 — 차트 스크립트 + parent contentDocument auto-resize 둘 다 필요 (의도된 trade-off)
        sandbox="allow-scripts allow-same-origin"
        className="w-full rounded-lg border bg-white"
        style={{ minHeight: 700 }}
        onLoad={(e) => {
          const frame = e.currentTarget;
          if (frame.contentDocument?.body) {
            frame.style.height = `${frame.contentDocument.body.scrollHeight + 40}px`;
          }
        }}
        title="발굴단계완료 평가결과서"
      />
    </div>
  );
}
