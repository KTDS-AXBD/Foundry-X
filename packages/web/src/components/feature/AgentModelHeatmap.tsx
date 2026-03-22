"use client";

import type { AgentModelCell } from "@foundry-x/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function cellBg(rate: number): string {
  if (rate >= 90) return "bg-green-100 dark:bg-green-900/20";
  if (rate >= 70) return "bg-yellow-100 dark:bg-yellow-900/20";
  return "bg-red-100 dark:bg-red-900/20";
}

export default function AgentModelHeatmap({ matrix }: { matrix: AgentModelCell[] }) {
  if (matrix.length === 0) {
    return <p className="text-sm text-muted-foreground">No agent-model data available.</p>;
  }

  const agents = Array.from(new Set(matrix.map((c) => c.agentName))).sort();
  const models = Array.from(new Set(matrix.map((c) => c.model))).sort();

  const lookup = new Map<string, AgentModelCell>();
  for (const cell of matrix) {
    lookup.set(`${cell.agentName}::${cell.model}`, cell);
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Agent</TableHead>
            {models.map((m) => (
              <TableHead key={m} className="text-center">
                {m}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent}>
              <TableCell className="font-medium">{agent}</TableCell>
              {models.map((model) => {
                const cell = lookup.get(`${agent}::${model}`);
                if (!cell) {
                  return (
                    <TableCell key={model} className="bg-muted text-center text-muted-foreground">
                      —
                    </TableCell>
                  );
                }
                return (
                  <TableCell key={model} className={cn("text-center", cellBg(cell.successRate))}>
                    <div className="font-bold">{cell.executions}</div>
                    <div className="text-xs text-muted-foreground">
                      {cell.successRate.toFixed(0)}%
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
