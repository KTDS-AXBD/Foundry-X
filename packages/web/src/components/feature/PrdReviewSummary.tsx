"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScorecardView from "./ScorecardView";
import RadarChartPanel from "./RadarChartPanel";

interface PrdReviewSummaryProps {
  prdId: string;
  bizItemId: string;
  reviewData?: {
    reviews: Array<{ provider: string; verdict: string; score: number; feedback: string; createdAt: string }>;
    scorecard: {
      totalScore: number;
      verdict: string;
      providerCount: number;
      providerVerdicts: Array<{ name: string; verdict: string; score: number }>;
      sectionAverages: Array<{ name: string; avgScore: number; avgGrade: string }>;
    } | null;
  };
  personaData?: {
    evaluations: Array<{
      personaId: string;
      personaName: string;
      businessViability: number;
      strategicFit: number;
      customerValue: number;
      techMarket: number;
      execution: number;
      financialFeasibility: number;
      competitiveDiff: number;
      scalability: number;
      summary: string;
      concerns: string[];
    }>;
    verdict: { verdict: string; avgScore: number; totalConcerns: number; warnings: string[] } | null;
  };
  onStartReview?: () => void;
  onStartPersonaEval?: () => void;
}

type Tab = "review" | "persona";

export default function PrdReviewSummary({
  reviewData,
  personaData,
  onStartReview,
  onStartPersonaEval,
}: PrdReviewSummaryProps) {
  const [activeTab, setActiveTab] = useState<Tab>("review");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "review", label: "AI 검토" },
    { id: "persona", label: "페르소나 평가" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "review" && (
        <ScorecardView
          reviews={reviewData?.reviews ?? []}
          scorecard={reviewData?.scorecard ?? null}
          onRefresh={onStartReview ?? (() => {})}
        />
      )}

      {activeTab === "persona" && (
        <RadarChartPanel
          evaluations={personaData?.evaluations ?? []}
          verdict={personaData?.verdict ?? null}
          onEvaluate={onStartPersonaEval ?? (() => {})}
        />
      )}
    </div>
  );
}
