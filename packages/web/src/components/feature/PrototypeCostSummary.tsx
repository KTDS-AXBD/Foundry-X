// F356: 비용 요약 카드 (Sprint 160)

import { Card } from "@/components/ui/card";

interface PrototypeCostSummaryProps {
  totalJobs: number;
  totalCost: number;
  liveCount: number;
  failedCount: number;
}

export default function PrototypeCostSummary({
  totalJobs,
  totalCost,
  liveCount,
  failedCount,
}: PrototypeCostSummaryProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">전체 Job</div>
        <div className="text-2xl font-bold">{totalJobs}</div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">라이브</div>
        <div className="text-2xl font-bold text-green-600">{liveCount}</div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">실패</div>
        <div className="text-2xl font-bold text-red-600">{failedCount}</div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">총 비용</div>
        <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
      </Card>
    </div>
  );
}
