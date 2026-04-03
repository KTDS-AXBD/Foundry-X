"use client";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProcessProgressCard from "@/components/feature/ProcessProgressCard";
import PortfolioSummaryWidget from "@/components/feature/PortfolioSummary";
import {
  getPortfolioProgress,
  type ProcessProgress,
  type PortfolioSummary,
} from "@/lib/api-client";

type SignalFilter = "all" | "green" | "yellow" | "red";

export function Component() {
  const [items, setItems] = useState<ProcessProgress[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const params = signalFilter !== "all" ? { signal: signalFilter } : undefined;
        const data = await getPortfolioProgress(params);
        setItems(data.items);
        setSummary(data.summary);
      } catch (e) {
        setError(e instanceof Error ? e.message : "데이터를 불러올 수 없어요");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [signalFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/discovery/items" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">프로세스 진행 추적</h1>
          <p className="text-sm text-muted-foreground">
            BD 아이템별 진행 단계 + 사업성 신호등 통합 대시보드
          </p>
        </div>
      </div>

      {/* Portfolio Summary */}
      {summary && <PortfolioSummaryWidget summary={summary} />}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">신호등:</span>
        {(["all", "green", "yellow", "red"] as const).map((f) => (
          <Badge
            key={f}
            variant={signalFilter === f ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSignalFilter(f)}
          >
            {f === "all" ? "전체" : f.charAt(0).toUpperCase() + f.slice(1)}
          </Badge>
        ))}
      </div>

      {/* Items */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">불러오는 중...</div>
      )}

      {error && (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {signalFilter === "all"
            ? "파이프라인에 등록된 아이템이 없어요"
            : `${signalFilter} 신호등인 아이템이 없어요`}
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <Link key={item.bizItemId} to={`/ax-bd/discovery/${item.bizItemId}`}>
            <ProcessProgressCard progress={item} />
          </Link>
        ))}
      </div>
    </div>
  );
}
