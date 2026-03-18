"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AgentPrCardProps {
  pr: {
    id: string;
    prNumber: number | null;
    prUrl: string | null;
    branch: string;
    status: string;
    sddScore: number | null;
    qualityScore: number | null;
    securityIssues: string[] | string | null;
    reviewDecision: string | null;
    mergedAt?: string | null;
    commitSha?: string | null;
    agentId?: string;
  };
  onMerge?: () => void;
  onReview?: () => void;
}

const statusStyles: Record<string, string> = {
  creating: "bg-gray-100 text-gray-700",
  open: "bg-blue-100 text-blue-700",
  reviewing: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  merged: "bg-purple-100 text-purple-700",
  closed: "bg-red-100 text-red-700",
  needs_human: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  creating: "생성 중",
  open: "오픈",
  reviewing: "리뷰 중",
  approved: "승인됨",
  merged: "머지됨",
  closed: "닫힘",
  needs_human: "수동 확인 필요",
};

function ScoreBadge({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-600";
  return (
    <span className={`text-sm font-medium ${color}`}>
      {label}: {score}
    </span>
  );
}

export function AgentPrCard({ pr, onMerge, onReview }: AgentPrCardProps) {
  const securityCount = pr.securityIssues
    ? Array.isArray(pr.securityIssues)
      ? pr.securityIssues.length
      : typeof pr.securityIssues === 'string'
        ? (JSON.parse(pr.securityIssues) as string[]).length
        : 0
    : 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {pr.prNumber && (
              <span className="text-sm font-semibold">PR #{pr.prNumber}</span>
            )}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{pr.branch}</code>
          </div>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[pr.status] ?? "bg-gray-100"}`}>
            {statusLabels[pr.status] ?? pr.status}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <ScoreBadge label="SDD" score={pr.sddScore} />
          <ScoreBadge label="Quality" score={pr.qualityScore} />
          {securityCount > 0 && (
            <span className="text-sm font-medium text-red-600">
              Security: {securityCount}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {pr.prUrl && (
            <a href={pr.prUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                GitHub에서 보기
              </Button>
            </a>
          )}
          {onReview && (
            <Button variant="outline" size="sm" onClick={onReview}>
              재리뷰
            </Button>
          )}
          {onMerge && pr.status === "approved" && (
            <Button size="sm" onClick={onMerge}>
              머지
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
