"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchBdpLatest, type BdpVersion } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

export function Component() {
  const { bizItemId } = useParams<{ bizItemId: string }>();
  const [bdp, setBdp] = useState<BdpVersion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bizItemId) return;
    fetchBdpLatest(bizItemId)
      .then(setBdp)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [bizItemId]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!bdp) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/shaping/proposal" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-2xl font-bold">사업제안서</h1>
        <Badge variant="outline">v{bdp.versionNum}</Badge>
        {bdp.isFinal && <Badge>최종본</Badge>}
      </div>
      <div className="rounded-lg border p-6 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
        {bdp.content}
      </div>
      <div className="text-xs text-muted-foreground">
        Biz Item: {bdp.bizItemId} &middot; 생성: {new Date(bdp.createdAt).toLocaleDateString("ko")}
      </div>
    </div>
  );
}
