"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchSrDetail, type SrDetailItem } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<SrDetailItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchSrDetail(id)
      .then(setItem)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!item) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/collection/sr" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        <Badge variant="outline">{item.sr_type}</Badge>
        <Badge>{item.status}</Badge>
        <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>{item.priority}</Badge>
      </div>
      {item.description && <p className="text-muted-foreground max-w-2xl">{item.description}</p>}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className="text-2xl font-bold">{item.confidence}%</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Keywords</div>
          <div className="flex flex-wrap gap-1 mt-1">{(item.matched_keywords ?? []).map((k) => <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Created</div>
          <div className="text-sm">{new Date(item.created_at).toLocaleDateString("ko")}</div>
        </div>
      </div>
    </div>
  );
}
