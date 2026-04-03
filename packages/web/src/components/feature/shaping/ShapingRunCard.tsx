"use client";

import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface ShapingRunItem {
  id: string;
  discoveryPrdId: string;
  status: string;
  mode: string;
  currentPhase: string;
  qualityScore: number | null;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  running: { label: "진행 중", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "완료", color: "bg-green-100 text-green-700" },
  failed: { label: "실패", color: "bg-red-100 text-red-700" },
  escalated: { label: "에스컬레이션", color: "bg-orange-100 text-orange-700" },
};

export default function ShapingRunCard({ run }: { run: ShapingRunItem }) {
  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.running;
  const date = run.completedAt ?? run.createdAt;

  return (
    <Link
      to={`/ax-bd/shaping/${run.id}`}
      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className={cfg.color}>{cfg.label}</Badge>
            <Badge variant="outline">{run.mode.toUpperCase()}</Badge>
          </div>
          <p className="text-sm font-medium">PRD: {run.discoveryPrdId}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Phase {run.currentPhase}</p>
          {run.qualityScore != null && (
            <p>Quality: {(run.qualityScore * 100).toFixed(0)}%</p>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(date).toLocaleString("ko-KR")}
      </p>
    </Link>
  );
}
