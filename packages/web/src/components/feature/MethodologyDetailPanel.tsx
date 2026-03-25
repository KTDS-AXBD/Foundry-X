"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getMethodologyDetail, type MethodologyDetail } from "@/lib/api-client";

interface MethodologyDetailPanelProps {
  methodologyId: string;
}

export default function MethodologyDetailPanel({ methodologyId }: MethodologyDetailPanelProps) {
  const [detail, setDetail] = useState<MethodologyDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMethodologyDetail(methodologyId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [methodologyId]);

  if (loading) return <div className="animate-pulse h-48 rounded-lg bg-muted" />;
  if (!detail) return <p className="text-muted-foreground">방법론을 찾을 수 없어요.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{detail.name} v{detail.version}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{detail.description}</p>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">검증 기준 ({detail.criteria.length}개)</h4>
        <div className="space-y-2">
          {detail.criteria.map(c => (
            <div key={c.id} className="rounded border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{c.id}</span>
                <span className="text-sm font-medium">{c.name}</span>
                {c.isRequired && <Badge variant="destructive" className="text-[10px]">필수</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.condition}</p>
              {c.skills.length > 0 && (
                <div className="mt-1 flex gap-1">
                  {c.skills.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {detail.reviewMethods.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">검토 방법</h4>
          {detail.reviewMethods.map(rm => (
            <div key={rm.id} className="rounded border border-border p-3">
              <span className="text-sm font-medium">{rm.name}</span>
              <p className="text-xs text-muted-foreground">{rm.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
