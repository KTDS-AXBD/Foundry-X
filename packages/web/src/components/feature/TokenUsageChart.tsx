"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

export interface TokenUsageChartProps {
  title: string;
  data: Record<string, { tokens: number; cost: number }>;
}

export default function TokenUsageChart({ title, data }: TokenUsageChartProps) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b.cost - a.cost);

  if (entries.length === 0) {
    return (
      <div>
        <h2 className="mb-4 text-base font-semibold text-primary">{title}</h2>
        <p className="text-sm text-muted-foreground">No data available.</p>
      </div>
    );
  }

  const totalCost = entries.reduce((sum, [, v]) => sum + v.cost, 0);

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold text-primary">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Tokens</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Share</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([name, val]) => {
            const share = totalCost > 0 ? (val.cost / totalCost) * 100 : 0;
            return (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatTokens(val.tokens)}
                </TableCell>
                <TableCell className="text-right">{formatCost(val.cost)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-15 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="min-w-[36px] text-xs text-muted-foreground">
                      {share.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
