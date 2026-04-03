"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { fetchBizItemDetail, getDiscoveryProgress, type BizItemDetail, type DiscoveryProgress } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import ArtifactList from "@/components/feature/ax-bd/ArtifactList";
import { STAGE_LABELS, STAGE_COLORS } from "@/components/feature/pipeline/item-card";

const TYPE_LABELS: Record<string, string> = { I: "아이디어형", M: "시장·타겟형", P: "고객문제형", T: "기술형", S: "서비스형" };

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<BizItemDetail | null>(null);
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchBizItemDetail(id).then(setItem),
      getDiscoveryProgress(id).then(setProgress).catch(() => null),
    ]).catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!item) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/discovery/items" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        {item.discoveryType && <Badge variant="outline">Type {item.discoveryType} — {TYPE_LABELS[item.discoveryType] ?? ""}</Badge>}
        <Badge>{item.status}</Badge>
      </div>
      {item.description && <p className="text-muted-foreground max-w-3xl whitespace-pre-wrap">{item.description}</p>}
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

      {/* Process Progress */}
      {progress && progress.stages.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">프로세스 진행률</h2>
          <div className="flex items-center gap-1">
            {progress.stages.map((s, i) => {
              const isCurrent = s.stage === progress.currentStage;
              const isCompleted = s.status === "completed";
              const colorClass = STAGE_COLORS[s.stage] ?? "bg-gray-100 text-gray-800";
              return (
                <div key={s.stage} className="flex items-center">
                  {i > 0 && <div className="mx-1 h-px w-4 bg-border" />}
                  <div
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      isCompleted
                        ? "bg-green-100 text-green-700"
                        : isCurrent
                          ? `${colorClass} ring-2 ring-blue-400 ring-offset-1`
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                    {STAGE_LABELS[s.stage] ?? s.stageName}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.completedCount}/{progress.totalCount} 단계 완료
          </p>
        </div>
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
