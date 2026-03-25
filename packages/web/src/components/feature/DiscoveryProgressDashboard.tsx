"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CriterionStatus = "pending" | "in_progress" | "completed" | "needs_revision";
type GateStatus = "blocked" | "warning" | "ready";

interface CriterionStat {
  criterionId: number;
  name: string;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  completionRate: number;
}

interface ItemProgress {
  bizItemId: string;
  title: string;
  completedCount: number;
  gateStatus: GateStatus;
  criteria: Array<{ criterionId: number; status: CriterionStatus }>;
}

interface DiscoveryPortfolioProgress {
  totalItems: number;
  byGateStatus: { blocked: number; warning: number; ready: number };
  byCriterion: CriterionStat[];
  items: ItemProgress[];
  bottleneck: { criterionId: number; name: string; completionRate: number } | null;
}

interface DiscoveryProgressDashboardProps {
  progress: DiscoveryPortfolioProgress;
}

const CELL_COLORS: Record<CriterionStatus, string> = {
  completed: "bg-green-500",
  in_progress: "bg-blue-400",
  needs_revision: "bg-amber-400",
  pending: "bg-gray-200",
};

const GATE_BADGE: Record<GateStatus, { label: string; className: string }> = {
  ready: { label: "Ready", className: "bg-green-100 text-green-700 border-green-200" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-700 border-amber-200" },
  blocked: { label: "Blocked", className: "bg-red-100 text-red-700 border-red-200" },
};

export default function DiscoveryProgressDashboard({ progress }: DiscoveryProgressDashboardProps) {
  const { totalItems, byGateStatus, byCriterion, items, bottleneck } = progress;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="전체" value={totalItems} />
        <SummaryCard label="Ready" value={byGateStatus.ready} color="text-green-600" />
        <SummaryCard label="Warning" value={byGateStatus.warning} color="text-amber-600" />
        <SummaryCard label="Blocked" value={byGateStatus.blocked} color="text-red-600" />
      </div>

      {/* Bottleneck alert */}
      {bottleneck && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">
            ⚠️ 병목 기준: <strong>{bottleneck.name}</strong> (달성률 {bottleneck.completionRate}%)
          </p>
        </div>
      )}

      {/* Heatmap */}
      {items.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">히트맵 (BizItem × 9기준)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="pb-2 text-left font-medium text-muted-foreground">아이템</th>
                  {byCriterion.map((c) => (
                    <th key={c.criterionId} className="pb-2 text-center font-medium text-muted-foreground" title={c.name}>
                      C{c.criterionId}
                    </th>
                  ))}
                  <th className="pb-2 text-center font-medium text-muted-foreground">상태</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.bizItemId} className="border-t border-border/50">
                    <td className="py-1.5 pr-2 max-w-[120px] truncate" title={item.title}>
                      {item.title}
                    </td>
                    {item.criteria.map((c) => (
                      <td key={c.criterionId} className="py-1.5 text-center">
                        <div
                          className={cn("mx-auto h-4 w-4 rounded-sm", CELL_COLORS[c.status])}
                          title={`${byCriterion.find((bc) => bc.criterionId === c.criterionId)?.name}: ${c.status}`}
                        />
                      </td>
                    ))}
                    <td className="py-1.5 text-center">
                      <Badge className={cn("text-[10px] border", GATE_BADGE[item.gateStatus].className)}>
                        {GATE_BADGE[item.gateStatus].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-green-500" /> 완료</span>
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-blue-400" /> 진행중</span>
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-amber-400" /> 보완필요</span>
            <span className="flex items-center gap-1"><div className="h-3 w-3 rounded-sm bg-gray-200" /> 미시작</span>
          </div>
        </div>
      )}

      {/* Criterion completion rates */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">기준별 달성률</h3>
        <div className="space-y-2">
          {byCriterion.map((c) => (
            <div key={c.criterionId} className="flex items-center gap-2">
              <span className="w-32 truncate text-xs text-muted-foreground" title={c.name}>
                {c.criterionId}. {c.name}
              </span>
              <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${c.completionRate}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-medium">{c.completionRate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            등록된 사업 아이템이 없어요. SR 목록에서 아이템을 추가하세요.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
