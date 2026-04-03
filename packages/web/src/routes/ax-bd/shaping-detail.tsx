"use client";

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchApi, postApi } from "@/lib/api-client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SectionReviewAction from "@/components/feature/shaping/SectionReviewAction";
import ExpertReviewPanel from "@/components/feature/shaping/ExpertReviewPanel";

interface PhaseLog {
  id: string;
  phase: string;
  round: number;
  verdict: string | null;
  findings: string | null;
  createdAt: string;
}

interface ExpertReview {
  id: string;
  expertRole: string;
  reviewBody: string;
  findings: string | null;
  qualityScore: number | null;
  createdAt: string;
}

interface SixHats {
  id: string;
  hatColor: string;
  round: number;
  opinion: string;
  verdict: string | null;
}

interface RunDetail {
  id: string;
  discoveryPrdId: string;
  status: string;
  mode: string;
  currentPhase: string;
  qualityScore: number | null;
  tokenCost: number;
  tokenLimit: number;
  gitPath: string | null;
  createdAt: string;
  completedAt: string | null;
  phaseLogs: PhaseLog[];
  expertReviews: ExpertReview[];
  sixHats: SixHats[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  running: { label: "진행 중", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "완료", color: "bg-green-100 text-green-700" },
  failed: { label: "실패", color: "bg-red-100 text-red-700" },
  escalated: { label: "에스컬레이션", color: "bg-orange-100 text-orange-700" },
};

export function Component() {
  const { runId } = useParams<{ runId: string }>();
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoReviewing, setAutoReviewing] = useState(false);

  const loadDetail = () => {
    if (!runId) return;
    setLoading(true);
    fetchApi<RunDetail>(`/shaping/runs/${runId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  };

  useEffect(loadDetail, [runId]);

  const handleAutoReview = async () => {
    if (!runId) return;
    setAutoReviewing(true);
    try {
      await postApi(`/shaping/runs/${runId}/auto-review`, {});
      loadDetail();
    } finally {
      setAutoReviewing(false);
    }
  };

  if (!runId) return <div className="p-6 text-red-500">잘못된 접근이에요.</div>;
  if (loading) return <div className="p-6 text-sm text-muted-foreground">로딩 중...</div>;
  if (!detail) return <div className="p-6 text-red-500">형상화 실행을 찾을 수 없어요.</div>;

  const cfg = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.running;

  // Split PRD content by ## headings for section-level review
  const prdContent = detail.phaseLogs
    .filter((l) => l.phase === "C" || l.phase === "E")
    .map((l) => l.findings)
    .filter(Boolean)
    .join("\n\n");

  const sections = prdContent
    ? prdContent.split(/(?=^## )/m).filter(Boolean)
    : ["형상화 PRD 내용이 아직 없어요."];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Link to="/shaping/review" className="text-sm text-muted-foreground hover:underline">
        ← 형상화 목록
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <Badge className={cfg.color}>{cfg.label}</Badge>
        <Badge variant="outline">{detail.mode.toUpperCase()}</Badge>
        <span className="text-sm text-muted-foreground">Phase {detail.currentPhase}</span>
        {detail.qualityScore != null && (
          <span className="text-sm">Quality: {(detail.qualityScore * 100).toFixed(0)}%</span>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        PRD: {detail.discoveryPrdId} | Tokens: {detail.tokenCost.toLocaleString()}/{detail.tokenLimit.toLocaleString()}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main content */}
        <div className="space-y-6">
          {sections.map((sec, i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{sec}</ReactMarkdown>
              </div>
              {detail.status === "running" && (
                <div className="mt-3 border-t pt-3">
                  <SectionReviewAction
                    runId={detail.id}
                    section={`section-${i + 1}`}
                    onReview={() => loadDetail()}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Actions */}
          {detail.status === "running" && (
            <div className="flex gap-3">
              <Button onClick={handleAutoReview} disabled={autoReviewing}>
                {autoReviewing ? "자동 리뷰 진행 중..." : "자동 리뷰 실행"}
              </Button>
            </div>
          )}

          {/* Phase Logs */}
          {detail.phaseLogs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Phase 로그</h3>
              <div className="space-y-1">
                {detail.phaseLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">Phase {log.phase}</Badge>
                    <span>Round {log.round}</span>
                    {log.verdict && <Badge variant="secondary">{log.verdict}</Badge>}
                    <span className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6">
          {detail.expertReviews.length > 0 && (
            <ExpertReviewPanel reviews={detail.expertReviews} />
          )}

          {/* Six Hats */}
          {detail.sixHats.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Six Hats 토론</h3>
              <div className="space-y-2">
                {detail.sixHats.map((hat) => (
                  <div key={hat.id} className="rounded border p-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{hat.hatColor}</Badge>
                      <span className="text-xs">Round {hat.round}</span>
                      {hat.verdict && (
                        <Badge variant="secondary" className="text-xs">{hat.verdict}</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs">{hat.opinion.slice(0, 200)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
