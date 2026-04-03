"use client";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, Monitor, BookOpen, DollarSign } from "lucide-react";
import { fetchOfferingPackDetail, type OfferingPackDetail } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

const TYPE_ICONS: Record<string, typeof FileText> = {
  proposal: FileText,
  tech_review: BookOpen,
  demo_link: Monitor,
  pricing: DollarSign,
  bmc: BookOpen,
  custom: FileText,
};

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<OfferingPackDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchOfferingPackDetail(id)
      .then(setPack)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!pack) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/shaping/offering" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <h1 className="text-2xl font-bold">{pack.title}</h1>
        <Badge>{pack.status}</Badge>
      </div>
      {pack.description && <p className="text-muted-foreground max-w-2xl">{pack.description}</p>}

      <div>
        <h2 className="text-lg font-semibold mb-4">패키지 항목 ({pack.items.length}개)</h2>
        <div className="space-y-3">
          {pack.items.sort((a, b) => a.sortOrder - b.sortOrder).map((item) => {
            const Icon = TYPE_ICONS[item.itemType] ?? FileText;
            return (
              <div key={item.id} className="flex items-start gap-4 rounded-lg border p-4">
                <Icon className="size-5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    <Badge variant="outline" className="text-xs">{item.itemType}</Badge>
                  </div>
                  {item.content && <p className="text-sm text-muted-foreground mt-1">{item.content}</p>}
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline shrink-0 flex items-center gap-1 text-sm">
                    열기 <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Biz Item: {pack.bizItemId} &middot; 생성: {new Date(pack.createdAt).toLocaleDateString("ko")}
      </div>
    </div>
  );
}
