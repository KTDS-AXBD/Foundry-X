"use client";

/**
 * F440 — 사업기획서 열람 컴포넌트
 * 마크다운 렌더링 + 버전 정보 표시
 * F446 — 내보내기 버튼 (PDF/PPTX)
 */
import { useState } from "react";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BASE_URL, exportBusinessPlanPptx } from "@/lib/api-client";
import type { BdpVersion } from "@/lib/api-client";

interface BusinessPlanViewerProps {
  plan: BdpVersion;
  bizItemId: string;
}

/** 마크다운을 간단한 HTML로 변환 (외부 라이브러리 없이) */
function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '<br class="block mb-2" />')
    .replace(/\n/g, "\n");
}

export default function BusinessPlanViewer({ plan, bizItemId }: BusinessPlanViewerProps) {
  const [isExporting, setIsExporting] = useState(false);

  function handlePdfExport() {
    const url = `${BASE_URL}/biz-items/${bizItemId}/business-plan/export?format=html`;
    window.open(url, "_blank");
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
        {/* F446: 내보내기 버튼 */}
        <Button variant="outline" size="sm" onClick={handlePdfExport}>
          PDF 내보내기
        </Button>
        <Button variant="outline" size="sm" onClick={handlePptxExport} disabled={isExporting}>
          {isExporting ? "변환 중..." : "PPTX 내보내기"}
        </Button>
      </div>

      {/* 본문 */}
      <div
        className="prose prose-sm max-w-none rounded-lg border bg-card p-6 text-sm leading-relaxed"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: renderMarkdown(plan.content) }}
      />
    </div>
  );
}
