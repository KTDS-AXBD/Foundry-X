"use client";

import { useState } from "react";
import type {
  AgentPlan,
  ProposedStep,
  AgentPlanStatus,
} from "@foundry-x/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface AgentPlanCardProps {
  plan: AgentPlan;
  onApprove?: (planId: string) => void;
  onReject?: (planId: string, reason: string) => void;
  onModify?: (planId: string, feedback: string) => void;
}

const statusStyles: Record<string, string> = {
  pending_approval:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  modified:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const stepTypeIcons: Record<string, string> = {
  create: "🆕",
  modify: "✏️",
  delete: "🗑️",
  test: "🧪",
};

const showActions = (status: string) =>
  status === "pending_approval" || status === "modified";

export function AgentPlanCard({
  plan,
  onApprove,
  onReject,
  onModify,
}: AgentPlanCardProps) {
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState("");

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            계획: {plan.agentId}
          </h3>
          <Badge className={statusStyles[plan.status] ?? ""}>
            {plan.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Codebase Analysis */}
        <div>
          <h4 className="mb-1 text-xs font-medium">코드베이스 분석</h4>
          <p className="text-xs text-muted-foreground">
            {plan.codebaseAnalysis}
          </p>
        </div>

        {/* Proposed Steps */}
        <div>
          <h4 className="mb-1 text-xs font-medium">
            실행 단계 ({plan.proposedSteps.length}단계)
          </h4>
          <ul className="space-y-1">
            {plan.proposedSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span>{stepTypeIcons[step.type] ?? "📌"}</span>
                <span>{step.description}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>파일: ~{plan.estimatedFiles}개</span>
          <span>토큰: ~{plan.estimatedTokens.toLocaleString()}</span>
        </div>

        {/* Risks */}
        {plan.risks.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-medium">
              리스크 ({plan.risks.length})
            </h4>
            <ul className="space-y-1">
              {plan.risks.map((risk, i) => (
                <li
                  key={i}
                  className="text-xs text-yellow-700 dark:text-yellow-400"
                >
                  ⚠️ {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Human Feedback (if exists) */}
        {plan.humanFeedback && (
          <div className="rounded bg-muted p-2 text-xs">
            <span className="font-medium">피드백: </span>
            {plan.humanFeedback}
          </div>
        )}

        {/* Edit textarea */}
        {editing && (
          <div className="space-y-2">
            <Textarea
              placeholder="수정 피드백을 입력하세요..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="text-xs"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onModify?.(plan.id, feedback);
                  setEditing(false);
                  setFeedback("");
                }}
                disabled={!feedback.trim()}
              >
                피드백 전송
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setFeedback("");
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions(plan.status) && !editing && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onApprove?.(plan.id)}>
              승인
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              수정
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject?.(plan.id, "사용자 거절")}
            >
              거절
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
