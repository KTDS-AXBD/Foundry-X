"use client";

/**
 * F323 — 대시보드 ToDo List
 * 아이템별 현재 6단계 위치 + 다음 할 일 + 의사결정 대기
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchApi } from "@/lib/api-client";
import { STAGES } from "@/components/feature/ProcessStageGuide";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Stage → nextAction 매핑                                            */
/* ------------------------------------------------------------------ */

const NEXT_ACTIONS: Record<number, { label: string; href: string }> = {
  1: { label: "아이디어 등록", href: "/discovery" },
  2: { label: "평가 실행", href: "/discovery?tab=process" },
  3: { label: "사업기획서 작성", href: "/shaping/business-plan" },
  4: { label: "검증 기록", href: "/validation" },
  5: { label: "MVP/PoC 추적", href: "/product" },
  6: { label: "선제안 작성", href: "/gtm/outreach" },
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BizItemSummary {
  bizItemId: string;
  title: string;
  currentStage: number;
  pendingDecision?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Stage Indicator                                                    */
/* ------------------------------------------------------------------ */

const stageColors = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-indigo-500",
  "bg-rose-500",
];

function StageIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const stageNum = stage.stage;
        const isCompleted = stageNum < current;
        const isCurrent = stageNum === current;

        return (
          <div key={stageNum} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all",
                  isCurrent
                    ? cn("size-7 text-white text-xs font-bold", stageColors[i])
                    : isCompleted
                      ? "size-5 bg-green-500 text-white"
                      : "size-5 bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="size-3" />
                ) : isCurrent ? (
                  stageNum
                ) : (
                  <Circle className="size-2.5" />
                )}
              </div>
              {isCurrent && (
                <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                  {stage.label}
                </span>
              )}
            </div>
            {i < STAGES.length - 1 && (
              <div
                className={cn(
                  "mx-0.5 h-px w-3",
                  stageNum < current ? "bg-green-500" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TodoSection                                                        */
/* ------------------------------------------------------------------ */

export function TodoSection() {
  const [items, setItems] = useState<BizItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchApi<{ items: BizItemSummary[] }>("/biz-items/summary")
      .then((data) => {
        if (!cancelled) {
          setItems(data.items ?? []);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        📋 ToDo List
      </h2>

      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          진행 중인 사업 아이템이 없어요.{" "}
          <Link to="/collection/sr" className="text-primary underline">
            SR 등록
          </Link>
          으로 시작해 보세요.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const next = NEXT_ACTIONS[item.currentStage] ?? NEXT_ACTIONS[1]!;
            return (
              <div
                key={item.bizItemId}
                className="flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
              >
                {/* 아이템 제목 + 의사결정 뱃지 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.title}
                    </span>
                    {item.pendingDecision && (
                      <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-600 text-[10px]">
                        의사결정 대기
                      </Badge>
                    )}
                  </div>
                  <StageIndicator current={item.currentStage} />
                </div>

                {/* 다음 할 일 */}
                <Link
                  to={next.href}
                  className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  {next.label}
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
