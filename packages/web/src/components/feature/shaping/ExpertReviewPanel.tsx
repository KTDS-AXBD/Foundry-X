"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface ExpertReview {
  id: string;
  expertRole: string;
  reviewBody: string;
  findings: string | null;
  qualityScore: number | null;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  TA: "Technical Architect",
  AA: "Application Architect",
  CA: "Cloud Architect",
  DA: "Data Architect",
  QA: "Quality Assurance",
};

export default function ExpertReviewPanel({ reviews }: { reviews: ExpertReview[] }) {
  const [activeRole, setActiveRole] = useState<string>(reviews[0]?.expertRole ?? "TA");
  const roles = ["TA", "AA", "CA", "DA", "QA"] as const;
  const activeReview = reviews.find((r) => r.expertRole === activeRole);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">전문가 리뷰</h3>
      <div className="flex gap-1">
        {roles.map((role) => {
          const hasReview = reviews.some((r) => r.expertRole === role);
          return (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                activeRole === role
                  ? "bg-primary text-primary-foreground"
                  : hasReview
                    ? "bg-muted hover:bg-muted/80"
                    : "bg-muted/30 text-muted-foreground"
              }`}
            >
              {role}
            </button>
          );
        })}
      </div>
      {activeReview ? (
        <div className="space-y-2 rounded border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{ROLE_LABELS[activeReview.expertRole]}</span>
            {activeReview.qualityScore != null && (
              <Badge variant="outline">{(activeReview.qualityScore * 100).toFixed(0)}%</Badge>
            )}
          </div>
          <div className="prose prose-sm max-h-80 overflow-y-auto whitespace-pre-wrap text-sm">
            {activeReview.reviewBody}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {ROLE_LABELS[activeRole]} 리뷰가 아직 없어요.
        </p>
      )}
    </div>
  );
}
