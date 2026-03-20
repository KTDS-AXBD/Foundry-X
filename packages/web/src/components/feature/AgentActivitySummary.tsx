"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { AgentActivityStats } from "@/lib/api-client";

interface Props {
  last24h: AgentActivityStats;
  last7d: AgentActivityStats;
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function AgentActivitySummary({ last24h, last7d }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-primary">Agent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Last 24 hours</h4>
          <div className="flex justify-around">
            <StatBlock label="Tasks" value={last24h.tasksCompleted} />
            <StatBlock label="PRs" value={last24h.prsCreated} />
            <StatBlock label="Messages" value={last24h.messagesSent} />
          </div>
        </div>
        <div className="border-t pt-3">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">Last 7 days</h4>
          <div className="flex justify-around">
            <StatBlock label="Tasks" value={last7d.tasksCompleted} />
            <StatBlock label="PRs" value={last7d.prsCreated} />
            <StatBlock label="Messages" value={last7d.messagesSent} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
