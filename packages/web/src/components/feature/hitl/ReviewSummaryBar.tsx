"use client";

interface ReviewSummaryBarProps {
  summary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    revisionRequested: number;
  };
}

export default function ReviewSummaryBar({ summary }: ReviewSummaryBarProps) {
  const pct = summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">리뷰 진행률</span>
        <span className="font-medium">{summary.approved}/{summary.total} 승인 ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        {summary.total > 0 && (
          <div className="flex h-full">
            {summary.approved > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(summary.approved / summary.total) * 100}%` }}
              />
            )}
            {summary.revisionRequested > 0 && (
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${(summary.revisionRequested / summary.total) * 100}%` }}
              />
            )}
            {summary.rejected > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(summary.rejected / summary.total) * 100}%` }}
              />
            )}
          </div>
        )}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>승인 {summary.approved}</span>
        <span>수정요청 {summary.revisionRequested}</span>
        <span>반려 {summary.rejected}</span>
        <span>대기 {summary.pending}</span>
      </div>
    </div>
  );
}
