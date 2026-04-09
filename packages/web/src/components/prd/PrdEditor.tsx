import { useState, useCallback, useRef } from "react";
import type { GeneratedPrdEntry } from "../../lib/api-client";
import { editPrd } from "../../lib/api-client";

interface Props {
  prd: GeneratedPrdEntry;
  bizItemId: string;
  onSaved: (updated: GeneratedPrdEntry) => void;
  onClose: () => void;
}

/** 간단 Markdown → HTML */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n/g, "<br/>");
}

export function PrdEditor({ prd, bizItemId, onSaved, onClose }: Props) {
  const isReadOnly = prd.version === 1;
  const [content, setContent] = useState(prd.content);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        setError(null);
        try {
          const updated = await editPrd(bizItemId, prd.id, value);
          onSaved(updated);
        } catch (e) {
          setError(e instanceof Error ? e.message : "저장 실패");
        } finally {
          setSaving(false);
        }
      }, 5000);
    },
    [bizItemId, prd.id, onSaved]
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 p-10">
      <div className="flex w-full max-w-[900px] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 text-foreground shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center">
          <span className="text-base font-bold">PRD 편집 — {prd.version}차</span>
          {saving && <span className="ml-3 text-xs text-muted-foreground">저장 중…</span>}
          {error && <span className="ml-3 text-xs text-destructive">{error}</span>}
          <button
            onClick={() => setPreview((p) => !p)}
            className="ml-auto cursor-pointer rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-muted/40"
          >
            {preview ? "편집" : "미리보기"}
          </button>
          <button
            onClick={onClose}
            className="ml-2 cursor-pointer border-none bg-transparent text-xl text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        {isReadOnly ? (
          <div className="rounded-lg bg-amber-500/10 p-4 text-[13px] text-amber-600 dark:text-amber-400">
            1차 PRD는 자동 생성된 원본으로 편집할 수 없어요.
          </div>
        ) : preview ? (
          <div
            className="flex-1 overflow-y-auto text-sm leading-[1.8] text-foreground"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 resize-none rounded-lg border border-border bg-background p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none focus:border-primary"
          />
        )}
      </div>
    </div>
  );
}
