"use client";

import { Badge } from "@/components/ui/badge";
import type { SrWorkflowNodeClient } from "@/lib/api-client";

interface SrWorkflowDagProps {
  nodes: SrWorkflowNodeClient[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending:  { bg: "bg-muted",       text: "text-muted-foreground", label: "Pending" },
  running:  { bg: "bg-blue-100 dark:bg-blue-900/30",  text: "text-blue-700 dark:text-blue-300", label: "Running" },
  done:     { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Done" },
  failed:   { bg: "bg-red-100 dark:bg-red-900/30",    text: "text-red-700 dark:text-red-300", label: "Failed" },
};

export default function SrWorkflowDag({ nodes }: SrWorkflowDagProps) {
  if (nodes.length === 0) {
    return <p className="text-sm text-muted-foreground">No workflow nodes</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-2" role="list" aria-label="Workflow nodes">
      {nodes.map((node, idx) => {
        const status = node.status ?? "pending";
        const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

        return (
          <div key={node.id} className="flex items-center gap-2" role="listitem">
            {/* Node */}
            <div
              className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-3 min-w-[120px] ${style.bg}`}
              data-testid={`dag-node-${node.id}`}
            >
              <span className={`text-sm font-medium ${style.text}`}>{node.label}</span>
              <Badge
                variant="outline"
                className={`text-xs ${style.text}`}
              >
                {style.label}
              </Badge>
            </div>
            {/* Arrow between nodes */}
            {idx < nodes.length - 1 && (
              <span className="text-muted-foreground text-lg font-bold" aria-hidden="true">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
