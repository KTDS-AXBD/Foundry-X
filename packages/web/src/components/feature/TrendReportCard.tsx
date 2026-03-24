"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MarketSizeEstimate {
  tam: string;
  sam: string;
  som: string;
  currency: string;
  year: number;
  confidence: "high" | "medium" | "low";
}

interface Trend {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  timeframe: string;
}

interface Competitor {
  name: string;
  description: string;
  url?: string;
  relevance: "high" | "medium" | "low";
}

export interface TrendReportData {
  id: string;
  bizItemId: string;
  marketSummary: string;
  marketSizeEstimate: MarketSizeEstimate | null;
  competitors: Competitor[];
  trends: Trend[];
  analyzedAt: string;
  expiresAt: string;
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const IMPACT_ICON: Record<string, string> = {
  high: "🔴",
  medium: "🟡",
  low: "🟢",
};

interface TrendReportCardProps {
  report: TrendReportData;
}

export default function TrendReportCard({ report }: TrendReportCardProps) {
  const { marketSummary, marketSizeEstimate, trends } = report;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>📊 시장·트렌드 분석</span>
          <span className="text-xs font-normal text-muted-foreground">
            {new Date(report.analyzedAt).toLocaleDateString("ko-KR")}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 시장 요약 */}
        <p className="text-sm text-muted-foreground leading-relaxed">{marketSummary}</p>

        {/* TAM / SAM / SOM 카드 */}
        {marketSizeEstimate && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <SizeCard label="TAM" value={marketSizeEstimate.tam} />
              <SizeCard label="SAM" value={marketSizeEstimate.sam} />
              <SizeCard label="SOM" value={marketSizeEstimate.som} />
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`border text-[11px] ${CONFIDENCE_STYLE[marketSizeEstimate.confidence] ?? CONFIDENCE_STYLE.low}`}>
                confidence: {marketSizeEstimate.confidence}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {marketSizeEstimate.year}년 기준 · {marketSizeEstimate.currency}
              </span>
            </div>
          </div>
        )}

        {/* 핵심 트렌드 */}
        {trends.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium">핵심 트렌드</h4>
            <ul className="space-y-1">
              {trends.map((t, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm">
                  <span className="mt-0.5 shrink-0">{IMPACT_ICON[t.impact] ?? "⚪"}</span>
                  <span>
                    <span className="font-medium">{t.title}</span>
                    <span className="text-muted-foreground"> — {t.description}</span>
                    <span className="ml-1 text-xs text-muted-foreground">({t.timeframe})</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SizeCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/50 p-2.5 text-center">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
