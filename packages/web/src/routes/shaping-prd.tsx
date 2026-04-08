"use client";

/**
 * /shaping/prd — 아이템별 PRD 목록 + 렌더링 뷰
 * 각 biz item에 연결된 PRD를 렌더링하여 표시
 */
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { FileText, ChevronDown, ChevronRight, Search } from "lucide-react";
import { getBizItems, listPrds, type BizItemSummary, type GeneratedPrdEntry } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const VERSION_LABELS: Record<number, string> = { 1: "1차", 2: "2차", 3: "3차" };
const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: "초안", color: "bg-slate-100 text-slate-600" },
  reviewing: { label: "검토중", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "확정", color: "bg-green-100 text-green-700" },
};

/** Markdown → HTML document for iframe srcDoc (isolated rendering, no XSS risk) */
function markdownToHtmlDoc(md: string): string {
  const body = md
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");

  return `<!DOCTYPE html><html><head><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.8; color: #334155; padding: 16px; margin: 0; }
    h1 { font-size: 20px; font-weight: 700; margin: 24px 0 10px; }
    h2 { font-size: 17px; font-weight: 700; margin: 20px 0 8px; }
    h3 { font-size: 15px; font-weight: 700; margin: 16px 0 6px; }
    h4 { font-size: 14px; font-weight: 600; margin: 12px 0 4px; }
    li { margin-left: 16px; list-style: disc; }
    strong { font-weight: 600; }
  </style></head><body>${body}</body></html>`;
}

export function Component() {
  const [items, setItems] = useState<BizItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [prdCache, setPrdCache] = useState<Record<string, { prds: GeneratedPrdEntry[]; loading: boolean }>>({});

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

      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isExpanded = expanded.has(item.id);
            const cache = prdCache[item.id];
            return (
              <div key={item.id} className="rounded-lg border">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm flex-1">{item.title}</span>
                  <Link
                    to={`/discovery/items/${item.id}/prds`}
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    PRD 관리 →
                  </Link>
                </button>

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
                            <div key={prd.id} className="rounded-lg border bg-card">
                              <div className="flex items-center gap-2 px-4 py-2 border-b">
                                <span className="text-sm font-semibold">
                                  {VERSION_LABELS[prd.version] ?? `${prd.version}차`} PRD
                                </span>
                                <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(prd.generated_at * 1000).toLocaleDateString("ko")}
                                </span>
                              </div>
                              <iframe
                                srcDoc={markdownToHtmlDoc(prd.content)}
                                className="w-full border-0"
                                style={{ height: 400 }}
                                sandbox=""
                                title={`PRD v${prd.version}`}
                              />
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
