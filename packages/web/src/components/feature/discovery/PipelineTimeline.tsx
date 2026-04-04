/**
 * F312: PipelineTimeline — 발굴→형상화 파이프라인 진행 타임라인
 */
import { PipelineStatusBadge } from "./PipelineStatusBadge";

interface TimelineStep {
  id: string;
  label: string;
  status: "completed" | "running" | "pending" | "failed" | "skipped";
}

interface PipelineRun {
  status: string;
  currentStep: string | null;
  events: Array<{
    eventType: string;
    stepId: string | null;
    toStatus: string | null;
    createdAt: string;
  }>;
}

interface Props {
  run: PipelineRun;
  onStepClick?: (stepId: string) => void;
}

const DISCOVERY_STEPS = Array.from({ length: 11 }, (_, i) => ({
  id: `2-${i}`,
  label: `2-${i}`,
}));

const SHAPING_STEPS = ["A", "B", "C", "D", "E", "F"].map((p) => ({
  id: `phase-${p}`,
  label: `Phase ${p}`,
}));

function getStepStatus(
  stepId: string,
  currentStep: string | null,
  completedSteps: Set<string>,
  failedStep: string | null,
): TimelineStep["status"] {
  if (failedStep === stepId) return "failed";
  if (completedSteps.has(stepId)) return "completed";
  if (currentStep === stepId) return "running";
  return "pending";
}

export function PipelineTimeline({ run, onStepClick }: Props) {
  const completedSteps = new Set<string>();
  let failedStep: string | null = null;

  for (const evt of run.events) {
    if (evt.eventType === "STEP_COMPLETE" && evt.stepId) {
      completedSteps.add(evt.stepId);
    }
    if (evt.eventType === "SHAPING_PHASE_COMPLETE" && evt.stepId) {
      completedSteps.add(evt.stepId);
    }
    if (evt.eventType === "STEP_FAILED" && evt.stepId) {
      failedStep = evt.stepId;
    }
    if (evt.eventType === "SKIP" && evt.stepId) {
      completedSteps.add(evt.stepId); // skipped도 완료로 처리
    }
  }

  const allSteps = [...DISCOVERY_STEPS, ...SHAPING_STEPS];
  const steps: TimelineStep[] = allSteps.map((s) => ({
    ...s,
    status: getStepStatus(s.id, run.currentStep, completedSteps, failedStep),
  }));

  const statusColors: Record<TimelineStep["status"], string> = {
    completed: "bg-green-500",
    running: "bg-blue-500 animate-pulse",
    pending: "bg-gray-300",
    failed: "bg-red-500",
    skipped: "bg-gray-400",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Pipeline Progress</h3>
        <PipelineStatusBadge status={run.status} />
      </div>

      {/* Discovery Section */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Discovery (2-0 ~ 2-10)</p>
        <div className="flex items-center gap-1">
          {steps.slice(0, 11).map((step, i) => (
            <button
              key={step.id}
              onClick={() => onStepClick?.(step.id)}
              className="flex flex-col items-center group"
              title={`${step.label} — ${step.status}`}
            >
              <div className={`w-6 h-6 rounded-full ${statusColors[step.status]} flex items-center justify-center`}>
                <span className="text-[10px] text-white font-bold">{i}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Arrow separator */}
      <div className="flex items-center justify-center text-gray-400">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* Shaping Section */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Shaping (Phase A ~ F)</p>
        <div className="flex items-center gap-1">
          {steps.slice(11).map((step) => (
            <button
              key={step.id}
              onClick={() => onStepClick?.(step.id)}
              className="flex flex-col items-center group"
              title={`${step.label} — ${step.status}`}
            >
              <div className={`w-8 h-8 rounded-full ${statusColors[step.status]} flex items-center justify-center`}>
                <span className="text-xs text-white font-bold">{step.label.replace("Phase ", "")}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
