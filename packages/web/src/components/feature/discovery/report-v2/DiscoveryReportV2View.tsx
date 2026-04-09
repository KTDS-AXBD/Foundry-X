/**
 * F493: DiscoveryReportV2View — 9카드 오버뷰 + 클릭→Sheet 상세
 * Tabs 레이아웃 대신 9단계를 카드 그리드로 보여주고, 카드 클릭 시 Sheet에서 풀 상세를 렌더링
 */
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet.js";
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
  const [openKey, setOpenKey] = useState<string | null>(null);

  const openTab = openKey ? (data.tabs[openKey] as TabPreview | undefined) : undefined;

  return (
    <div className="space-y-5">
      {/* 리포트 헤더 */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{data.bizItemTitle}</h1>
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
        <div className="rounded-md bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Executive Summary</p>
          <p className="text-sm leading-relaxed">{data.summary.executiveSummary}</p>
        </div>

        {/* Recommendation */}
        <div
          className="rounded-md p-3"
          style={{ backgroundColor: "var(--discovery-mint-bg)" }}
        >
          <p
            className="text-xs font-medium mb-1"
            style={{ color: "var(--discovery-mint)" }}
          >
            Recommendation
          </p>
          <p className="text-sm leading-relaxed">{data.summary.recommendation}</p>
        </div>
      </div>

      {/* 9단계 오버뷰 카드 그리드 */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            9단계 발굴 분석
          </h2>
          <p className="text-xs text-muted-foreground">
            카드를 클릭하면 상세 내용이 열려요
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
                onClick={() => setOpenKey(key)}
                className="group text-left rounded-lg border bg-card p-4 space-y-3 hover:border-[color:var(--foreground)]/30 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--discovery-mint)]"
                data-step={key}
              >
                {/* 스텝 배지 + HITL */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center justify-center min-w-[2.25rem] h-6 rounded-full text-[11px] font-bold px-2"
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {tab.stepNumber.replace("STEP ", "")}
                  </span>
                  {tab.hitlVerified && (
                    <Badge className="bg-green-100 text-green-800 text-[10px] h-5">
                      ✓ HITL
                    </Badge>
                  )}
                </div>

                {/* 타이틀 */}
                <div>
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2">
                    {tab.title}
                  </h3>
                  {tab.engTitle && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {tab.engTitle}
                    </p>
                  )}
                </div>

                {/* 서브타이틀 */}
                {tab.subtitle && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tab.subtitle}
                  </p>
                )}

                {/* 메타 (카드/태그/차트 수) */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-2 border-t">
                  <span className="inline-flex items-center gap-1">
                    <span className="font-medium" style={{ color: fg }}>
                      {cardCount}
                    </span>
                    카드
                  </span>
                  {tagCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium" style={{ color: fg }}>
                        {tagCount}
                      </span>
                      태그
                    </span>
                  )}
                  {hasChart && (
                    <span className="inline-flex items-center gap-1" style={{ color: fg }}>
                      📊 차트
                    </span>
                  )}
                  <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    자세히 →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 상세 Sheet (우측 Drawer) */}
      <Sheet open={!!openKey} onOpenChange={(o) => !o && setOpenKey(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto"
        >
          {openKey && openTab && (
            <>
              <SheetHeader>
                <SheetTitle className="sr-only">
                  {openTab.title} — {data.bizItemTitle}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  {openTab.subtitle ?? openTab.engTitle ?? ""}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-2">
                <TabRenderer
                  stepKey={openKey}
                  tab={openTab as Parameters<typeof TabRenderer>[0]["tab"]}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
