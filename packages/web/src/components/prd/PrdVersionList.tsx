import type { GeneratedPrdEntry } from "../../lib/api-client";

/** generated_at는 Unix 초(number) 또는 ISO 문자열 둘 다 가능 — 둘 다 정상 파싱 */
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

interface Props {
  prds: GeneratedPrdEntry[];
  bizItemId: string;
  onView: (prd: GeneratedPrdEntry) => void;
  onEdit: (prd: GeneratedPrdEntry) => void;
  onConfirm: (prd: GeneratedPrdEntry) => void;
}

const VERSION_LABELS = ["1차 PRD (자동)", "2차 PRD (인터뷰)", "3차 PRD (확정)"];
const STATUS_BADGE: Record<string, string> = {
  draft: "🔒 초안",
  reviewing: "🔍 검토중",
  confirmed: "✅ 확정됨",
};

function VersionCard({
  version,
  prd,
  onView,
  onEdit,
  onConfirm,
  hasV3,
}: {
  version: number;
  prd: GeneratedPrdEntry | undefined;
  onView: (prd: GeneratedPrdEntry) => void;
  onEdit: (prd: GeneratedPrdEntry) => void;
  onConfirm: (prd: GeneratedPrdEntry) => void;
  hasV3: boolean;
}) {
  const label = VERSION_LABELS[version - 1] ?? `${version}차 PRD`;
  const isReadOnly = version === 1;

  return (
    <div
      className={`flex-1 min-w-[240px] rounded-xl border border-border p-5 ${
        prd ? "bg-card" : "bg-muted/30"
      }`}
    >
      <div className="mb-2 text-[15px] font-semibold text-foreground">{label}</div>
      {prd ? (
        <>
          <div className="mb-1 text-xs text-muted-foreground">
            {STATUS_BADGE[prd.status] ?? prd.status}
            {isReadOnly && " · 읽기 전용"}
          </div>
          <div className="mb-3 text-xs text-muted-foreground">
            {formatGeneratedAt(prd.generated_at)}
          </div>
          <div className="mb-4 text-[13px] leading-relaxed text-foreground/80">
            {(prd.contentPreview ?? prd.content.slice(0, 120)).slice(0, 120)}…
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onView(prd)}
              className="cursor-pointer rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-muted/40"
            >
              상세 보기
            </button>
            {!isReadOnly && (
              <button
                onClick={() => onEdit(prd)}
                className="cursor-pointer rounded-md border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-muted/40"
              >
                편집
              </button>
            )}
            {version === 2 && !hasV3 && (
              <button
                onClick={() => onConfirm(prd)}
                className="cursor-pointer rounded-md border-none bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90"
              >
                확정하기
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-[13px] text-muted-foreground">
          {version === 3 ? "2차 PRD 확정 시 생성돼요" : "아직 생성되지 않았어요"}
        </div>
      )}
    </div>
  );
}

export function PrdVersionList({ prds, bizItemId: _bizItemId, onView, onEdit, onConfirm }: Props) {
  const byVersion: Record<number, GeneratedPrdEntry> = {};
  for (const p of prds) byVersion[p.version] = p;
  const hasV3 = Boolean(byVersion[3]);

  return (
    <div className="flex flex-wrap gap-4">
      {[1, 2, 3].map((v) => (
        <VersionCard
          key={v}
          version={v}
          prd={byVersion[v]}
          onView={onView}
          onEdit={onEdit}
          onConfirm={onConfirm}
          hasV3={hasV3}
        />
      ))}
    </div>
  );
}
