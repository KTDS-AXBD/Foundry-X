"use client";

/**
 * Sprint 215: 기획서 섹션 편집기 (F444)
 * 섹션별 textarea + AI 재생성 버튼
 */
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectionEditorProps {
  sectionNum: number;
  title: string;
  content: string;
  onChange: (sectionNum: number, content: string) => void;
  onRegenerate: (sectionNum: number) => void;
  isRegenerating: boolean;
}

export default function SectionEditor({
  sectionNum,
  title,
  content,
  onChange,
  onRegenerate,
  isRegenerating,
}: SectionEditorProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-background border rounded px-1.5 py-0.5">
            §{sectionNum}
          </span>
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRegenerate(sectionNum)}
          disabled={isRegenerating}
          className="h-7 gap-1.5 text-xs"
        >
          <RefreshCw className={`size-3 ${isRegenerating ? "animate-spin" : ""}`} />
          AI 재생성
        </Button>
      </div>

      {/* 편집 영역 */}
      <textarea
        value={content}
        onChange={(e) => onChange(sectionNum, e.target.value)}
        className="w-full min-h-[120px] p-4 text-sm font-mono resize-y bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={`${title} 내용을 입력하세요...`}
        aria-label={`섹션 ${sectionNum}: ${title}`}
      />
    </div>
  );
}
