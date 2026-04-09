"use client";

/**
 * F437 — 발굴 9기준 체크리스트 패널
 * F486 — 역할/가이드 명확화 + AI 자동 평가 연동
 */
import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Circle, AlertCircle, Loader2, Bot, User, ChevronDown, ChevronUp } from "lucide-react";
import { getDiscoveryCriteria, getNextGuide, type CriteriaProgress } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

interface DiscoveryCriteriaPanelProps {
  bizItemId: string;
  refreshTrigger?: number;  // F486: 부모에서 stage 완료 시 증가하여 갱신 트리거
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

// F486: 기준별 연결 단계 + 역할 설명
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
  const [expandedCriterion, setExpandedCriterion] = useState<number | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      getDiscoveryCriteria(bizItemId).then(setCriteria),
      getNextGuide(bizItemId).then(setNextGuide).catch(() => null),
    ]).finally(() => setLoading(false));
  }, [bizItemId]);

  useEffect(() => { loadData(); }, [loadData]);

  // F486: refreshTrigger 변경 시 데이터 갱신
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
        {criteria.criteria.map((c) => {
          const stageLink = CRITERIA_STAGE_LINK[c.criterionId];
          const isExpanded = expandedCriterion === c.criterionId;

          return (
            <div
              key={c.criterionId}
              className="rounded-lg border p-3 text-sm cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedCriterion(isExpanded ? null : c.criterionId)}
            >
              <div className="flex items-start gap-3">
                <CriterionStatusIcon status={c.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.criterionId}. {c.name}</span>
                    {/* F486: 역할 배지 */}
                    {stageLink ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Bot className="size-3" /> AI 자동
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1">
                        <User className="size-3" /> 수동 확인
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.condition}</div>
                  {!isExpanded && c.evidence && (
                    <div className="text-xs text-green-700 mt-1 line-clamp-1">{c.evidence}</div>
                  )}
                </div>
                <div className="shrink-0 text-muted-foreground">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>

              {/* F486: 확장 영역 — 상세 설명 + evidence 전체 */}
              {isExpanded && (
                <div className="mt-3 ml-7 space-y-2 text-xs">
                  {/* 역할 설명 */}
                  {stageLink && (
                    <div className="rounded-md bg-blue-50 border border-blue-100 p-2 text-blue-700">
                      <span className="font-medium">연결 단계: {stageLink.stage}</span> — {stageLink.role}
                    </div>
                  )}
                  {/* 조건 전체 */}
                  <div className="text-muted-foreground">
                    <span className="font-medium">완료 조건:</span> {c.condition}
                  </div>
                  {/* evidence 전체 */}
                  {c.evidence && (
                    <div className="text-green-700">
                      <span className="font-medium">근거:</span> {c.evidence}
                    </div>
                  )}
                  {/* 미완료 안내 */}
                  {c.status !== "completed" && stageLink && (
                    <div className="text-amber-600">
                      {stageLink.stage} 단계를 실행하면 이 기준이 자동으로 완료돼요.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
