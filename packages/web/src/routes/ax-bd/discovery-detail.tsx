"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchBizItemDetail, type BizItemDetail } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = { I: "아이디어형", M: "시장·타겟형", P: "고객문제형", T: "기술형", S: "서비스형" };

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<BizItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBizItemDetail(id)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!item) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/discovery/items" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        {item.discoveryType && <Badge variant="outline">Type {item.discoveryType} — {TYPE_LABELS[item.discoveryType] ?? ""}</Badge>}
        <Badge>{item.status}</Badge>
      </div>
      {item.description && <p className="text-muted-foreground max-w-3xl whitespace-pre-wrap">{item.description}</p>}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Source</div>
          <div className="text-sm font-medium">{item.source}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Created</div>
          <div className="text-sm">{new Date(item.createdAt).toLocaleDateString("ko")}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">ID</div>
          <div className="text-xs font-mono text-muted-foreground">{item.id}</div>
        </div>
      </div>
    </div>
  );
}
