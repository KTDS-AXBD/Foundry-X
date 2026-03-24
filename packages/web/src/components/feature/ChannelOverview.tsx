"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ChannelStats {
  total: number;
  byChannel: Record<string, number>;
  approvalRate: number;
}

interface ChannelOverviewProps {
  stats: ChannelStats;
}

const CHANNELS = [
  { key: "agent", label: "Agent 자동 수집", icon: "🤖", description: "LLM 기반 키워드 탐색" },
  { key: "field", label: "Field-driven", icon: "👤", description: "현장 직접 등록" },
  { key: "idea_portal", label: "IDEA Portal", icon: "💡", description: "외부 Webhook 접수" },
] as const;

export default function ChannelOverview({ stats }: ChannelOverviewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CHANNELS.map((ch) => (
        <Card key={ch.key}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="text-lg">{ch.icon}</span>
              {ch.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {stats.byChannel[ch.key] ?? 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{ch.description}</p>
          </CardContent>
        </Card>
      ))}

      <Card className="sm:col-span-3">
        <CardContent className="flex items-center justify-between pt-4">
          <div>
            <span className="text-sm text-muted-foreground">전체 수집 아이템</span>
            <span className="ml-2 text-xl font-bold">{stats.total}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">승인율</span>
            <span className="ml-2 text-xl font-bold">
              {(stats.approvalRate * 100).toFixed(1)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
