"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import WizardStepper from "./WizardStepper";
import AnalysisStepResult from "./AnalysisStepResult";
import {
  getDiscoveryProgress,
  updateDiscoveryStage,
  runStartingPoint,
  runClassify,
  runEvaluate,
  type StageProgress,
  type StartingPointResult,
  type ClassifyResult,
  type EvaluateResult,
} from "@/lib/api-client";

interface AnalysisStepperProps {
  bizItemId: string;
  discoveryType?: string | null;
  onAnalysisComplete?: () => void;
}

type StepResult = StartingPointResult | ClassifyResult | EvaluateResult;

const MVP_STEPS: Array<{
  stage: string;
  stageName: string;
  run: (id: string) => Promise<StepResult>;
}> = [
  {
    stage: "2-0",
    stageName: "시작점 분류",
    run: (id) => runStartingPoint(id),
  },
  {
    stage: "2-1",
    stageName: "자동 분류",
    run: (id) => runClassify(id),
  },
  {
    stage: "2-2",
    stageName: "다관점 평가",
    run: (id) => runEvaluate(id),
  },
];

export default function AnalysisStepper({
  bizItemId,
  discoveryType,
  onAnalysisComplete,
}: AnalysisStepperProps) {
  const [stages, setStages] = useState<StageProgress[]>([]);
  const [activeStage, setActiveStage] = useState("2-0");
  const [running, setRunning] = useState(false);
  const [currentRunningStage, setCurrentRunningStage] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [error, setError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    try {
      const prog = await getDiscoveryProgress(bizItemId);
      if (prog.stages.length > 0) {
        setStages(prog.stages);
        const current = prog.currentStage ?? prog.stages.find((s) => s.status !== "completed")?.stage;
        if (current) setActiveStage(current);
      }
    } catch {
      // stages may not be initialized yet — silent
    }
  }, [bizItemId]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  function setStageStatus(stage: string, status: string) {
    setStages((prev) =>
      prev.map((s) => (s.stage === stage ? { ...s, status } : s)),
    );
  }

  async function runAnalysis() {
    setRunning(true);
    setError(null);

    try {
      for (const step of MVP_STEPS) {
        const existing = stages.find((s) => s.stage === step.stage);
        if (existing?.status === "completed") continue;

        setCurrentRunningStage(step.stage);
        setStageStatus(step.stage, "in_progress");
        setActiveStage(step.stage);

        let result: StepResult;
        try {
          result = await step.run(bizItemId);
        } catch (e) {
          setStageStatus(step.stage, "pending");
          throw e;
        }

        setResults((prev) => ({ ...prev, [step.stage]: result }));
        setStageStatus(step.stage, "completed");

        // Sync with discovery stages table (non-blocking)
        updateDiscoveryStage(bizItemId, step.stage, "completed").catch(() => null);
      }

      onAnalysisComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실행 중 오류가 발생했어요");
    } finally {
      setRunning(false);
      setCurrentRunningStage(null);
    }
  }

  const mvpStagesCompleted = MVP_STEPS.every((step) => {
    const stageState = stages.find((s) => s.stage === step.stage);
    return stageState?.status === "completed" || results[step.stage] !== undefined;
  });

  const hasResults = Object.keys(results).length > 0;

  const completedMvpCount = MVP_STEPS.filter((step) => {
    const stageState = stages.find((s) => s.stage === step.stage);
    return stageState?.status === "completed" || results[step.stage] !== undefined;
  }).length;

  return (
    <div className="space-y-4" data-testid="analysis-stepper">
      {/* 11단계 스텝퍼 */}
      {stages.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {completedMvpCount}/3 단계 완료 (MVP)
          </p>
          <WizardStepper
            stages={stages}
            activeStage={activeStage}
            onStageClick={setActiveStage}
            discoveryType={discoveryType}
          />
        </div>
      )}

      {/* 실행 버튼 */}
      <div className="flex items-center gap-3 flex-wrap">
        {!mvpStagesCompleted ? (
          <button
            onClick={runAnalysis}
            disabled={running}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            data-testid="analysis-start-button"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {currentRunningStage
                  ? `Step ${currentRunningStage} 실행 중...`
                  : "준비 중..."}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {completedMvpCount > 0 ? "다음 단계 실행" : "분석 시작"}
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            MVP 분석 완료 (3단계) — 형상화를 시작할 수 있어요
          </div>
        )}

        {stages.length === 0 && !running && (
          <p className="text-xs text-muted-foreground">
            분석 시작 버튼을 클릭하면 AI가 3단계를 순차적으로 수행해요.
          </p>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">분석 오류</p>
            <p className="mt-0.5 text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* 분석 결과 */}
      {hasResults && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">분석 결과</h3>
          {MVP_STEPS.filter((step) => results[step.stage]).map((step) => (
            <AnalysisStepResult
              key={step.stage}
              stage={step.stage}
              stageName={step.stageName}
              result={results[step.stage] as unknown as Record<string, unknown>}
            />
          ))}
        </div>
      )}
    </div>
  );
}
