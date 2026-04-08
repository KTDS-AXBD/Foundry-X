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

// PROTOTYPE_SECTIONS 수와 동기화 (shaping-prototype.tsx: 5개 섹션)
const PROTOTYPE_SECTION_COUNT = 5;

export default function ReviewSummaryBar({ summary }: ReviewSummaryBarProps) {
  // gap M5 해소: 분모를 서버 반환(reviewed 건수)이 아닌 실제 섹션 수 기반으로 계산
  const denominator = Math.max(summary.total, PROTOTYPE_SECTION_COUNT);
  const pct = Math.round((summary.approved / denominator) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">리뷰 진행률</span>
        <span className="font-medium">{summary.approved}/{denominator} 승인 ({pct}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        {denominator > 0 && (
          <div className="flex h-full">
            {summary.approved > 0 && (
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${(summary.approved / denominator) * 100}%` }}
              />
            )}
            {summary.revisionRequested > 0 && (
              <div
                className="bg-yellow-500 transition-all"
                style={{ width: `${(summary.revisionRequested / denominator) * 100}%` }}
              />
            )}
            {summary.rejected > 0 && (
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${(summary.rejected / denominator) * 100}%` }}
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
