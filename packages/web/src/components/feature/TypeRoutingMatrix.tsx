"use client";

import { cn } from "@/lib/utils";

type Intensity = "core" | "normal" | "light";
type DiscoveryType = "I" | "M" | "P" | "T" | "S";

const STAGES = ["2-1", "2-2", "2-3", "2-4", "2-5", "2-6", "2-7"] as const;
const TYPES: DiscoveryType[] = ["I", "M", "P", "T", "S"];

const STAGE_NAMES: Record<string, string> = {
  "2-1": "레퍼런스",
  "2-2": "시장 검증",
  "2-3": "경쟁 분석",
  "2-4": "아이템 도출",
  "2-5": "아이템 선정",
  "2-6": "고객 정의",
  "2-7": "BM 정의",
};

const TYPE_NAMES: Record<DiscoveryType, string> = {
  I: "아이디어형",
  M: "시장·타겟형",
  P: "고객문제형",
  T: "기술형",
  S: "서비스형",
};

const PATH_MAP: Record<string, Record<DiscoveryType, Intensity>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};

const INTENSITY_STYLES: Record<Intensity, string> = {
  core: "bg-blue-600 text-white font-semibold",
  normal: "bg-slate-200 text-slate-700",
  light: "bg-transparent text-slate-400",
};

const INTENSITY_LABELS: Record<Intensity, string> = {
  core: "핵심",
  normal: "보통",
  light: "간소",
};

interface TypeRoutingMatrixProps {
  selectedType?: DiscoveryType;
}

export default function TypeRoutingMatrix({ selectedType }: TypeRoutingMatrixProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-center text-sm">
        <thead>
          <tr>
            <th className="border bg-muted/50 px-3 py-2 text-left text-xs font-semibold">
              단계
            </th>
            {TYPES.map((t) => (
              <th
                key={t}
                className={cn(
                  "border px-3 py-2 text-xs font-semibold",
                  selectedType === t && "bg-blue-50",
                )}
              >
                <div>Type {t}</div>
                <div className="font-normal text-muted-foreground">{TYPE_NAMES[t]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage) => (
            <tr key={stage}>
              <td className="border px-3 py-2 text-left">
                <span className="mr-1.5 font-mono text-xs text-muted-foreground">{stage}</span>
                <span className="text-xs font-medium">{STAGE_NAMES[stage]}</span>
              </td>
              {TYPES.map((type) => {
                const intensity = PATH_MAP[stage][type];
                return (
                  <td
                    key={`${stage}-${type}`}
                    className={cn(
                      "border px-2 py-1.5",
                      selectedType === type && "ring-1 ring-inset ring-blue-300",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block rounded px-2 py-0.5 text-[11px]",
                        INTENSITY_STYLES[intensity],
                      )}
                    >
                      {INTENSITY_LABELS[intensity]}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-blue-600" /> 핵심 (core)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-slate-200" /> 보통 (normal)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded border bg-transparent" /> 간소 (light)
        </span>
      </div>
    </div>
  );
}
