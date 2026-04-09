/**
 * F493: DiscoveryReportV2View — 9탭 리치 리포트 컨테이너
 * DiscoveryReportData(v2) 전체를 렌더링한다
 */
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
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

const TAB_KEYS = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7", "2-8", "2-9"] as const;

const TAB_LABELS: Record<string, string> = {
  "2-1": "레퍼런스",
  "2-2": "시장 검증",
  "2-3": "경쟁 분석",
  "2-4": "아이템 도출",
  "2-5": "아이템 선정",
  "2-6": "타겟 고객",
  "2-7": "BM 정의",
  "2-8": "패키징",
  "2-9": "AI 평가",
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
  const [activeTab, setActiveTab] = useState("2-1");

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

      {/* 9탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-9 h-auto gap-0.5">
          {TAB_KEYS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="text-[10px] py-1.5 px-1 data-[state=active]:bg-background"
              data-step={key}
            >
              {TAB_LABELS[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_KEYS.map((key) => {
          const tabData = data.tabs[key];
          if (!tabData) return null;
          return (
            <TabsContent key={key} value={key} className="mt-4">
              <TabRenderer stepKey={key} tab={tabData as Parameters<typeof TabRenderer>[0]["tab"]} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
