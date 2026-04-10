/**
 * F493: DiscoveryReportV2View — 9카드 오버뷰 + 인라인 풀페이지 상세 전환
 * Sheet drawer를 쓰지 않고 `mode: 'overview' | 'detail'` 로 본문 영역을 교체 → 오버랩 없음 + 풀 너비로 테이블 렌더링
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge.js";
import { TabRenderer } from "./TabRenderer.js";

interface DiscoveryReportData {
  version: "v2";
  bizItemId: string;
  bizItemTitle: string;
  typeCode?: string;
  subtitle?: string;
  tabs: Record<string, unknown>;
  summary: {
    executiveSummary: string;
    trafficLight: "green" | "yellow" | "red";
    goHoldDrop: "Go" | "Hold" | "Drop";
    recommendation: string;
  };
}

interface TabPreview {
  stepNumber: string;
  title: string;
  engTitle?: string;
  subtitle?: string;
  hitlVerified: boolean;
  tags?: Array<{ label: string; color: string }>;
  cards: unknown[];
  chart?: unknown;
  insight?: { title: string; items: string[] };
  nextStep?: { text: string };
}

const TAB_KEYS = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9"] as const;

const STEP_COLOR_GROUP: Record<string, "mint" | "blue" | "amber" | "red" | "purple"> = {
  "2-1": "mint",
  "2-2": "mint",
  "2-3": "blue",
  "2-4": "blue",
  "2-5": "amber",
  "2-6": "amber",
  "2-7": "amber",
  "2-8": "red",
  "2-9": "purple",
};

const STEP_BG_VAR: Record<string, string> = {
  mint: "var(--discovery-mint-bg)",
  blue: "var(--discovery-blue-bg)",
  amber: "var(--discovery-amber-bg)",
  red: "var(--discovery-red-bg)",
  purple: "var(--discovery-purple-bg)",
};

const STEP_FG_VAR: Record<string, string> = {
  mint: "var(--discovery-mint)",
  blue: "var(--discovery-blue)",
  amber: "var(--discovery-amber)",
  red: "var(--discovery-red)",
  purple: "var(--discovery-purple)",
};

const TRAFFIC_LIGHT_STYLE: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
};

const GO_HOLD_DROP_STYLE: Record<string, string> = {
  Go: "bg-[var(--discovery-mint-bg)] text-[var(--discovery-mint)]",
  Hold: "bg-yellow-100 text-yellow-800",
  Drop: "bg-red-100 text-red-800",
};

interface DiscoveryReportV2ViewProps {
  data: DiscoveryReportData;
}

export function DiscoveryReportV2View({ data }: DiscoveryReportV2ViewProps) {
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const detailTab = detailKey ? (data.tabs[detailKey] as TabPreview | undefined) : undefined;

  // ── 상세 모드 ────────────────────────────────────────────────────────
  if (detailKey && detailTab) {
    const currentIdx = TAB_KEYS.indexOf(detailKey as (typeof TAB_KEYS)[number]);
    const prevKey = currentIdx > 0 ? TAB_KEYS[currentIdx - 1] : null;
    const nextKey = currentIdx < TAB_KEYS.length - 1 ? TAB_KEYS[currentIdx + 1] : null;

    return (
      <div className="space-y-5">
        {/* 상세 헤더: 뒤로 + 이전/다음 네비 */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setDetailKey(null)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors"
          >
            ← 9단계 목록으로
          </button>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={!prevKey}
              onClick={() => prevKey && setDetailKey(prevKey)}
              className="px-3 py-1.5 rounded border text-foreground/80 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← 이전
            </button>
            <span className="text-muted-foreground min-w-[3rem] text-center">
              {currentIdx + 1} / {TAB_KEYS.length}
            </span>
            <button
              type="button"
              disabled={!nextKey}
              onClick={() => nextKey && setDetailKey(nextKey)}
              className="px-3 py-1.5 rounded border text-foreground/80 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              다음 →
            </button>
          </div>
        </div>

        {/* 상세 콘텐츠 (풀 너비) */}
        <TabRenderer
          stepKey={detailKey}
          tab={detailTab as Parameters<typeof TabRenderer>[0]["tab"]}
        />
      </div>
    );
  }

  // ── 오버뷰 모드 ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* 리포트 헤더 */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{data.bizItemTitle}</h1>
            {data.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{data.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {data.typeCode && (
              <Badge className="bg-[var(--discovery-blue-bg)] text-[var(--discovery-blue)]">
                TYPE {data.typeCode}
              </Badge>
            )}
            <Badge className={TRAFFIC_LIGHT_STYLE[data.summary.trafficLight]}>
              {data.summary.trafficLight.toUpperCase()}
            </Badge>
            <Badge className={GO_HOLD_DROP_STYLE[data.summary.goHoldDrop]}>
              {data.summary.goHoldDrop}
            </Badge>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="rounded-md bg-muted/40 p-4 border border-border/40">
          <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground mb-2">
            Executive Summary
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {data.summary.executiveSummary}
          </p>
        </div>

        {/* Recommendation */}
        <div
          className="rounded-md p-4 border"
          style={{
            backgroundColor: "var(--discovery-mint-bg)",
            borderColor: "color-mix(in srgb, var(--discovery-mint) 30%, transparent)",
          }}
        >
          <p
            className="text-[11px] font-semibold tracking-wide uppercase mb-2"
            style={{ color: "var(--discovery-mint)" }}
          >
            Recommendation
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {data.summary.recommendation}
          </p>
        </div>
      </div>

      {/* 9단계 오버뷰 카드 그리드 */}
      <div>
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-foreground">9단계 발굴 분석</h2>
          <p className="text-xs text-muted-foreground">
            카드를 클릭하면 상세 내용을 볼 수 있어요
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TAB_KEYS.map((key) => {
            const tab = data.tabs[key] as TabPreview | undefined;
            if (!tab) return null;
            const group = STEP_COLOR_GROUP[key];
            const fg = STEP_FG_VAR[group];
            const bg = STEP_BG_VAR[group];
            const cardCount = Array.isArray(tab.cards) ? tab.cards.length : 0;
            const tagCount = Array.isArray(tab.tags) ? tab.tags.length : 0;
            const hasChart = !!tab.chart;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setDetailKey(key)}
                className="group relative text-left rounded-lg border bg-card p-4 flex flex-col gap-3 hover:border-[color:var(--foreground)]/40 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-[color:var(--discovery-mint)]"
                data-step={key}
              >
                {/* 스텝 배지 + HITL */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center justify-center min-w-[2.5rem] h-6 rounded-full text-[11px] font-bold px-2.5"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {tab.stepNumber.replace("STEP ", "")}
                  </span>
                  {tab.hitlVerified && (
                    <Badge className="bg-green-100 text-green-800 text-[10px] h-5 px-2">
                      ✓ HITL
                    </Badge>
                  )}
                </div>

                {/* 타이틀 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
                    {tab.title}
                  </h3>
                  {tab.engTitle && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {tab.engTitle}
                    </p>
                  )}
                  {tab.subtitle && (
                    <p className="text-xs text-muted-foreground/90 mt-2 line-clamp-2 leading-relaxed">
                      {tab.subtitle}
                    </p>
                  )}
                </div>

                {/* 메타 */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-2 border-t">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-semibold" style={{ color: fg }}>
                      {cardCount}
                    </span>
                    카드
                  </span>
                  {tagCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-semibold" style={{ color: fg }}>
                        {tagCount}
                      </span>
                      태그
                    </span>
                  )}
                  {hasChart && (
                    <span
                      className="inline-flex items-center gap-1 font-medium"
                      style={{ color: fg }}
                    >
                      차트
                    </span>
                  )}
                  <span
                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                    style={{ color: fg }}
                  >
                    자세히 →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
