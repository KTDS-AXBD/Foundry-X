"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getKgNodes, type KgNode } from "@/lib/api-client";

const KG_NODE_TYPES = [
  "PRODUCT",
  "INDUSTRY",
  "COUNTRY",
  "COMPANY",
  "TECHNOLOGY",
  "RESEARCH",
  "EVENT",
  "ALERT",
] as const;

const KG_NODE_TYPE_LABELS: Record<string, string> = {
  PRODUCT: "제품/서비스",
  INDUSTRY: "산업",
  COUNTRY: "국가/지역",
  COMPANY: "기업",
  TECHNOLOGY: "기술",
  RESEARCH: "연구/논문",
  EVENT: "이벤트",
  ALERT: "알림/신호",
};

const NODE_TYPE_COLORS: Record<string, string> = {
  PRODUCT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  INDUSTRY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  COUNTRY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  COMPANY: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  TECHNOLOGY: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  RESEARCH: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  EVENT: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  ALERT: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export { KG_NODE_TYPE_LABELS, NODE_TYPE_COLORS };

interface Props {
  onNodeSelect?: (nodeId: string) => void;
}

export default function KgNodeSearch({ onNodeSelect }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [results, setResults] = useState<KgNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const search = useCallback(async () => {
    try {
      setLoading(true);
      const params: { q?: string; type?: string; limit?: number } = { limit: 30 };
      if (query.trim()) params.q = query.trim();
      if (typeFilter) params.type = typeFilter;
      const data = await getKgNodes(params);
      setResults(data.items);
      setTotal(data.total);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="노드 이름 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type filter */}
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="">전체 유형</option>
        {KG_NODE_TYPES.map((t) => (
          <option key={t} value={t}>
            {KG_NODE_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
        {loading ? "검색 중..." : `${total}개 노드`}
      </p>

      {/* Results */}
      <div className="max-h-[60vh] space-y-2 overflow-y-auto">
        {results.map((node) => (
          <Card
            key={node.id}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => onNodeSelect?.(node.id)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{node.name}</span>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${NODE_TYPE_COLORS[node.type] ?? ""}`}
                >
                  {KG_NODE_TYPE_LABELS[node.type] ?? node.type}
                </Badge>
              </div>
              {node.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {node.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}

        {!loading && results.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            검색 결과가 없어요
          </p>
        )}
      </div>
    </div>
  );
}
