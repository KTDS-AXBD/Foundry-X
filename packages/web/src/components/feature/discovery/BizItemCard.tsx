"use client";

/**
 * F436 — 아이템 카드 컴포넌트
 * discovery-unified.tsx(내 아이템 목록)에서 각 biz_item을 카드로 표시
 */
import { Link } from "react-router-dom";
import { Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { BizItemSummary } from "@/lib/api-client";

const TYPE_LABELS: Record<string, string> = {
  I: "아이디어형",
  M: "시장·타겟형",
  P: "고객문제형",
  T: "기술형",
  S: "서비스형",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "대기", variant: "outline" },
  classifying: { label: "분류 중", variant: "default" },
  classified: { label: "분류 완료", variant: "secondary" },
  analyzing: { label: "분석 중", variant: "default" },
  analyzed: { label: "분석 완료", variant: "secondary" },
  evaluating: { label: "평가 중", variant: "default" },
  evaluated: { label: "평가 완료", variant: "secondary" },
  shaping: { label: "형상화 중", variant: "default" },
  completed: { label: "완료", variant: "secondary" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
}

interface BizItemCardProps {
  item: BizItemSummary;
}

export default function BizItemCard({ item }: BizItemCardProps) {
  const statusCfg = getStatusConfig(item.status);
  const typeLabel = item.discoveryType ? TYPE_LABELS[item.discoveryType] : null;
  const createdDate = new Date(item.createdAt).toLocaleDateString("ko", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link to={`/discovery/items/${item.id}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary">
              {item.title}
            </h3>
            <Badge variant={statusCfg.variant} className="shrink-0 text-xs">
              {statusCfg.label}
            </Badge>
          </div>

          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            {typeLabel ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="size-3" />
                <span>{item.discoveryType} — {typeLabel}</span>
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{createdDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
