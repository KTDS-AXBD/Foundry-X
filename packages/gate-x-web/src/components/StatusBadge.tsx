interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, { background: string; color: string; label: string }> = {
  draft:  { background: '#f3f4f6', color: '#6b7280', label: 'Draft' },
  active: { background: '#dbeafe', color: '#1d4ed8', label: 'Active' },
  go:     { background: '#dcfce7', color: '#15803d', label: 'Go' },
  kill:   { background: '#fee2e2', color: '#dc2626', label: 'Kill' },
  hold:   { background: '#fef9c3', color: '#a16207', label: 'Hold' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status.toLowerCase()] ?? statusStyles['draft'];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: style.background,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}
