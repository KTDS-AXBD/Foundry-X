"use client";

/**
 * /shaping/business-plan — 사업기획서 목록 + HTML 미리보기
 * 카드 클릭 시 iframe으로 HTML 표시 + 새 창 열기 지원
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, FileText, ExternalLink, Eye, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { getBizItems, exportBusinessPlanHtml, type BizItemSummary } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "대기", color: "bg-slate-100 text-slate-600" },
  analyzing: { label: "분석 중", color: "bg-blue-100 text-blue-700" },
  analyzed: { label: "분석 완료", color: "bg-green-100 text-green-700" },
  shaping: { label: "형상화 중", color: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", color: "bg-emerald-100 text-emerald-700" },
};

export function Component() {
  const [items, setItems] = useState<BizItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [htmlCache, setHtmlCache] = useState<Record<string, { html: string; loading: boolean; error?: string }>>({});

  useEffect(() => {
    getBizItems()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

  const loadHtml = useCallback((bizItemId: string) => {
    if (htmlCache[bizItemId]?.html || htmlCache[bizItemId]?.loading) return;
    setHtmlCache((c) => ({ ...c, [bizItemId]: { html: "", loading: true } }));
    exportBusinessPlanHtml(bizItemId)
      .then((html) => setHtmlCache((c) => ({ ...c, [bizItemId]: { html, loading: false } })))
      .catch(() => setHtmlCache((c) => ({ ...c, [bizItemId]: { html: "", loading: false, error: "기획서를 불러올 수 없어요" } })));
  }, [htmlCache]);

  function toggleExpand(bizItemId: string) {
    if (expanded === bizItemId) {
      setExpanded(null);
    } else {
      setExpanded(bizItemId);
      loadHtml(bizItemId);
    }
  }

  function openInNewWindow(bizItemId: string) {
    const cached = htmlCache[bizItemId];
    if (cached?.html) {
      const blob = new Blob([cached.html], { type: "text/html;charset=utf-8" });
      window.open(URL.createObjectURL(blob), "_blank");
      return;
    }
    exportBusinessPlanHtml(bizItemId)
      .then((html) => {
        setHtmlCache((c) => ({ ...c, [bizItemId]: { html, loading: false } }));
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        window.open(URL.createObjectURL(blob), "_blank");
      })
      .catch(() => alert("사업기획서를 불러올 수 없어요"));
  }

  const filtered = items.filter(
    (item) =>
      !query ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.description ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">사업기획서</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          각 사업 아이템의 기획서를 확인하고 HTML로 미리 볼 수 있어요.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="아이템 검색..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>

      {loading && <div className="text-sm text-muted-foreground py-8 text-center">로딩 중...</div>}
      {error && <div className="text-sm text-destructive py-8 text-center">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {items.length === 0 ? "등록된 아이템이 없어요." : "검색 결과가 없어요."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, color: "bg-slate-100 text-slate-600" };
            const isExpanded = expanded === item.id;
            const cache = htmlCache[item.id];

            return (
              <div key={item.id} className="rounded-lg border">
                <div
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left cursor-pointer"
                  role="button"
                  data-testid={`bp-card-${item.id}`}
                >
                  {isExpanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                  <FileText className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{item.title}</span>
                      <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInNewWindow(item.id)}
                      title="새 창에서 열기"
                      data-testid={`bp-new-window-${item.id}`}
                    >
                      <ExternalLink className="size-4 mr-1" />
                      새 창
                    </Button>
                    <Link to={`/discovery/items/${item.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="size-4 mr-1" />
                        상세
                      </Button>
                    </Link>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t">
                    {cache?.loading && (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="size-5 animate-spin mr-2" />
                        기획서 로딩 중...
                      </div>
                    )}
                    {cache?.error && (
                      <div className="py-8 text-center text-sm text-muted-foreground">{cache.error}</div>
                    )}
                    {cache?.html && (
                      <iframe
                        srcDoc={cache.html}
                        className="w-full border-0"
                        style={{ height: 500 }}
                        sandbox="allow-same-origin"
                        title={`사업기획서: ${item.title}`}
                        data-testid={`bp-iframe-${item.id}`}
                      />
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
