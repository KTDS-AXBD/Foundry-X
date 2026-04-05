"use client";

import { cn } from "@/lib/utils";
import type { IntensityLevel } from "./IntensityIndicator";

interface IntensityMatrixProps {
  discoveryType?: string;
  compact?: boolean;
}

const TYPES = ["I", "M", "P", "T", "S"] as const;
const TYPE_NAMES: Record<string, string> = {
  I: "아이디어형",
  M: "시장·타겟형",
  P: "고객문제형",
  T: "기술형",
  S: "기존서비스형",
};

const STAGES = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"] as const;
const STAGE_SHORT_NAMES: Record<string, string> = {
  "2-1": "레퍼런스",
  "2-2": "시장검증",
  "2-3": "경쟁분석",
  "2-4": "아이템도출",
  "2-5": "선정(Gate)",
  "2-6": "고객정의",
  "2-7": "BM정의",
};

const MATRIX: Record<string, Record<string, IntensityLevel>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};

const CELL_STYLES: Record<IntensityLevel, string> = {
  core: "bg-green-100 text-green-800 font-bold",
  normal: "bg-blue-50 text-blue-700",
  light: "bg-gray-50 text-gray-400",
};

const CELL_SYMBOLS: Record<IntensityLevel, string> = {
  core: "★",
  normal: "○",
  light: "△",
};

export default function IntensityMatrix({ discoveryType, compact = false }: IntensityMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-center", compact ? "text-[10px]" : "text-xs")}>
        <thead>
          <tr>
            <th className="p-1 border bg-muted text-muted-foreground">단계</th>
            {TYPES.map((type) => (
              <th
                key={type}
                className={cn(
                  "p-1 border bg-muted text-muted-foreground",
                  discoveryType === type && "bg-primary/10 text-primary font-bold",
                )}
              >
                {compact ? type : `${type} ${TYPE_NAMES[type]}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage) => (
            <tr key={stage}>
              <td className="p-1 border text-left font-medium text-muted-foreground">
                {compact ? stage : `${stage} ${STAGE_SHORT_NAMES[stage]}`}
              </td>
              {TYPES.map((type) => {
                const intensity = MATRIX[stage][type];
                const isHighlighted = discoveryType === type;
                return (
                  <td
                    key={type}
                    className={cn(
                      "p-1 border",
                      CELL_STYLES[intensity],
                      isHighlighted && "ring-2 ring-primary/30",
                    )}
                  >
                    {CELL_SYMBOLS[intensity]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
        <span>★ 핵심 — 추가 프롬프트 + 깊은 분석</span>
        <span>○ 보통 — 표준 분석</span>
        <span>△ 간소 — 스킵 가능</span>
      </div>
    </div>
  );
}
