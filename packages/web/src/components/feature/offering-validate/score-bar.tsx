/**
 * F377: Score Bar — 진행 바 + 수치 표시 (Sprint 170)
 */

interface ScoreBarProps {
  label: string;
  score: number | null;
  status?: string;
}

const STATUS_COLORS: Record<string, string> = {
  passed: "bg-green-500",
  failed: "bg-red-500",
  running: "bg-yellow-500",
  error: "bg-gray-500",
};

export function ScoreBar({ label, score, status }: ScoreBarProps) {
  const pct = score != null ? Math.round(score * 100) : 0;
  const barColor = status ? (STATUS_COLORS[status] ?? "bg-primary") : "bg-primary";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-lg font-bold">{score != null ? `${pct}%` : "—"}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {status && (
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
          status === "passed" ? "bg-green-100 text-green-700" :
          status === "failed" ? "bg-red-100 text-red-700" :
          status === "running" ? "bg-yellow-100 text-yellow-700" :
          "bg-gray-100 text-gray-700"
        }`}>
          {status}
        </span>
      )}
    </div>
  );
}
