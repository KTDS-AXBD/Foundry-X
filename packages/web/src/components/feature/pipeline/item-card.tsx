"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STAGE_COLORS: Record<string, string> = {
  REGISTERED: "bg-gray-100 text-gray-800",
  DISCOVERY: "bg-blue-100 text-blue-800",
  FORMALIZATION: "bg-purple-100 text-purple-800",
  REVIEW: "bg-yellow-100 text-yellow-800",
  DECISION: "bg-orange-100 text-orange-800",
  OFFERING: "bg-green-100 text-green-800",
  MVP: "bg-emerald-100 text-emerald-800",
};

const STAGE_LABELS: Record<string, string> = {
  REGISTERED: "등록",
  DISCOVERY: "발굴",
  FORMALIZATION: "형상화",
  REVIEW: "리뷰",
  DECISION: "의사결정",
  OFFERING: "Offering",
  MVP: "MVP",
};

export interface PipelineItemData {
  id: string;
  title: string;
  description: string | null;
  currentStage: string;
  stageEnteredAt: string;
  createdBy: string;
  createdAt: string;
}

interface ItemCardProps {
  item: PipelineItemData;
  onClick?: (id: string) => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  const daysInStage = Math.floor(
    (Date.now() - new Date(item.stageEnteredAt).getTime()) / 86400000,
  );

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(item.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate">{item.title}</CardTitle>
          <Badge className={STAGE_COLORS[item.currentStage] ?? "bg-gray-100"} variant="secondary">
            {STAGE_LABELS[item.currentStage] ?? item.currentStage}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {item.description && (
          <p className="text-xs text-muted-foreground truncate mb-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{item.createdBy}</span>
          <span>{daysInStage}일째</span>
        </div>
      </CardContent>
    </Card>
  );
}

export { STAGE_COLORS, STAGE_LABELS };
