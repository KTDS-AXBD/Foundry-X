"use client";

import { Card, CardContent } from "@/components/ui/card";

interface PrReviewComment {
  file: string;
  line: number;
  comment: string;
  severity: "error" | "warning" | "info";
}

interface PrReviewResult {
  decision: "approve" | "request_changes" | "comment";
  summary: string;
  comments: PrReviewComment[];
  sddScore: number;
  qualityScore: number;
  securityIssues: string[];
}

interface PrReviewPanelProps {
  reviewResult: PrReviewResult;
}

const decisionStyles: Record<string, string> = {
  approve: "bg-green-100 text-green-700",
  request_changes: "bg-red-100 text-red-700",
  comment: "bg-blue-100 text-blue-700",
};

const decisionLabels: Record<string, string> = {
  approve: "승인",
  request_changes: "변경 요청",
  comment: "코멘트",
};

const severityStyles: Record<string, string> = {
  error: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
  warning: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
  info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
};

export function PrReviewPanel({ reviewResult }: PrReviewPanelProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">리뷰 결과</h3>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${decisionStyles[reviewResult.decision] ?? ""}`}>
            {decisionLabels[reviewResult.decision] ?? reviewResult.decision}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{reviewResult.summary}</p>

        <div className="flex gap-4 text-sm">
          <span>SDD: <strong>{reviewResult.sddScore}</strong>/100</span>
          <span>Quality: <strong>{reviewResult.qualityScore}</strong>/100</span>
        </div>

        {reviewResult.comments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase text-muted-foreground">코멘트</h4>
            {reviewResult.comments.map((c, i) => (
              <div
                key={i}
                className={`border-l-4 rounded p-2 text-xs ${severityStyles[c.severity] ?? ""}`}
              >
                <div className="font-medium">
                  {c.file}:{c.line} [{c.severity}]
                </div>
                <div className="mt-1">{c.comment}</div>
              </div>
            ))}
          </div>
        )}

        {reviewResult.securityIssues.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium uppercase text-red-600">보안 이슈</h4>
            <ul className="list-inside list-disc text-xs text-red-600">
              {reviewResult.securityIssues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
