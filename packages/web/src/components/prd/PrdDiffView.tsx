import { useState } from "react";
import type { GeneratedPrdEntry, DiffHunk } from "../../lib/api-client";
import { diffPrds } from "../../lib/api-client";

interface Props {
  prds: GeneratedPrdEntry[];
  bizItemId: string;
  onClose: () => void;
}

const HUNK_CLASS: Record<DiffHunk["type"], string> = {
  added: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  removed: "bg-red-500/15 text-red-600 line-through dark:text-red-400",
  unchanged: "text-foreground/80",
};

function formatGeneratedAt(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toLocaleDateString("ko-KR");
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("ko-KR");
  }
  return "-";
}

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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 p-10">
      <div className="flex w-full max-w-[900px] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-border bg-card p-8 text-foreground shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center">
          <span className="text-base font-bold">PRD 버전 비교</span>
          <button
            onClick={onClose}
            className="ml-auto cursor-pointer border-none bg-transparent text-xl text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        {/* Version selectors */}
        <div className="mb-4 flex items-center gap-3">
          <select
            value={v1Id}
            onChange={(e) => setV1Id(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {prds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.version}차 PRD ({formatGeneratedAt(p.generated_at)})
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">vs</span>
          <select
            value={v2Id}
            onChange={(e) => setV2Id(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            {prds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.version}차 PRD ({formatGeneratedAt(p.generated_at)})
              </option>
            ))}
          </select>
          <button
            onClick={handleCompare}
            disabled={loading || v1Id === v2Id}
            className="rounded-md border-none bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "비교 중…" : "비교"}
          </button>
        </div>

        {error && <div className="mb-3 text-[13px] text-destructive">{error}</div>}

        {/* Diff output */}
        {hunks && (
          <div className="flex-1 overflow-y-auto border-t border-border pt-4 font-mono text-[13px] leading-[1.7]">
            {hunks.map((h, i) => (
              <div key={i} className={`px-2 py-px ${HUNK_CLASS[h.type]}`}>
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
