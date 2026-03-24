"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STARTING_POINTS = [
  { value: "idea", icon: "💡", label: "아이디어에서 시작" },
  { value: "market", icon: "📊", label: "시장 또는 타겟에서 시작" },
  { value: "problem", icon: "🔍", label: "고객 문제에서 시작" },
  { value: "tech", icon: "🔧", label: "기술에서 시작" },
  { value: "service", icon: "🏢", label: "기존 서비스에서 시작" },
] as const;

interface StartingPointConfirmProps {
  currentStartingPoint: string;
  confidence: number;
  onConfirm: (startingPoint: string) => void;
  onCancel: () => void;
}

export default function StartingPointConfirm({
  currentStartingPoint,
  confidence,
  onConfirm,
  onCancel,
}: StartingPointConfirmProps) {
  const [selected, setSelected] = useState(currentStartingPoint);
  const currentLabel =
    STARTING_POINTS.find((sp) => sp.value === currentStartingPoint)?.label ?? currentStartingPoint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <h3 className="text-lg font-semibold">시작점 확인</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          AI가 이 아이템을 &ldquo;{currentLabel}&rdquo;으로 분류했어요 (confidence: {(confidence * 100).toFixed(0)}%)
        </p>
        <p className="mt-2 text-sm font-medium">이 분류가 맞나요?</p>

        {/* Radio group */}
        <div className="mt-4 space-y-2">
          {STARTING_POINTS.map((sp) => (
            <label
              key={sp.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                selected === sp.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="startingPoint"
                value={sp.value}
                checked={selected === sp.value}
                onChange={() => setSelected(sp.value)}
                className="size-4 accent-primary"
              />
              <span>
                {sp.icon} {sp.label}
              </span>
              {sp.value === currentStartingPoint && (
                <span className="ml-auto text-xs text-muted-foreground">(AI 추천)</span>
              )}
            </label>
          ))}
        </div>

        {/* Buttons */}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
          <Button size="sm" onClick={() => onConfirm(selected)}>
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}
