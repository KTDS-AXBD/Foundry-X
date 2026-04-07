"use client";

/**
 * F440 — 사업기획서 열람 컴포넌트
 * 마크다운 렌더링 + 버전 정보 표시
 */
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { BdpVersion } from "@/lib/api-client";

interface BusinessPlanViewerProps {
  plan: BdpVersion;
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

export default function BusinessPlanViewer({ plan }: BusinessPlanViewerProps) {
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
