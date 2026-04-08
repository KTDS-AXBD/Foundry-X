"use client";

/**
 * Sprint 223: F460 — 포트폴리오 뷰 메인 컴포넌트
 * 사업 아이템 목록 + 파이프라인 진행률 + 선택 시 연결 그래프
 */
import { useState, useEffect, useMemo } from "react";
import { fetchApi, fetchPortfolio } from "@/lib/api-client";
import type { BizItemSummary, PortfolioTree } from "@/lib/api-client";
import { PipelineProgressBar } from "./PipelineProgressBar";
import { PortfolioGraph } from "./PortfolioGraph";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Layers, FileText, Package } from "lucide-react";
import LoadingSkeleton from "./LoadingSkeleton";

const STAGE_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "REGISTERED", label: "등록" },
  { value: "DISCOVERY", label: "발굴" },
  { value: "FORMALIZATION", label: "형상화" },
  { value: "REVIEW", label: "검토" },
  { value: "DECISION", label: "결정" },
  { value: "OFFERING", label: "오퍼링" },
];

// /biz-items/summary endpoint returns {bizItemId, title, currentStage (number)}
// We need raw biz_items with stage string — use /biz-items for basic list
// and overlay progress from portfolio endpoint on demand

interface PortfolioSummaryItem {
  id: string;
  title: string;
  status: string;
  currentStage: number;  // 1-based stage number from summary
  stageKey: string;      // REGISTERED | DISCOVERY | ...
}

const STAGE_KEYS = ["REGISTERED", "DISCOVERY", "FORMALIZATION", "REVIEW", "DECISION", "OFFERING"];

function stageNumToKey(num: number): string {
  return STAGE_KEYS[num - 1] ?? "REGISTERED";
}

interface PortfolioViewProps {
  orgId?: string;
}

export function PortfolioView(_: PortfolioViewProps) {
  const [items, setItems] = useState<PortfolioSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioTree | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  // 아이템 목록 로드
  useEffect(() => {
    setLoading(true);
    fetchApi<Array<{ bizItemId: string; title: string; currentStage: number }>>("/biz-items/summary")
      .then((data) => {
        setItems(
          data.map((d) => ({
            id: d.bizItemId,
            title: d.title,
            status: "draft",
            currentStage: d.currentStage,
            stageKey: stageNumToKey(d.currentStage),
          })),
        );
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // 아이템 선택 시 포트폴리오 조회
  useEffect(() => {
    if (!selectedId) {
      setPortfolio(null);
      return;
    }
    setPortfolioLoading(true);
    fetchPortfolio(selectedId)
      .then(setPortfolio)
      .catch(() => setPortfolio(null))
      .finally(() => setPortfolioLoading(false));
  }, [selectedId]);

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.stageKey === filter);
  }, [items, filter]);

  if (loading) return <LoadingSkeleton variant="item-list" />;

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-2">
        {STAGE_FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
            {opt.value !== "all" && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {items.filter((i) => i.stageKey === opt.value).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Layers className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">등록된 사업 아이템이 없어요</p>
        </div>
      )}

      <div className="grid gap-3">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            data-portfolio-item={item.id}
            className={[
              "cursor-pointer transition-all",
              selectedId === item.id ? "ring-2 ring-primary" : "hover:shadow-sm",
            ].join(" ")}
            onClick={() => setSelectedId(selectedId === item.id ? null : item.id)}
          >
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.title}</span>
                <ChevronRight
                  className={["h-4 w-4 text-muted-foreground transition-transform", selectedId === item.id ? "rotate-90" : ""].join(" ")}
                />
              </div>
            </CardHeader>
            <CardContent className="pb-4 pt-0">
              <PipelineProgressBar
                currentStage={item.stageKey}
                completedStages={STAGE_KEYS.slice(0, item.currentStage)}
                overallPercent={Math.round((item.currentStage / 6) * 100)}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 선택된 아이템 상세 포트폴리오 */}
      {selectedId && (
        <div className="mt-4 space-y-3">
          {portfolioLoading && <LoadingSkeleton variant="item-list" />}
          {portfolio && !portfolioLoading && (
            <>
              {/* 문서 카운트 요약 */}
              <div className="flex flex-wrap gap-3">
                <SummaryChip icon={<FileText className="h-3.5 w-3.5" />} label="기획서" count={portfolio.businessPlans.length} />
                <SummaryChip icon={<Layers className="h-3.5 w-3.5" />} label="Offering" count={portfolio.offerings.length} />
                <SummaryChip icon={<Package className="h-3.5 w-3.5" />} label="Prototype" count={portfolio.prototypes.length} />
                <SummaryChip icon={<span className="text-[10px]">✅</span>} label={`발굴기준 ${portfolio.progress.criteriaCompleted}/${portfolio.progress.criteriaTotal}`} />
              </div>
              {/* 연결 그래프 */}
              <PortfolioGraph portfolio={portfolio} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryChip({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <Badge variant="secondary" className="ml-1 text-[10px]">{count}</Badge>
      )}
    </div>
  );
}
