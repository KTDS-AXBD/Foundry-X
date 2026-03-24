"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CriterionStatus = "pending" | "in_progress" | "completed" | "needs_revision";
type GateStatus = "blocked" | "warning" | "ready";

interface DiscoveryCriterion {
  criterionId: number;
  name: string;
  condition: string;
  status: CriterionStatus;
  evidence: string | null;
}

interface CriteriaProgress {
  total: 9;
  completed: number;
  inProgress: number;
  needsRevision: number;
  pending: number;
  criteria: DiscoveryCriterion[];
  gateStatus: GateStatus;
}

interface DiscoveryCriteriaPanelProps {
  bizItemId: string;
  progress: CriteriaProgress;
  onUpdate: (criterionId: number, status: CriterionStatus, evidence?: string) => void;
}

const STATUS_CONFIG: Record<CriterionStatus, { icon: string; label: string; color: string }> = {
  completed: { icon: "✅", label: "완료", color: "bg-green-100 text-green-800 border-green-200" },
  in_progress: { icon: "🔄", label: "진행 중", color: "bg-blue-100 text-blue-800 border-blue-200" },
  needs_revision: { icon: "⚠️", label: "보완 필요", color: "bg-amber-100 text-amber-800 border-amber-200" },
  pending: { icon: "⬜", label: "미시작", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

const GATE_CONFIG: Record<GateStatus, { label: string; color: string; description: string }> = {
  blocked: {
    label: "차단",
    color: "text-red-700 bg-red-50 border-red-200",
    description: "7개 이상 충족 필요",
  },
  warning: {
    label: "경고",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    description: "보완 없이 진행 가능",
  },
  ready: {
    label: "준비 완료",
    color: "text-green-700 bg-green-50 border-green-200",
    description: "PRD 생성 가능",
  },
};

export default function DiscoveryCriteriaPanel({
  bizItemId: _bizItemId,
  progress,
  onUpdate,
}: DiscoveryCriteriaPanelProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const gate = GATE_CONFIG[progress.gateStatus];
  const progressPercent = (progress.completed / progress.total) * 100;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header with progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Discovery 기준</h3>
          <span className="text-sm font-medium text-muted-foreground">
            {progress.completed}/{progress.total}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Criteria list */}
      <div className="space-y-1">
        {progress.criteria.map((criterion) => {
          const config = STATUS_CONFIG[criterion.status];
          const isExpanded = expandedId === criterion.criterionId;

          return (
            <div key={criterion.criterionId}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
                onClick={() => setExpandedId(isExpanded ? null : criterion.criterionId)}
              >
                <span>{config.icon}</span>
                <span className="flex-1">
                  {criterion.criterionId}. {criterion.name}
                </span>
                {criterion.status !== "completed" && criterion.status !== "pending" && (
                  <Badge className={cn("border text-[10px] font-normal", config.color)}>
                    {config.label}
                  </Badge>
                )}
              </button>

              {isExpanded && (
                <div className="ml-8 mb-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">{criterion.condition}</p>
                  {criterion.evidence && (
                    <p className="mt-2 text-xs">
                      <span className="font-medium">근거:</span> {criterion.evidence}
                    </p>
                  )}
                  <div className="mt-2 flex gap-1">
                    {(["completed", "in_progress", "needs_revision"] as CriterionStatus[]).map(
                      (status) => (
                        <Button
                          key={status}
                          variant={criterion.status === status ? "default" : "outline"}
                          size="xs"
                          onClick={() => onUpdate(criterion.criterionId, status)}
                        >
                          {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gate status */}
      <div className={cn("mt-4 rounded-md border px-3 py-2 text-sm", gate.color)}>
        {progress.gateStatus === "warning" && "⚠️ "}
        {progress.gateStatus === "blocked" && "🚫 "}
        {progress.gateStatus === "ready" && "✅ "}
        {progress.total - progress.completed > 0
          ? `${progress.total - progress.completed}개 미충족 — ${gate.description}`
          : gate.description}
      </div>
    </div>
  );
}
