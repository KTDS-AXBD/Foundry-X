"use client";

import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StageProgress } from "@/lib/api-client";

interface WizardStepperProps {
  stages: StageProgress[];
  activeStage: string;
  onStageClick: (stage: string) => void;
  discoveryType?: string | null;
}

const TYPE_ACCENT: Record<string, string> = {
  I: "border-blue-500 bg-blue-500",
  M: "border-emerald-500 bg-emerald-500",
  P: "border-amber-500 bg-amber-500",
  T: "border-purple-500 bg-purple-500",
  S: "border-rose-500 bg-rose-500",
};

function getNodeStyle(status: string, isActive: boolean, discoveryType?: string | null) {
  if (status === "completed") {
    return "border-green-500 bg-green-500 text-white";
  }
  if (status === "in_progress") {
    const accent = discoveryType ? TYPE_ACCENT[discoveryType] : "border-blue-500 bg-blue-500";
    return `${accent} text-white animate-pulse`;
  }
  if (isActive) {
    return "border-slate-400 bg-slate-100 text-slate-700";
  }
  return "border-slate-200 bg-white text-slate-400";
}

function getLineStyle(status: string) {
  if (status === "completed") return "bg-green-400";
  if (status === "in_progress") return "bg-blue-300";
  return "bg-slate-200";
}

export default function WizardStepper({
  stages,
  activeStage,
  onStageClick,
  discoveryType,
}: WizardStepperProps) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2" data-tour="discovery-stepper">
      {stages.map((s, i) => {
        const isActive = s.stage === activeStage;
        const isCommitGate = s.stage === "2-5";

        return (
          <div key={s.stage} className="flex items-center">
            {/* Step Node */}
            <button
              onClick={() => onStageClick(s.stage)}
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all hover:scale-110",
                getNodeStyle(s.status, isActive, discoveryType),
                isActive && "ring-2 ring-offset-1 ring-blue-300",
              )}
              title={`${s.stage} ${s.stageName}`}
            >
              {s.status === "completed" ? (
                <Check className="h-4 w-4" />
              ) : isCommitGate ? (
                <Zap className="h-4 w-4" />
              ) : (
                s.stage.replace("2-", "")
              )}
            </button>

            {/* Connecting Line */}
            {i < stages.length - 1 && (
              <div className={cn("h-0.5 w-6 shrink-0", getLineStyle(s.status))} />
            )}
          </div>
        );
      })}
    </div>
  );
}
