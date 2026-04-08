/**
 * P4: 사업기획서 목록 페이지 — /shaping/business-plan
 * 전체 사업기획서를 아이템별로 표시, 클릭 시 상세 페이지로 이동
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fetchApi } from "@/lib/api-client";

interface BpListItem {
  id: string;
  bizItemId: string;
  bizItemTitle: string;
  versionNum: number;
  isFinal: boolean;
  createdAt: string;
  source: string;
}

export function Component() {
  const [items, setItems] = useState<BpListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<{ items: BpListItem[] }>("/bdp")
      .then((data) => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold font-display">사업기획서</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          등록된 사업 아이디어별 기획서를 확인하고 관리해요.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            등록된 사업기획서가 없어요. 아이템 상세 → 형상화 탭에서 생성할 수 있어요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((bp) => (
            <Link
              key={bp.id}
              to={`/discovery/items/${bp.bizItemId}`}
              className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <FileText className="size-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{bp.bizItemTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(bp.createdAt).toLocaleDateString("ko", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline">v{bp.versionNum}</Badge>
                {bp.isFinal && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">최종</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
