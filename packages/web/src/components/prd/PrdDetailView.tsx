import type { GeneratedPrdEntry } from "../../lib/api-client";

interface Props {
  prd: GeneratedPrdEntry;
  onEdit?: () => void;
  onConfirm?: () => void;
  onCompare?: () => void;
  onClose: () => void;
}

const VERSION_LABELS: Record<number, string> = { 1: "1차", 2: "2차", 3: "3차" };
const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "초안", color: "#94a3b8" },
  reviewing: { label: "검토중", color: "#f59e0b" },
  confirmed: { label: "확정", color: "#22c55e" },
};

/** 간단 Markdown → HTML (heading, bold, italic, list) */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n/g, "<br/>");
}

export function PrdDetailView({ prd, onEdit, onConfirm, onCompare, onClose }: Props) {
  const statusInfo = STATUS_BADGE[prd.status] ?? { label: prd.status, color: "#94a3b8" };
  const isReadOnly = prd.version === 1;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 40, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 820, padding: 32 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{VERSION_LABELS[prd.version] ?? prd.version}차 PRD</span>
          <span style={{ fontSize: 12, color: statusInfo.color, border: `1px solid ${statusInfo.color}`, borderRadius: 4, padding: "2px 8px" }}>
            {statusInfo.label}
          </span>
          {isReadOnly && (
            <span style={{ fontSize: 12, color: "#94a3b8", background: "#f1f5f9", borderRadius: 4, padding: "2px 8px" }}>
              읽기 전용
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#94a3b8" }}>
            {new Date(prd.generated_at * 1000).toLocaleString("ko-KR")}
          </span>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {onCompare && (
            <button onClick={onCompare} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer" }}>
              비교하기
            </button>
          )}
          {!isReadOnly && onEdit && (
            <button onClick={onEdit} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer" }}>
              편집
            </button>
          )}
          {prd.version === 2 && onConfirm && (
            <button onClick={onConfirm} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}>
              확정하기
            </button>
          )}
        </div>

        {/* Content */}
        <div
          style={{ lineHeight: 1.8, fontSize: 14, color: "#334155", borderTop: "1px solid #f1f5f9", paddingTop: 20 }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(prd.content) }}
        />
      </div>
    </div>
  );
}
