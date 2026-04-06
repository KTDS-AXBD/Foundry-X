// ─── F362: 미사용 항목 경고 카드 (Sprint 164) ───

interface Props {
  unusedSources: string[];
}

export function UnusedHighlight({ unusedSources }: Props) {
  if (unusedSources.length === 0) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "#ecfdf5",
          borderRadius: 8,
          border: "1px solid #a7f3d0",
          fontSize: 14,
          color: "#065f46",
        }}
      >
        모든 인프라가 활용되고 있어요
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "#fffbeb",
        borderRadius: 8,
        border: "1px solid #fde68a",
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 600, color: "#92400e", marginBottom: 8 }}>
        미사용 항목 {unusedSources.length}건
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {unusedSources.map((source) => (
          <span
            key={source}
            style={{
              padding: "2px 8px",
              background: "#fef3c7",
              borderRadius: 4,
              fontSize: 12,
              color: "#92400e",
            }}
          >
            {source}
          </span>
        ))}
      </div>
    </div>
  );
}
