"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ImpactResult } from "@/lib/api-client";
import { KG_NODE_TYPE_LABELS, NODE_TYPE_COLORS } from "./KgNodeSearch";

const LEVEL_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  MEDIUM: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  LOW: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const LEVEL_LABELS: Record<string, string> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

interface Props {
  result: ImpactResult | null;
  loading?: boolean;
}

export default function KgImpactResult({ result, loading }: Props) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        영향 분석 중...
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const sorted = [...result.affectedNodes].sort(
    (a, b) => b.impactScore - a.impactScore,
  );

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
        <span className="text-sm font-medium">
          영향 노드: {result.totalAffected}개
        </span>
        <Badge className={LEVEL_COLORS.HIGH}>
          HIGH {result.byLevel.high}
        </Badge>
        <Badge className={LEVEL_COLORS.MEDIUM}>
          MEDIUM {result.byLevel.medium}
        </Badge>
        <Badge className={LEVEL_COLORS.LOW}>
          LOW {result.byLevel.low}
        </Badge>
      </div>

      {/* Affected nodes list */}
      <div className="space-y-2">
        {sorted.map((node) => (
          <Card key={node.id}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{node.name}</span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${NODE_TYPE_COLORS[node.type] ?? ""}`}
                  >
                    {KG_NODE_TYPE_LABELS[node.type] ?? node.type}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  점수: {node.impactScore.toFixed(3)} / {node.hopCount} hop
                </p>
              </div>
              <Badge className={`text-xs ${LEVEL_COLORS[node.impactLevel] ?? ""}`}>
                {LEVEL_LABELS[node.impactLevel] ?? node.impactLevel}
              </Badge>
            </CardContent>
          </Card>
        ))}

        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            영향을 받는 노드가 없어요
          </p>
        )}
      </div>
    </div>
  );
}
