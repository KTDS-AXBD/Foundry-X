"use client";

import { Badge } from "@/components/ui/badge";

interface ProgressItem {
  bizItemId: string;
  title: string;
  methodologyId: string;
  gateStatus: "blocked" | "warning" | "ready";
  completedCount: number;
  totalCount: number;
}

interface MethodologyProgressDashProps {
  items: ProgressItem[];
}

const GATE_STYLES: Record<string, { label: string; color: string }> = {
  ready: { label: "Ready", color: "bg-green-100 text-green-800" },
  warning: { label: "Warning", color: "bg-yellow-100 text-yellow-800" },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-800" },
};

export default function MethodologyProgressDash({ items }: MethodologyProgressDashProps) {
  const grouped = items.reduce<Record<string, ProgressItem[]>>((acc, item) => {
    const key = item.methodologyId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">방법론별 진행 현황</h2>

      {Object.entries(grouped).map(([methodId, methodItems]) => {
        const readyCount = methodItems.filter(i => i.gateStatus === "ready").length;
        const progressPct = methodItems.length > 0
          ? Math.round((readyCount / methodItems.length) * 100)
          : 0;

        return (
          <div key={methodId} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{methodId} ({methodItems.length} 아이템)</span>
              <span className="text-sm text-muted-foreground">{progressPct}%</span>
            </div>

            <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2">아이템</th>
                    <th className="pb-2">게이트</th>
                    <th className="pb-2">진행률</th>
                  </tr>
                </thead>
                <tbody>
                  {methodItems.map(item => {
                    const gate = GATE_STYLES[item.gateStatus] ?? GATE_STYLES.blocked;
                    const pct = item.totalCount > 0
                      ? Math.round((item.completedCount / item.totalCount) * 100)
                      : 0;
                    return (
                      <tr key={item.bizItemId} className="border-b last:border-0">
                        <td className="py-2">{item.title}</td>
                        <td className="py-2">
                          <Badge className={gate.color}>{gate.label}</Badge>
                        </td>
                        <td className="py-2">{pct}% ({item.completedCount}/{item.totalCount})</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">아직 방법론이 적용된 아이템이 없어요.</p>
      )}
    </div>
  );
}
