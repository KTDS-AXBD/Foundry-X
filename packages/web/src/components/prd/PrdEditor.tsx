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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 40 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 900, padding: 32, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>PRD 편집 — {prd.version}차</span>
          {saving && <span style={{ marginLeft: 12, fontSize: 12, color: "#94a3b8" }}>저장 중…</span>}
          {error && <span style={{ marginLeft: 12, fontSize: 12, color: "#ef4444" }}>{error}</span>}
          <button onClick={() => setPreview((p) => !p)} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer" }}>
            {preview ? "편집" : "미리보기"}
          </button>
          <button onClick={onClose} style={{ marginLeft: 8, border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>

        {isReadOnly ? (
          <div style={{ padding: 16, background: "#fef9c3", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
            1차 PRD는 자동 생성된 원본으로 편집할 수 없어요.
          </div>
        ) : preview ? (
          <div
            style={{ flex: 1, overflowY: "auto", lineHeight: 1.8, fontSize: 14, color: "#334155" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            style={{ flex: 1, resize: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, fontSize: 13, fontFamily: "monospace", lineHeight: 1.6, outline: "none" }}
          />
        )}
      </div>
    </div>
  );
}
