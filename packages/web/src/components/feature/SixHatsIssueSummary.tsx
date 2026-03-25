"use client";

interface SixHatsIssueSummaryProps {
  keyIssues: string[];
  summary: string;
  totalTokens: number;
  durationSeconds: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

export default function SixHatsIssueSummary({
  keyIssues,
  summary,
  totalTokens,
  durationSeconds,
}: SixHatsIssueSummaryProps) {
  if (keyIssues.length === 0 && !summary) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Key Issues */}
      {keyIssues.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            📋 핵심 쟁점 ({keyIssues.length}건)
          </h4>
          <ol className="list-decimal list-inside space-y-1">
            {keyIssues.map((issue, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {issue}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div>
          <h4 className="text-sm font-semibold mb-2">🔵 종합 의견</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {summary}
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 pt-2 border-t border-border text-xs text-muted-foreground">
        <span>⏱️ {formatDuration(durationSeconds)}</span>
        <span>📊 {formatTokens(totalTokens)} tokens</span>
      </div>
    </div>
  );
}
