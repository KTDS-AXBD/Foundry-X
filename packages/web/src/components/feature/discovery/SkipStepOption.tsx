"use client";

import { cn } from "@/lib/utils";

interface SkipStepOptionProps {
  stageNum: string;
  onSkip: () => void;
  disabled?: boolean;
  className?: string;
}

export default function SkipStepOption({
  stageNum,
  onSkip,
  disabled = false,
  className,
}: SkipStepOptionProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <span>△</span>
        <span>간소 단계</span>
      </span>
      <span className="text-gray-400">—</span>
      <span>이 단계({stageNum})는 해당 유형에서 간소 분석이에요.</span>
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled}
        className={cn(
          "ml-auto rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-colors",
          !disabled && "hover:bg-gray-100 hover:text-gray-800",
        )}
      >
        스킵하고 다음 단계로
      </button>
    </div>
  );
}
