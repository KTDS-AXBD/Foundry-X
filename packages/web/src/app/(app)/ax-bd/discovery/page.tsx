"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ProcessFlowV82 from "@/components/feature/ProcessFlowV82";
import TypeRoutingMatrix from "@/components/feature/TypeRoutingMatrix";
import { fetchApi, type BizItemSummary, type TrafficLightResponse } from "@/lib/api-client";

const TYPE_COLORS: Record<string, string> = {
  I: "bg-blue-100 text-blue-700 border-blue-200",
  M: "bg-emerald-100 text-emerald-700 border-emerald-200",
  P: "bg-amber-100 text-amber-700 border-amber-200",
  T: "bg-purple-100 text-purple-700 border-purple-200",
  S: "bg-rose-100 text-rose-700 border-rose-200",
};

const SIGNAL_DOTS: Record<string, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
};

interface ItemWithSignal extends BizItemSummary {
  signal?: TrafficLightResponse;
}

export default function DiscoveryProcessPage() {
  const [items, setItems] = useState<ItemWithSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | undefined>();

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi<{ items: BizItemSummary[] }>("/biz-items");
        const withSignal = await Promise.all(
          (data.items ?? []).map(async (item) => {
            try {
              const signal = await fetchApi<TrafficLightResponse>(
                `/ax-bd/viability/traffic-light/${item.id}`,
              );
              return { ...item, signal };
            } catch {
              return item;
            }
          }),
        );
        setItems(withSignal);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredItems = selectedType
    ? items.filter((i) => i.discoveryType === selectedType)
    : items;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Discovery 프로세스 v8.2</h1>
        <p className="text-sm text-muted-foreground">
          AX BD 2단계 발굴 — 5유형(I/M/P/T/S) 강도 라우팅 + 사업성 체크포인트
        </p>
      </div>

      {/* Process Flow */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-bold">전체 프로세스 흐름</h2>
        <ProcessFlowV82 />
      </div>

      {/* Type Routing Matrix */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-bold">유형별 강도 매트릭스</h2>
        <TypeRoutingMatrix selectedType={selectedType as "I" | "M" | "P" | "T" | "S" | undefined} />
      </div>

      {/* Items List */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold">사업 아이템 현황</h2>
          <div className="flex gap-1">
            <Badge
              variant={selectedType === undefined ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setSelectedType(undefined)}
            >
              전체
            </Badge>
            {["I", "M", "P", "T", "S"].map((t) => (
              <Badge
                key={t}
                variant={selectedType === t ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedType(selectedType === t ? undefined : t)}
              >
                {t}
              </Badge>
            ))}
          </div>
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-muted-foreground">로딩 중...</div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            등록된 사업 아이템이 없어요.
          </div>
        )}

        <div className="space-y-2">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/ax-bd/discovery/${item.id}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              {/* Signal Dot */}
              <div
                className={cn(
                  "h-3 w-3 shrink-0 rounded-full",
                  item.signal ? SIGNAL_DOTS[item.signal.overallSignal] : "bg-slate-300",
                )}
              />

              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.title}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                )}
              </div>

              {/* Type Badge */}
              {item.discoveryType && (
                <Badge
                  className={cn("shrink-0 text-[10px]", TYPE_COLORS[item.discoveryType])}
                >
                  Type {item.discoveryType}
                </Badge>
              )}

              {/* Progress */}
              {item.signal && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.signal.summary.go + item.signal.summary.pivot + item.signal.summary.drop}/7
                </span>
              )}

              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
