import { createPortal } from "react-dom";
import type { GeneratedPrdEntry } from "../../lib/api-client";
import MarkdownViewer from "../feature/MarkdownViewer";

function formatGeneratedAt(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toLocaleString("ko-KR");
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString("ko-KR");
  }
  return "-";
}

/** PRD content 앞에 붙는 YAML frontmatter(`---\n...\n---`) 블록 제거 */
function stripFrontmatter(md: string): string {
  return md.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

interface Props {
  prd: GeneratedPrdEntry;
  onEdit?: () => void;
  onConfirm?: () => void;
  onCompare?: () => void;
  onClose: () => void;
}

const VERSION_LABELS: Record<number, string> = { 1: "1차", 2: "2차", 3: "3차" };
const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  draft: { label: "초안", className: "text-muted-foreground border-border" },
  reviewing: { label: "검토중", className: "text-amber-500 border-amber-500/50" },
  confirmed: { label: "확정", className: "text-emerald-500 border-emerald-500/50" },
};

export function PrdDetailView({ prd, onEdit, onConfirm, onCompare, onClose }: Props) {
  const statusInfo = STATUS_BADGE[prd.status] ?? {
    label: prd.status,
    className: "text-muted-foreground border-border",
  };
  const isReadOnly = prd.version === 1;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/50 p-10"
    >
      <div className="w-full max-w-[820px] rounded-2xl border border-border bg-card p-8 text-foreground shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="text-base font-bold">
            {VERSION_LABELS[prd.version] ?? prd.version}차 PRD
          </span>
          <span
            className={`rounded border px-2 py-0.5 text-xs ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
          {isReadOnly && (
            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              읽기 전용
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatGeneratedAt(prd.generated_at)}
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-xl text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-2">
          {onCompare && (
            <button
              onClick={onCompare}
              className="cursor-pointer rounded-md border border-border bg-background px-3.5 py-1.5 text-sm text-foreground hover:bg-muted/40"
            >
              비교하기
            </button>
          )}
          {!isReadOnly && onEdit && (
            <button
              onClick={onEdit}
              className="cursor-pointer rounded-md border border-border bg-background px-3.5 py-1.5 text-sm text-foreground hover:bg-muted/40"
            >
              편집
            </button>
          )}
          {prd.version === 2 && onConfirm && (
            <button
              onClick={onConfirm}
              className="cursor-pointer rounded-md border-none bg-primary px-3.5 py-1.5 text-sm text-primary-foreground hover:opacity-90"
            >
              확정하기
            </button>
          )}
        </div>

        {/* Content */}
        <div
          className="border-t border-border pt-5"
          data-testid="prd-detail-content"
        >
          <MarkdownViewer content={stripFrontmatter(prd.content)} />
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : modal;
}
