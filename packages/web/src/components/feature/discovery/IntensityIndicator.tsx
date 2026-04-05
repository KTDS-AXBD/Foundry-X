"use client";

import { cn } from "@/lib/utils";

export type IntensityLevel = "core" | "normal" | "light";

interface IntensityIndicatorProps {
  intensity: IntensityLevel;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const INTENSITY_CONFIG: Record<IntensityLevel, { symbol: string; label: string; className: string }> = {
  core: {
    symbol: "★",
    label: "핵심",
    className: "bg-green-50 text-green-700 border-green-300",
  },
  normal: {
    symbol: "○",
    label: "보통",
    className: "bg-blue-50 text-blue-700 border-blue-300",
  },
  light: {
    symbol: "△",
    label: "간소",
    className: "bg-gray-50 text-gray-500 border-gray-300",
  },
};

export default function IntensityIndicator({ intensity, size = "sm", showLabel = true }: IntensityIndicatorProps) {
  const config = INTENSITY_CONFIG[intensity];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
        size === "sm" ? "text-[10px]" : "text-xs",
        config.className,
      )}
      title={`${config.label} 분석`}
    >
      <span>{config.symbol}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
