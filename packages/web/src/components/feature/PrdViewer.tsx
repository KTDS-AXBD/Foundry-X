"use client";

import { Button } from "@/components/ui/button";

interface GeneratedPrd {
  id: string;
  bizItemId: string;
  version: number;
  content: string;
  criteriaSnapshot: string;
  generatedAt: string;
}

interface PrdViewerProps {
  prd: GeneratedPrd;
  versions: number[];
  onVersionChange?: (version: number) => void;
  onRegenerate: () => void;
  onDownload?: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PrdViewer({
  prd,
  versions,
  onVersionChange,
  onRegenerate,
  onDownload,
}: PrdViewerProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    const blob = new Blob([prd.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prd-v${prd.version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📄</span>
          <h3 className="text-base font-semibold">PRD</h3>
          <span className="text-sm text-muted-foreground">
            ({formatDate(prd.generatedAt)})
          </span>
        </div>

        {/* Version selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Version:</span>
          <select
            value={prd.version}
            onChange={(e) => onVersionChange?.(Number(e.target.value))}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            aria-label="PRD 버전 선택"
          >
            {versions.map((v) => (
              <option key={v} value={v}>
                v{v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content: prose styling for markdown text */}
      <div className="prose prose-sm max-w-none px-4 py-4 dark:prose-invert whitespace-pre-wrap">
        {prd.content}
      </div>

      {/* Footer actions */}
      <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          다운로드
        </Button>
        <Button size="sm" onClick={onRegenerate}>
          재생성
        </Button>
      </div>
    </div>
  );
}
