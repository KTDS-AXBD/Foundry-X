import type { GeneratedPrdEntry } from "../../lib/api-client";

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
      style={{
        flex: 1,
        minWidth: 240,
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 20,
        background: prd ? "#fff" : "#f8fafc",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{label}</div>
      {prd ? (
        <>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
            {STATUS_BADGE[prd.status] ?? prd.status}
            {isReadOnly && " · 읽기 전용"}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
            {new Date(prd.generated_at * 1000).toLocaleDateString("ko-KR")}
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>
            {(prd.contentPreview ?? prd.content.slice(0, 120)).slice(0, 120)}…
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => onView(prd)}
              style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer" }}
            >
              상세 보기
            </button>
            {!isReadOnly && (
              <button
                onClick={() => onEdit(prd)}
                style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "pointer" }}
              >
                편집
              </button>
            )}
            {version === 2 && !hasV3 && (
              <button
                onClick={() => onConfirm(prd)}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "#2563eb",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                확정하기
              </button>
            )}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
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
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
