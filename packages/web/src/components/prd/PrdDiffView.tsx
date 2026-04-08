import { useState } from "react";
import type { GeneratedPrdEntry, DiffHunk } from "../../lib/api-client";
import { diffPrds } from "../../lib/api-client";

interface Props {
  prds: GeneratedPrdEntry[];
  bizItemId: string;
  onClose: () => void;
}

const HUNK_STYLE: Record<DiffHunk["type"], React.CSSProperties> = {
  added: { background: "#dcfce7", color: "#166534" },
  removed: { background: "#fee2e2", color: "#991b1b", textDecoration: "line-through" },
  unchanged: { color: "#334155" },
};

export function PrdDiffView({ prds, bizItemId, onClose }: Props) {
  const [v1Id, setV1Id] = useState(prds[0]?.id ?? "");
  const [v2Id, setV2Id] = useState(prds[1]?.id ?? "");
  const [hunks, setHunks] = useState<DiffHunk[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!v1Id || !v2Id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await diffPrds(bizItemId, v1Id, v2Id);
      setHunks(result.hunks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "비교 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 40 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 900, padding: 32, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>PRD 버전 비교</span>
          <button onClick={onClose} style={{ marginLeft: "auto", border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>

        {/* Version selectors */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
          <select value={v1Id} onChange={(e) => setV1Id(e.target.value)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
            {prds.map((p) => (
              <option key={p.id} value={p.id}>{p.version}차 PRD ({new Date(p.generated_at * 1000).toLocaleDateString("ko-KR")})</option>
            ))}
          </select>
          <span style={{ color: "#94a3b8" }}>vs</span>
          <select value={v2Id} onChange={(e) => setV2Id(e.target.value)} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
            {prds.map((p) => (
              <option key={p.id} value={p.id}>{p.version}차 PRD ({new Date(p.generated_at * 1000).toLocaleDateString("ko-KR")})</option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={loading || v1Id === v2Id}
            style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#2563eb", color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "비교 중…" : "비교"}
          </button>
        </div>

        {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        {/* Diff output */}
        {hunks && (
          <div style={{ flex: 1, overflowY: "auto", fontFamily: "monospace", fontSize: 13, lineHeight: 1.7, borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
            {hunks.map((h, i) => (
              <div key={i} style={{ ...HUNK_STYLE[h.type], padding: "1px 8px" }}>
                {h.type === "added" ? "+ " : h.type === "removed" ? "- " : "  "}
                {h.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
