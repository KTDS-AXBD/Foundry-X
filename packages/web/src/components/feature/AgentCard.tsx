"use client";

import type { AgentProfile, AgentStatus } from "@foundry-x/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusVariant = (s: AgentStatus) => {
  switch (s) {
    case "idle":
    case "completed":
      return "secondary" as const;
    case "running":
    case "waiting":
      return "default" as const;
    case "error":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const tierVariant = (tier: "always" | "ask" | "never") => {
  switch (tier) {
    case "always":
      return "secondary" as const;
    case "ask":
      return "outline" as const;
    case "never":
      return "destructive" as const;
  }
};

type AgentTaskStatus = "pending" | "running" | "completed" | "failed";

export interface AgentCardProps {
  agent: AgentProfile;
  taskStatus?: AgentTaskStatus;
}

export default function AgentCard({ agent, taskStatus }: AgentCardProps) {
  const status = taskStatus === "running" ? "running"
    : taskStatus === "failed" ? "error"
    : agent.activity?.status ?? "idle";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{agent.name}</CardTitle>
        <div className="flex items-center gap-2">
          {taskStatus === "running" && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          <Badge variant={statusVariant(status)}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Capabilities */}
        {agent.capabilities.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Capabilities
            </div>
            <div className="flex flex-col gap-1.5">
              {agent.capabilities.map((cap, i) => (
                <div
                  key={i}
                  className="rounded-md bg-muted p-2 text-sm"
                >
                  <div className="mb-1 flex gap-2">
                    <span className="font-semibold text-primary">
                      {cap.action}
                    </span>
                    <span className="text-muted-foreground">
                      -&gt; {cap.scope}
                    </span>
                  </div>
                  {cap.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {cap.tools.map((tool) => (
                        <span
                          key={tool}
                          className="rounded bg-border px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Constraints */}
        {agent.constraints.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Constraints
            </div>
            <div className="flex flex-col gap-1">
              {agent.constraints.map((c, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 border-b border-border py-1.5 text-sm last:border-0"
                >
                  <Badge variant={tierVariant(c.tier)}>{c.tier}</Badge>
                  <div>
                    <div className="text-foreground">{c.rule}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity */}
        {agent.activity && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Activity
            </div>
            <div className="space-y-1.5 text-sm">
              {agent.activity.currentTask && (
                <div>
                  <span className="text-muted-foreground">Task: </span>
                  <span className="text-foreground">
                    {agent.activity.currentTask}
                  </span>
                </div>
              )}
              {agent.activity.progress != null && (
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground">
                      {agent.activity.progress}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary transition-all",
                      )}
                      style={{ width: `${agent.activity.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {agent.activity.tokenUsed != null && (
                <div>
                  <span className="text-muted-foreground">Tokens: </span>
                  <span className="text-foreground">
                    {agent.activity.tokenUsed.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
