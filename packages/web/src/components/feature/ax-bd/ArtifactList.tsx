"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api-client";
import { Link } from "react-router-dom";

interface BdArtifactItem {
  id: string;
  bizItemId: string;
  skillId: string;
  stageId: string;
  version: number;
  outputText: string | null;
  status: string;
  tokensUsed: number;
  durationMs: number;
  createdAt: string;
}

interface ArtifactListResponse {
  items: BdArtifactItem[];
  total: number;
}

interface ArtifactListProps {
  bizItemId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  running: "bg-yellow-100 text-yellow-700",
  pending: "bg-slate-100 text-slate-700",
};

export default function ArtifactList({ bizItemId }: ArtifactListProps) {
  const [artifacts, setArtifacts] = useState<BdArtifactItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const path = bizItemId
      ? `/ax-bd/biz-items/${bizItemId}/artifacts?page=${page}&limit=20`
      : `/ax-bd/artifacts?page=${page}&limit=20`;
    fetchApi<ArtifactListResponse>(path)
      .then((res) => {
        setArtifacts(res.items);
        setTotal(res.total);
      })
      .catch(() => setArtifacts([]))
      .finally(() => setLoading(false));
  }, [bizItemId, page]);

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">로딩 중...</div>;
  }

  if (artifacts.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        산출물이 없어요. 스킬을 실행하면 여기에 결과가 표시돼요.
      </div>
    );
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        총 {total}건 · {page}/{totalPages} 페이지
      </div>
      {artifacts.map((art) => (
        <Link
          key={art.id}
          to={`/ax-bd/artifacts/${art.id}`}
          className="block rounded-lg border p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <code className="text-xs font-medium">{art.skillId}</code>
              <Badge variant="outline" className="font-mono text-[10px]">
                v{art.version}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] ${STATUS_COLORS[art.status] ?? ""}`}
              >
                {art.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              단계 {art.stageId} · {art.tokensUsed.toLocaleString()} 토큰
            </span>
          </div>
          {art.outputText && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {art.outputText.substring(0, 150)}...
            </p>
          )}
          <div className="mt-1 text-[10px] text-muted-foreground">
            {new Date(art.createdAt).toLocaleString("ko-KR")}
          </div>
        </Link>
      ))}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
