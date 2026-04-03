"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchBdpLatest, fetchApi, type BdpVersion } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import HitlSectionReview from "@/components/feature/hitl/HitlSectionReview";
import ReviewStatusBadge from "@/components/feature/hitl/ReviewStatusBadge";
import ReviewSummaryBar from "@/components/feature/hitl/ReviewSummaryBar";

interface ReviewSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  revisionRequested: number;
}

interface SectionReview {
  id: string;
  sectionId: string;
  status: string;
  comment: string | null;
  createdAt: string;
}

function parseSections(content: string): string[] {
  const headings = content.match(/^## .+$/gm);
  if (!headings || headings.length === 0) return ["전체"];
  return headings.map((h) => h.replace(/^## /, "").trim());
}

export function Component() {
  const { bizItemId } = useParams<{ bizItemId: string }>();
  const [bdp, setBdp] = useState<BdpVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<SectionReview[]>([]);

  const loadReviews = useCallback(async () => {
    if (!bizItemId) return;
    try {
      const [s, r] = await Promise.all([
        fetchApi<ReviewSummary>(`/bdp/${bizItemId}/review-summary`),
        fetchApi<SectionReview[]>(`/bdp/${bizItemId}/reviews`),
      ]);
      setSummary(s);
      setReviews(r);
    } catch { /* ignore */ }
  }, [bizItemId]);

  useEffect(() => {
    if (!bizItemId) return;
    fetchBdpLatest(bizItemId)
      .then(setBdp)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    loadReviews();
  }, [bizItemId, loadReviews]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!bdp) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  const sections = parseSections(bdp.content);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/shaping/proposal" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-2xl font-bold">사업제안서</h1>
        <Badge variant="outline">v{bdp.versionNum}</Badge>
        {bdp.isFinal && <Badge>최종본</Badge>}
      </div>

      {summary && <ReviewSummaryBar summary={summary} />}

      <div className="space-y-4">
        {sections.map((sec) => {
          const latest = reviews.find((r) => r.sectionId === sec);
          return (
            <div key={sec} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{sec}</h3>
                {latest && <ReviewStatusBadge status={latest.status} />}
              </div>
              <HitlSectionReview
                entityId={bizItemId!}
                entityType="bdp"
                sectionId={sec}
                onReview={() => loadReviews()}
              />
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border p-6 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {bdp.content}
      </div>
      <div className="text-xs text-muted-foreground">
        Biz Item: {bdp.bizItemId} &middot; 생성: {new Date(bdp.createdAt).toLocaleDateString("ko")}
      </div>
    </div>
  );
}
