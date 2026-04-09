"use client";

/**
 * /shaping/prd — 아이템별 PRD 목록 + 렌더링 뷰
 * 각 biz item에 연결된 PRD를 렌더링하여 표시
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, ChevronRight, Search, Maximize2 } from "lucide-react";
import { getBizItems, listPrds, type BizItemSummary, type GeneratedPrdEntry } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MarkdownViewer from "@/components/feature/MarkdownViewer";
import { PrdDetailView } from "@/components/prd/PrdDetailView";

/** PRD content 앞에 붙는 YAML frontmatter(`---\n...\n---`) 블록 제거 */
function stripFrontmatter(md: string): string {
  return md.replace(/^\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

const VERSION_LABELS: Record<number, string> = { 1: "1차", 2: "2차", 3: "3차" };
const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "초안", color: "bg-slate-100 text-slate-600" },
  reviewing: { label: "검토중", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "확정", color: "bg-green-100 text-green-700" },
};

export function Component() {
  const [items, setItems] = useState<BizItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [prdCache, setPrdCache] = useState<Record<string, { prds: GeneratedPrdEntry[]; loading: boolean }>>({});
  const [detailPrd, setDetailPrd] = useState<GeneratedPrdEntry | null>(null);

  useEffect(() => {
    getBizItems()
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(itemId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
        if (!prdCache[itemId]) {
          setPrdCache((c) => ({ ...c, [itemId]: { prds: [], loading: true } }));
          listPrds(itemId)
            .then((res) => setPrdCache((c) => ({ ...c, [itemId]: { prds: res.prds, loading: false } })))
            .catch(() => setPrdCache((c) => ({ ...c, [itemId]: { prds: [], loading: false } })));
        }
      }
      return next;
    });
  }

  const filtered = items.filter(
    (item) =>
      !query ||
      item.title.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">PRD 관리</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          각 사업 아이템별 PRD를 확인하고 관리해요.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="아이템 검색..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {loading && <div className="text-sm text-muted-foreground py-8 text-center">로딩 중...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {items.length === 0 ? "등록된 아이템이 없어요." : "검색 결과가 없어요."}
        </div>
      )}

      {detailPrd && (
        <PrdDetailView
          prd={detailPrd}
          onClose={() => setDetailPrd(null)}
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isExpanded = expanded.has(item.id);
            const cache = prdCache[item.id];
            return (
              <div key={item.id} className="rounded-lg border">
                <div className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {isExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-medium text-sm flex-1">{item.title}</span>
                  </button>
                  <Link
                    to={`/discovery/items/${item.id}/prds`}
                    className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                    data-testid={`prd-manage-link-${item.id}`}
                  >
                    PRD 관리 →
                  </Link>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    {cache?.loading && (
                      <p className="text-sm text-muted-foreground py-3">PRD 로딩 중...</p>
                    )}
                    {cache && !cache.loading && cache.prds.length === 0 && (
                      <p className="text-sm text-muted-foreground py-3">아직 PRD가 없어요.</p>
                    )}
                    {cache && !cache.loading && cache.prds.length > 0 && (
                      <div className="space-y-4 pt-3">
                        {cache.prds.map((prd) => {
                          const status = STATUS_BADGE[prd.status] ?? { label: prd.status, color: "bg-slate-100 text-slate-600" };
                          return (
                            <div key={prd.id} className="rounded-lg border bg-card" data-testid={`prd-card-${prd.id}`}>
                              <div className="flex items-center gap-2 px-4 py-2 border-b">
                                <span className="text-sm font-semibold">
                                  {VERSION_LABELS[prd.version] ?? `${prd.version}차`} PRD
                                </span>
                                <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(prd.generated_at * 1000).toLocaleDateString("ko")}
                                </span>
                                <button
                                  onClick={() => setDetailPrd(prd)}
                                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-primary hover:bg-muted/50 transition-colors"
                                  data-testid={`prd-open-detail-${prd.id}`}
                                >
                                  <Maximize2 className="size-3" />
                                  상세 보기
                                </button>
                              </div>
                              <div
                                className="max-h-[480px] overflow-y-auto px-5 py-4"
                                data-testid={`prd-content-${prd.id}`}
                              >
                                <MarkdownViewer content={stripFrontmatter(prd.content)} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
