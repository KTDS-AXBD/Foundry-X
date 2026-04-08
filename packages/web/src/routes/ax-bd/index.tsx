"use client";

/**
 * /shaping/business-plan — 사업기획서 목록 페이지
 * 전체 biz_items을 표시하고, 각 아이템의 사업기획서 HTML 버전을 바로 열 수 있도록 함
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, FileText, ExternalLink, Eye } from "lucide-react";
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

function openBusinessPlanHtml(bizItemId: string) {
  exportBusinessPlanHtml(bizItemId)
    .then((html) => {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    })
    .catch((err) => {
      alert("사업기획서를 불러올 수 없어요. 기획서가 생성되었는지 확인해주세요.\n" + (err instanceof Error ? err.message : ""));
    });
}

export function Component() {
  const [items, setItems] = useState<BizItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getBizItems()
      .then((res) => setItems(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"))
      .finally(() => setLoading(false));
  }, []);

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
          각 사업 아이템의 기획서를 확인하고 HTML 버전으로 바로 볼 수 있어요.
        </p>
      </div>

      {/* 검색 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="아이템 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
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
            return (
              <div key={item.id} className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                <FileText className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/discovery/items/${item.id}`}
                      className="font-medium text-sm hover:text-primary truncate"
                    >
                      {item.title}
                    </Link>
                    <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openBusinessPlanHtml(item.id)}
                    title="사업기획서 HTML 보기"
                  >
                    <Eye className="size-4 mr-1" />
                    HTML 보기
                  </Button>
                  <Link to={`/discovery/items/${item.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="size-4 mr-1" />
                      상세
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
