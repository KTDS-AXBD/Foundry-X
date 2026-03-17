"use client";

const colors = {
  text: "#ededed",
  card: "#1a1a1a",
  border: "#333",
  accent: "#3b82f6",
  muted: "#888",
  red: "#ef4444",
};

export interface DashboardCardProps {
  title: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}

export default function DashboardCard({
  title,
  loading,
  error,
  children,
}: DashboardCardProps) {
  return (
    <div
      style={{
        background: colors.card,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        padding: 24,
      }}
    >
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 16,
          fontWeight: 600,
          color: colors.accent,
        }}
      >
        {title}
      </h2>
      {loading ? (
        <p style={{ color: colors.muted }}>Loading...</p>
      ) : error ? (
        <p style={{ color: colors.red, fontSize: 13 }}>{error}</p>
      ) : (
        children
      )}
    </div>
  );
}
