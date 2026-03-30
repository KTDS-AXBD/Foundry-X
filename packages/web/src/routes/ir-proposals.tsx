"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi } from "@/lib/api-client";
import { IrProposalForm } from "@/components/feature/ir-proposals/ir-proposal-form";
import { Lightbulb, Plus } from "lucide-react";

interface IrProposal {
  id: string;
  title: string;
  category: string;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "검토중",
  approved: "승인",
  rejected: "반려",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const CATEGORY_LABELS: Record<string, string> = {
  cost_reduction: "비용 절감",
  new_business: "신규 사업",
  process_improvement: "프로세스 개선",
  technology: "기술",
  other: "기타",
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type CategoryFilter = "all" | "cost_reduction" | "new_business" | "process_improvement" | "technology" | "other";

export function Component() {
  const [proposals, setProposals] = useState<IrProposal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [showForm, setShowForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<IrProposal[]>("/ir-proposals");
      setProposals(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmitSuccess = async () => {
    setShowForm(false);
    await loadData();
  };

  const filtered =
    proposals?.filter(
      (p) =>
        (statusFilter === "all" || p.status === statusFilter) &&
        (categoryFilter === "all" || p.category === categoryFilter),
    ) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IR 제안</h1>
          <p className="text-muted-foreground">사내 현장 IR Bottom-up 제안 채널</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          제안 제출
        </Button>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="border rounded-lg p-4 bg-muted/20">
          <h2 className="text-base font-semibold mb-4">IR 제안 작성</h2>
          <IrProposalForm onSubmit={handleSubmitSuccess} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">상태</p>
          <div className="flex gap-1">
            {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "전체" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium">카테고리</p>
          <div className="flex gap-1 flex-wrap">
            {(["all", "cost_reduction", "new_business", "process_improvement", "technology", "other"] as CategoryFilter[]).map((c) => (
              <button
                key={c}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  categoryFilter === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setCategoryFilter(c)}
              >
                {c === "all" ? "전체" : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Lightbulb className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">제안이 없어요. 첫 IR 제안을 제출해보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((proposal) => (
            <div
              key={proposal.id}
              className="border rounded-lg p-4 space-y-2 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm">{proposal.title}</h3>
                <div className="flex gap-2 shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {CATEGORY_LABELS[proposal.category] ?? proposal.category}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[proposal.status]}`}
                  >
                    {STATUS_LABELS[proposal.status]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>제안자: {proposal.submittedBy}</span>
                <span>제출일: {new Date(proposal.createdAt).toLocaleDateString("ko-KR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
