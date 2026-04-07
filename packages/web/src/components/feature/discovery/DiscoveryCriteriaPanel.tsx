"use client";

/**
 * F437 — 발굴 9기준 체크리스트 패널
 * 아이템 상세 내 발굴 분석 진행 상태를 표시 (display-only, 실행은 F438)
 */
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react";
import { getDiscoveryCriteria, getNextGuide, type CriteriaProgress } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

interface DiscoveryCriteriaPanelProps {
  bizItemId: string;
}

function CriterionStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-4 text-green-500 shrink-0" />;
    case "in_progress":
      return <Loader2 className="size-4 text-blue-500 shrink-0 animate-spin" />;
    case "needs_revision":
      return <AlertCircle className="size-4 text-amber-500 shrink-0" />;
    default:
      return <Circle className="size-4 text-slate-300 shrink-0" />;
  }
}

const GATE_CONFIG = {
  ready: { label: "발굴 준비 완료", variant: "secondary" as const },
  warning: { label: "검토 필요", variant: "outline" as const },
  blocked: { label: "진행 중", variant: "outline" as const },
};

export default function DiscoveryCriteriaPanel({ bizItemId }: DiscoveryCriteriaPanelProps) {
  const [criteria, setCriteria] = useState<CriteriaProgress | null>(null);
  const [nextGuide, setNextGuide] = useState<{ step: string; description: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDiscoveryCriteria(bizItemId).then(setCriteria),
      getNextGuide(bizItemId).then(setNextGuide).catch(() => null),
    ]).finally(() => setLoading(false));
  }, [bizItemId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> 로딩 중...
      </div>
    );
  }

  if (!criteria) {
    return <div className="py-4 text-sm text-muted-foreground">분석 정보를 불러올 수 없어요.</div>;
  }

  const progressPct = Math.round((criteria.completed / criteria.total) * 100);
  const gateCfg = GATE_CONFIG[criteria.gateStatus] ?? GATE_CONFIG.blocked;

  return (
    <div className="space-y-4">
      {/* 진행률 요약 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {criteria.completed} / {criteria.total} 기준 완료
          </p>
          <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <Badge variant={gateCfg.variant}>{gateCfg.label}</Badge>
      </div>

      {/* 9기준 체크리스트 */}
      <div className="space-y-2">
        {criteria.criteria.map((c) => (
          <div
            key={c.criterionId}
            className="flex items-start gap-3 rounded-lg border p-3 text-sm"
          >
            <CriterionStatusIcon status={c.status} />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{c.criterionId}. {c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.condition}</div>
              {c.evidence && (
                <div className="text-xs text-green-700 mt-1 line-clamp-1">{c.evidence}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 다음 단계 가이드 */}
      {nextGuide && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm">
          <div className="font-medium text-blue-800">다음 단계</div>
          <div className="text-blue-700 mt-0.5">{nextGuide.description}</div>
        </div>
      )}
    </div>
  );
}
