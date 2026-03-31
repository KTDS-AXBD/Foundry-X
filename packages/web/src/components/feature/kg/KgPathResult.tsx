"use client";

import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PathResult } from "@/lib/api-client";
import { KG_NODE_TYPE_LABELS, NODE_TYPE_COLORS } from "./KgNodeSearch";

interface Props {
  paths: PathResult[];
}

export default function KgPathResult({ paths }: Props) {
  if (paths.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        경로를 찾을 수 없어요
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {paths.length}개 경로 발견
      </p>

      {paths.map((path, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-sm">
              <span>경로 {idx + 1}</span>
              <Badge variant="outline" className="text-[10px]">
                {path.hopCount} hop
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                총 가중치 {path.totalWeight.toFixed(2)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-1">
              {path.path.map((node, nodeIdx) => {
                const edge = path.edges[nodeIdx];
                return (
                  <span key={node.id} className="flex items-center gap-1">
                    {/* Node */}
                    <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
                      <span className="text-sm font-medium">{node.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] ${NODE_TYPE_COLORS[node.type] ?? ""}`}
                      >
                        {KG_NODE_TYPE_LABELS[node.type] ?? node.type}
                      </Badge>
                    </span>

                    {/* Edge arrow (not after last node) */}
                    {edge && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <span className="text-[10px]">
                          {edge.relationType}
                          {edge.weight != null && (
                            <span className="ml-0.5 opacity-60">
                              ({edge.weight.toFixed(1)})
                            </span>
                          )}
                        </span>
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
