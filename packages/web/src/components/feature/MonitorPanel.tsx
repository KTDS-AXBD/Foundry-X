"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MonitoringStats } from "@/lib/api-client";

function StatCard({ label, value, unit, status }: { label: string; value: string | number; unit?: string; status?: "ok" | "warn" | "error" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold", {
            "text-green-500": status === "ok",
            "text-yellow-500": status === "warn",
            "text-red-500": status === "error",
          })}>
            {value}
          </span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function MonitorPanel({ stats }: { stats: MonitoringStats }) {
  const errorStatus = stats.errorRate < 1 ? "ok" : stats.errorRate < 5 ? "warn" : "error";
  const latencyStatus = stats.avgResponseMs < 200 ? "ok" : stats.avgResponseMs < 500 ? "warn" : "error";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Requests" value={stats.requests.toLocaleString()} status="ok" />
      <StatCard label="Error Rate" value={stats.errorRate.toFixed(1)} unit="%" status={errorStatus} />
      <StatCard label="Avg Response" value={Math.round(stats.avgResponseMs)} unit="ms" status={latencyStatus} />
      <StatCard label="Uptime" value={stats.uptime.toFixed(2)} unit="%" status={stats.uptime >= 99.9 ? "ok" : "warn"} />
    </div>
  );
}
