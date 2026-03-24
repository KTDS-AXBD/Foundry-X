"use client";

import { Badge } from "@/components/ui/badge";

interface AnalysisStep {
  order: number;
  activity: string;
  pmSkills: string[];
  discoveryMapping: number[];
}

interface AnalysisPathStepperProps {
  path: {
    startingPoint: string;
    label: string;
    description: string;
    steps: AnalysisStep[];
  };
}

const SP_ICONS: Record<string, string> = {
  idea: "💡",
  market: "📊",
  problem: "🔍",
  tech: "🔧",
  service: "🏢",
};

export default function AnalysisPathStepper({ path }: AnalysisPathStepperProps) {
  const icon = SP_ICONS[path.startingPoint] ?? "📋";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-semibold">
          {icon} {path.label}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{path.description}</p>
      </div>

      {/* Timeline */}
      <div className="relative ml-2.5">
        {path.steps.map((step, idx) => {
          const isLast = idx === path.steps.length - 1;
          return (
            <div key={step.order} className="relative pb-5 pl-6 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div className="absolute left-[4.5px] top-3 h-full w-px bg-border" />
              )}

              {/* Dot */}
              <div className="absolute left-0 top-1.5 size-2.5 rounded-full border-2 border-primary bg-background" />

              {/* Content */}
              <div>
                <div className="text-sm font-medium">
                  <span className="mr-1.5 text-muted-foreground">{step.order}.</span>
                  {step.activity}
                </div>

                {step.pmSkills.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {step.pmSkills.map((skill) => (
                      <Badge
                        key={skill}
                        className="border border-violet-200 bg-violet-50 px-1.5 py-0 text-[10px] font-normal text-violet-700"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}

                {step.discoveryMapping.length > 0 && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Discovery 기준: {step.discoveryMapping.join(", ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
