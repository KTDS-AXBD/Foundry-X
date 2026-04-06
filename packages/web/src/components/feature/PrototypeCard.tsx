// F356: Prototype Job 목록 카드 (Sprint 160)

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PrototypeJobItem } from "@/lib/api-client";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  building: "secondary",
  deploying: "secondary",
  live: "default",
  failed: "destructive",
  deploy_failed: "destructive",
  dead_letter: "destructive",
  feedback_pending: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  queued: "대기중",
  building: "빌드중",
  deploying: "배포중",
  live: "라이브",
  failed: "실패",
  deploy_failed: "배포 실패",
  dead_letter: "폐기",
  feedback_pending: "피드백 대기",
};

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PrototypeCardProps {
  job: PrototypeJobItem;
  onClick?: () => void;
}

export default function PrototypeCard({ job, onClick }: PrototypeCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm truncate flex-1 mr-2">
          {job.prdTitle}
        </h3>
        <Badge variant={STATUS_VARIANT[job.status] ?? "outline"}>
          {STATUS_LABEL[job.status] ?? job.status}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {job.qualityScore !== null && (
          <span
            className={
              job.qualityScore >= 0.85
                ? "text-green-600 font-medium"
                : "text-amber-600 font-medium"
            }
          >
            품질 {(job.qualityScore * 100).toFixed(0)}%
          </span>
        )}
        {job.ogdRounds > 0 && (
          <span>O-G-D {job.ogdRounds}R</span>
        )}
        <span>${job.costUsd.toFixed(4)}</span>
        <span className="ml-auto">{formatDate(job.createdAt)}</span>
      </div>
    </Card>
  );
}
