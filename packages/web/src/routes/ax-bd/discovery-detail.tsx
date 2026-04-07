"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileBarChart, Zap } from "lucide-react";
import { fetchBizItemDetail, type BizItemDetail } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import ArtifactList from "@/components/feature/ax-bd/ArtifactList";
import { STAGE_LABELS, STAGE_COLORS } from "@/components/feature/pipeline/item-card";
import DiscoveryCriteriaPanel from "@/components/feature/discovery/DiscoveryCriteriaPanel";
import AnalysisStepper from "@/components/feature/discovery/AnalysisStepper";

const TYPE_LABELS: Record<string, string> = {
  I: "아이디어형",
  M: "시장·타겟형",
  P: "고객문제형",
  T: "기술형",
  S: "서비스형",
};

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<BizItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBizItemDetail(id)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!item) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6 p-6" data-testid="discovery-detail">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/discovery/items" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        {item.discoveryType && (
          <Badge variant="outline">
            Type {item.discoveryType} — {TYPE_LABELS[item.discoveryType] ?? ""}
          </Badge>
        )}
        <Badge>{item.status}</Badge>
      </div>

      {item.description && (
        <p className="text-muted-foreground max-w-3xl whitespace-pre-wrap">{item.description}</p>
      )}

      {/* Meta */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Source</div>
          <div className="text-sm font-medium">{item.source}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Created</div>
          <div className="text-sm">{new Date(item.createdAt).toLocaleDateString("ko")}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">ID</div>
          <div className="text-xs font-mono text-muted-foreground">{item.id}</div>
        </div>
      </div>

      {/* F438: 발굴 분석 실행 */}
      {id && (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold">발굴 분석</h2>
            <Badge variant="secondary" className="text-xs">MVP · 3단계</Badge>
          </div>
          <AnalysisStepper
            bizItemId={id}
            discoveryType={item.discoveryType}
            onAnalysisComplete={() => {
              // Reload item to reflect updated status
              fetchBizItemDetail(id).then(setItem).catch(() => null);
            }}
          />
        </div>
      )}

      {/* F437: 발굴 9기준 체크리스트 */}
      {id && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">발굴 분석 기준</h2>
          <DiscoveryCriteriaPanel bizItemId={id} />
        </div>
      )}

      {/* Report Link */}
      {id && (
        <Link
          to={`/discovery/items/${id}/report`}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
        >
          <FileBarChart className="size-4" />
          발굴 완료 리포트 보기
        </Link>
      )}

      {/* Artifacts */}
      {id && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">산출물</h2>
          <ArtifactList bizItemId={id} />
        </div>
      )}
    </div>
  );
}
