"use client";

import { useState, useEffect } from "react";
import { Zap, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getKgNode,
  getKgNeighbors,
  type KgNode,
  type KgEdge,
} from "@/lib/api-client";
import { KG_NODE_TYPE_LABELS, NODE_TYPE_COLORS } from "./KgNodeSearch";

interface Neighbor {
  id: string;
  type: string;
  name: string;
  name_en: string | null;
}

interface Props {
  nodeId: string;
  onImpactClick?: () => void;
  onPathClick?: () => void;
}

export default function KgNodeDetail({ nodeId, onImpactClick, onPathClick }: Props) {
  const [node, setNode] = useState<KgNode | null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [edges, setEdges] = useState<KgEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [nodeData, neighborData] = await Promise.all([
          getKgNode(nodeId),
          getKgNeighbors(nodeId),
        ]);
        setNode(nodeData);
        setNeighbors(neighborData.nodes);
        setEdges(neighborData.edges);
      } catch (e) {
        setError(e instanceof Error ? e.message : "노드 정보를 불러올 수 없어요");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [nodeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (error || !node) {
    return (
      <div className="py-12 text-center text-sm text-red-500">
        {error ?? "노드를 찾을 수 없어요"}
      </div>
    );
  }

  // Build a lookup: edgeId -> edge for neighbor table
  const neighborEdgeMap = new Map<string, KgEdge>();
  for (const edge of edges) {
    const neighborId =
      edge.sourceNodeId === nodeId ? edge.targetNodeId : edge.sourceNodeId;
    neighborEdgeMap.set(neighborId, edge);
  }

  return (
    <div className="space-y-4">
      {/* Node info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{node.name}</CardTitle>
            <Badge
              variant="secondary"
              className={`text-xs ${NODE_TYPE_COLORS[node.type] ?? ""}`}
            >
              {KG_NODE_TYPE_LABELS[node.type] ?? node.type}
            </Badge>
          </div>
          {node.nameEn && (
            <p className="text-sm text-muted-foreground">{node.nameEn}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {node.description && (
            <p className="text-sm">{node.description}</p>
          )}

          {node.metadata && Object.keys(node.metadata).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                메타데이터
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                {JSON.stringify(node.metadata, null, 2)}
              </pre>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={onImpactClick}>
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              영향 분석
            </Button>
            <Button size="sm" variant="outline" onClick={onPathClick}>
              <Route className="mr-1.5 h-3.5 w-3.5" />
              경로 탐색
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Neighbors table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            이웃 노드 ({neighbors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {neighbors.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              연결된 노드가 없어요
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>관계</TableHead>
                  <TableHead className="text-right">가중치</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {neighbors.map((n) => {
                  const edge = neighborEdgeMap.get(n.id);
                  return (
                    <TableRow key={n.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{n.name}</span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${NODE_TYPE_COLORS[n.type] ?? ""}`}
                          >
                            {KG_NODE_TYPE_LABELS[n.type] ?? n.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {edge?.relationType ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {edge?.weight?.toFixed(2) ?? "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
