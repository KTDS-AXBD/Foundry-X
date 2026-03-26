"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import TrafficLightPanel from "@/components/feature/TrafficLightPanel";
import AnalysisPathStepper from "@/components/feature/AnalysisPathStepper";
import CommitGateCard from "@/components/feature/CommitGateCard";
import EvaluationSummaryCard from "@/components/feature/EvaluationSummaryCard";
import {
  fetchApi,
  getTrafficLight,
  getCommitGate,
  getAnalysisPath,
  type TrafficLightResponse,
  type CommitGateResponse,
  type AnalysisPathResponse,
} from "@/lib/api-client";

const TYPE_COLORS: Record<string, string> = {
  I: "bg-blue-100 text-blue-700 border-blue-200",
  M: "bg-emerald-100 text-emerald-700 border-emerald-200",
  P: "bg-amber-100 text-amber-700 border-amber-200",
  T: "bg-purple-100 text-purple-700 border-purple-200",
  S: "bg-rose-100 text-rose-700 border-rose-200",
};

interface BizItemDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  discovery_type: string | null;
}

export default function DiscoveryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<BizItemDetail | null>(null);
  const [trafficLight, setTrafficLight] = useState<TrafficLightResponse | null>(null);
  const [commitGate, setCommitGate] = useState<CommitGateResponse | null>(null);
  const [analysisPath, setAnalysisPath] = useState<AnalysisPathResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [itemData, tl] = await Promise.all([
          fetchApi<BizItemDetail>(`/biz-items/${id}`),
          getTrafficLight(id),
        ]);
        setItem(itemData);
        setTrafficLight(tl);

        // Load commit gate (may 404)
        try {
          const gate = await getCommitGate(id);
          setCommitGate(gate);
        } catch {
          // No commit gate yet
        }

        // Load analysis path if type is set
        if (itemData.discovery_type) {
          try {
            const path = await getAnalysisPath(id);
            setAnalysisPath(path);
          } catch {
            // No path yet
          }
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-muted-foreground">로딩 중...</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-muted-foreground">아이템을 찾을 수 없어요.</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <Link
          href="/ax-bd/discovery"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Discovery 프로세스
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{item.title}</h1>
          {item.discovery_type && (
            <Badge className={cn("text-xs", TYPE_COLORS[item.discovery_type])}>
              Type {item.discovery_type}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        )}
      </div>

      {/* Traffic Light */}
      {trafficLight && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-bold">사업성 신호등</h2>
          <TrafficLightPanel trafficLight={trafficLight} />
        </div>
      )}

      {/* Analysis Path */}
      {analysisPath && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-bold">분석 경로</h2>
          <AnalysisPathStepper
            path={{
              startingPoint: analysisPath.discoveryType.toLowerCase(),
              label: `Type ${analysisPath.discoveryType} — ${analysisPath.typeName}`,
              description: `${analysisPath.typeName} 유형의 맞춤 분석 경로`,
              steps: analysisPath.stages.map((s, i) => ({
                order: i + 1,
                activity: `${s.stage} ${s.stageName} (${s.intensity})`,
                pmSkills: [],
                discoveryMapping: [],
              })),
            }}
          />
        </div>
      )}

      {/* Commit Gate */}
      <div>
        <h2 className="mb-3 text-sm font-bold">Commit Gate (2-5)</h2>
        <CommitGateCard gate={commitGate} />
      </div>

      {/* Evaluation */}
      <div>
        <h2 className="mb-3 text-sm font-bold">멀티페르소나 평가 (2-9)</h2>
        <EvaluationSummaryCard bizItemId={id} />
      </div>
    </div>
  );
}
