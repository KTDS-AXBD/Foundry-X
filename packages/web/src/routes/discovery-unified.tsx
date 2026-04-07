"use client";

/**
 * F436 — 내 아이템 목록 페이지 (재구축)
 * 기존: 3탭(대시보드/프로세스/BMC)
 * 변경: 아이템 카드 목록 + 상태 필터 + 빈 상태 UI
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { getBizItems, type BizItemSummary } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import BizItemCard from "@/components/feature/discovery/BizItemCard";

type StatusFilter = "all" | "draft" | "analyzing" | "analyzed" | "shaping" | "completed";

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "전체",
  draft: "대기",
  analyzing: "분석 중",
  analyzed: "분석 완료",
  shaping: "형상화 중",
  completed: "완료",
};

function filterItems(items: BizItemSummary[], filter: StatusFilter, query: string): BizItemSummary[] {
  return items.filter((item) => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });
}

export function Component() {
  const [items, setItems] = useState<BizItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getBizItems()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "아이템 목록을 불러올 수 없어요."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filterItems(items, filter, query);

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">내 아이템</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            사업 아이템을 등록하고 발굴 분석을 진행해요.
          </p>
        </div>
        <Link
          to="/getting-started"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" /> 새 아이템
        </Link>
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="아이템 검색..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary",
              ].join(" ")}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {loading && (
        <div className="text-center py-12 text-muted-foreground text-sm">로딩 중...</div>
      )}

      {error && (
        <div className="text-center py-12 text-destructive text-sm">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState hasItems={items.length > 0} filter={filter} query={query} />
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <BizItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  hasItems: boolean;
  filter: StatusFilter;
  query: string;
}

function EmptyState({ hasItems, filter, query }: EmptyStateProps) {
  if (hasItems && (filter !== "all" || query)) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">해당 조건의 아이템이 없어요.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-16 space-y-4">
      <div className="text-4xl">💡</div>
      <div>
        <p className="font-semibold">아직 등록된 아이템이 없어요.</p>
        <p className="text-sm text-muted-foreground mt-1">
          사업 아이디어를 입력하면 AI가 발굴 분석을 도와드려요.
        </p>
      </div>
      <Link
        to="/getting-started"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="size-4" /> 첫 아이템 등록하기
      </Link>
    </div>
  );
}
