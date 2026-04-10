"use client";

/**
 * F437 — 발굴 9기준 체크리스트 패널
 * F486 — 역할/가이드 명확화 + AI 자동 평가 연동
 * F496 — 정보형 재설계: 큰 요약 카드 + 3×3 컴팩트 그리드 (사용자 액션 없음, AI 자동 평가)
 */
import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Circle, AlertCircle, Loader2, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDiscoveryCriteria, getNextGuide, type CriteriaProgress, type DiscoveryCriterionItem } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

interface DiscoveryCriteriaPanelProps {
  bizItemId: string;
  refreshTrigger?: number;
}

function CriterionStatusIcon({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "size-4" : "size-5";
  switch (status) {
    case "completed":
      return <CheckCircle2 className={cn(cls, "text-green-500 shrink-0")} />;
    case "in_progress":
      return <Loader2 className={cn(cls, "text-blue-500 shrink-0 animate-spin")} />;
    case "needs_revision":
      return <AlertCircle className={cn(cls, "text-amber-500 shrink-0")} />;
    default:
      return <Circle className={cn(cls, "text-slate-300 shrink-0")} />;
  }
}

const GATE_CONFIG = {
  ready: { label: "발굴 준비 완료", className: "bg-green-100 text-green-700 border-green-200" },
  warning: { label: "검토 필요", className: "bg-amber-100 text-amber-700 border-amber-200" },
  blocked: { label: "진행 중", className: "bg-blue-100 text-blue-700 border-blue-200" },
};

const CRITERIA_STAGE_LINK: Record<number, { stage: string; role: string }> = {
  1: { stage: "2-1", role: "AI가 레퍼런스 분석 시 자동 평가" },
  2: { stage: "2-2", role: "AI가 수요/시장 검증 시 자동 평가" },
  3: { stage: "2-3", role: "AI가 경쟁 환경 분석 시 자동 평가" },
  4: { stage: "2-4", role: "AI가 아이템 도출 시 자동 평가" },
  5: { stage: "2-5", role: "AI가 핵심 선정 시 자동 평가" },
  6: { stage: "2-6", role: "AI가 타겟 고객 정의 시 자동 평가" },
  7: { stage: "2-7", role: "AI가 비즈니스 모델 정의 시 자동 평가" },
  8: { stage: "2-3", role: "AI가 경쟁 환경 분석 시 자동 평가" },
  9: { stage: "2-8", role: "AI가 패키징 시 자동 평가" },
};

export default function DiscoveryCriteriaPanel({ bizItemId, refreshTrigger }: DiscoveryCriteriaPanelProps) {
  const [criteria, setCriteria] = useState<CriteriaProgress | null>(null);
  const [nextGuide, setNextGuide] = useState<{ step: string; description: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DiscoveryCriterionItem | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      getDiscoveryCriteria(bizItemId).then(setCriteria),
      getNextGuide(bizItemId).then(setNextGuide).catch(() => null),
    ]).finally(() => setLoading(false));
  }, [bizItemId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadData();
    }
  }, [refreshTrigger, loadData]);

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
    <div className="space-y-4" data-testid="discovery-criteria-panel">
      {/* 요약 카드 — 정보형: 진행률 + AI 자동 안내 */}
      <div className="rounded-xl border bg-gradient-to-br from-blue-50/60 to-white p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-lg bg-blue-100 p-2 shrink-0">
              <Sparkles className="size-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-700">{criteria.completed}</span>
                <span className="text-sm text-muted-foreground">/ {criteria.total} 기준 충족</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI가 각 발굴 단계를 실행할 때 자동으로 평가해요. 별도 입력은 필요 없어요.
              </p>
            </div>
          </div>
          <Badge className={cn("shrink-0", gateCfg.className)}>{gateCfg.label}</Badge>
        </div>
        <div className="h-2 rounded-full bg-blue-100/50 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 9기준 컴팩트 그리드 (3×3) */}
      <div className="grid grid-cols-3 gap-2" data-testid="criteria-grid">
        {criteria.criteria.map((c) => {
          const isSelected = selected?.criterionId === c.criterionId;
          const isDone = c.status === "completed";
          return (
            <button
              key={c.criterionId}
              type="button"
              onClick={() => setSelected(isSelected ? null : c)}
              className={cn(
                "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                "hover:border-blue-300 hover:shadow-sm",
                isSelected && "border-blue-500 bg-blue-50 ring-2 ring-blue-100",
                isDone && !isSelected && "border-green-200 bg-green-50/40",
                !isDone && !isSelected && "border-muted bg-card",
              )}
              aria-label={`기준 ${c.criterionId}: ${c.name}`}
            >
              <CriterionStatusIcon status={c.status} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono text-muted-foreground">#{c.criterionId}</span>
                </div>
                <p className={cn(
                  "text-xs font-medium truncate",
                  isDone && "text-green-700",
                  !isDone && "text-foreground",
                )}>
                  {c.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 기준 상세 (인라인 펼침) */}
      {selected && (
        <div
          className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-xs space-y-2"
          data-testid="criterion-detail"
        >
          <div className="flex items-center gap-2">
            <CriterionStatusIcon status={selected.status} size="sm" />
            <span className="font-semibold text-sm">
              #{selected.criterionId}. {selected.name}
            </span>
            <Badge variant="outline" className="ml-auto gap-1 text-[10px]">
              <Bot className="size-3" /> AI 자동
            </Badge>
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">완료 조건:</span> {selected.condition}
          </div>
          {CRITERIA_STAGE_LINK[selected.criterionId] && (
            <div className="text-blue-700">
              <span className="font-medium">연결 단계:</span>{" "}
              {CRITERIA_STAGE_LINK[selected.criterionId]!.stage} —{" "}
              {CRITERIA_STAGE_LINK[selected.criterionId]!.role}
            </div>
          )}
          {selected.evidence && (
            <div className="text-green-700">
              <span className="font-medium">근거:</span> {selected.evidence}
            </div>
          )}
          {selected.status !== "completed" && CRITERIA_STAGE_LINK[selected.criterionId] && (
            <div className="text-amber-600">
              {CRITERIA_STAGE_LINK[selected.criterionId]!.stage} 단계가 실행되면 자동으로 충족돼요.
            </div>
          )}
        </div>
      )}

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
