"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STARTING_POINT_CONFIG: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  idea: { icon: "💡", label: "아이디어", color: "bg-purple-100 text-purple-800 border-purple-200" },
  market: { icon: "📊", label: "시장·타겟", color: "bg-blue-100 text-blue-800 border-blue-200" },
  problem: { icon: "🔍", label: "고객 문제", color: "bg-orange-100 text-orange-800 border-orange-200" },
  tech: { icon: "🔧", label: "기술", color: "bg-green-100 text-green-800 border-green-200" },
  service: { icon: "🏢", label: "기존 서비스", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

interface StartingPointBadgeProps {
  startingPoint: string;
  confidence: number;
  needsConfirmation: boolean;
  onConfirmClick?: () => void;
}

export default function StartingPointBadge({
  startingPoint,
  confidence,
  needsConfirmation,
  onConfirmClick,
}: StartingPointBadgeProps) {
  const config = STARTING_POINT_CONFIG[startingPoint] ?? {
    icon: "❓",
    label: startingPoint,
    color: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge className={cn("border text-xs font-medium", config.color)}>
        <span className="mr-0.5">{config.icon}</span>
        {config.label}
      </Badge>

      {needsConfirmation && (
        <button
          type="button"
          onClick={onConfirmClick}
          className="inline-flex items-center gap-0.5 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          ⚠️ 확인 필요
        </button>
      )}

      {!needsConfirmation && confidence > 0 && (
        <span className="text-[11px] text-muted-foreground">
          {(confidence * 100).toFixed(0)}%
        </span>
      )}
    </span>
  );
}
