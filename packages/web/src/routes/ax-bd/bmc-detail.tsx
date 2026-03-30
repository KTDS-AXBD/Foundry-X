"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { fetchBmcDetail, type BmcDetail } from "@/lib/api-client";

const BLOCK_LABELS: Record<string, string> = {
  customer_segments: "고객 세그먼트",
  value_propositions: "가치 제안",
  channels: "채널",
  customer_relationships: "고객 관계",
  revenue_streams: "수익 구조",
  key_resources: "핵심 자원",
  key_activities: "핵심 활동",
  key_partnerships: "핵심 파트너십",
  cost_structure: "비용 구조",
};

const BLOCK_ORDER = ["key_partnerships", "key_activities", "key_resources", "value_propositions", "customer_relationships", "channels", "customer_segments", "cost_structure", "revenue_streams"];

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [bmc, setBmc] = useState<BmcDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchBmcDetail(id)
      .then(setBmc)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!bmc) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  const blockMap = Object.fromEntries(bmc.blocks.map((b) => [b.blockType, b.content]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/ax-bd/bmc" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-2xl font-bold">{bmc.title}</h1>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {/* Row 1: KP / KA / VP / CR / CS — 2 rows each */}
        <div className="row-span-2 rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.key_partnerships}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.key_partnerships ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.key_activities}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.key_activities ?? "—"}</p>
        </div>
        <div className="row-span-2 rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.value_propositions}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.value_propositions ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.customer_relationships}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.customer_relationships ?? "—"}</p>
        </div>
        <div className="row-span-2 rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.customer_segments}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.customer_segments ?? "—"}</p>
        </div>
        {/* Row 2: KR / CH */}
        <div className="rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.key_resources}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.key_resources ?? "—"}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.channels}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.channels ?? "—"}</p>
        </div>
        {/* Row 3: Cost / Revenue */}
        <div className="col-span-2 rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.cost_structure}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.cost_structure ?? "—"}</p>
        </div>
        <div className="col-span-3 rounded-lg border p-4">
          <h3 className="text-xs font-bold text-muted-foreground mb-2">{BLOCK_LABELS.revenue_streams}</h3>
          <p className="text-sm whitespace-pre-wrap">{blockMap.revenue_streams ?? "—"}</p>
        </div>
      </div>
    </div>
  );
}
