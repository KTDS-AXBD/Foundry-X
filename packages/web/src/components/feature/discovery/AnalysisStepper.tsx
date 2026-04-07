"use client";

/**
 * F438 — 발굴 분석 실행 스텝퍼
 * 3단계 순차 실행: 2-0 시작점 분류 → 2-1 자동 분류 → 2-2 다관점 평가
 */
import { useState } from "react";
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  analyzeStartingPoint,
  classifyBizItem,
  evaluateBizItem,
  type StartingPointResult,
  type ClassifyResult,
  type EvaluateResult,
} from "@/lib/api-client";

interface AnalysisStepperProps {
  bizItemId: string;
  onAnalysisComplete?: () => void;
}

type StepStatus = "pending" | "running" | "done" | "error";

interface Step {
  id: string;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: "starting-point", label: "2-0 시작점 분류", description: "사업 아이템의 발굴 시작점을 5유형으로 분류해요." },
  { id: "classify", label: "2-1 자동 분류", description: "산업 분야와 규모를 자동으로 분류해요." },
  { id: "evaluate", label: "2-2 다관점 평가", description: "여러 페르소나 관점에서 사업 아이디어를 평가해요." },
];

const TYPE_LABELS: Record<string, string> = {
  I: "아이디어형", M: "시장·타겟형", P: "고객문제형", T: "기술형", S: "서비스형",
};

export default function AnalysisStepper({ bizItemId, onAnalysisComplete }: AnalysisStepperProps) {
  const [statuses, setStatuses] = useState<StepStatus[]>(["pending", "pending", "pending"]);
  const [results, setResults] = useState<[StartingPointResult | null, ClassifyResult | null, EvaluateResult | null]>([null, null, null]);
  const [expanded, setExpanded] = useState<boolean[]>([true, true, true]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allDone = statuses.every((s) => s === "done");
  const hasStarted = statuses.some((s) => s !== "pending");

  function setStep(idx: number, status: StepStatus) {
    setStatuses((prev) => { const next = [...prev]; next[idx] = status; return next; });
  }

  function setResult<T>(idx: number, result: T) {
    setResults((prev) => { const next = [...prev] as typeof results; next[idx] = result as never; return next; });
  }

  async function runAnalysis() {
    setRunning(true);
    setError(null);
    try {
      // Step 0: Starting Point
      setStep(0, "running");
      const sp = await analyzeStartingPoint(bizItemId);
      setResult(0, sp);
      setStep(0, "done");

      // Step 1: Classify
      setStep(1, "running");
      const cl = await classifyBizItem(bizItemId);
      setResult(1, cl);
      setStep(1, "done");

      // Step 2: Evaluate
      setStep(2, "running");
      const ev = await evaluateBizItem(bizItemId);
      setResult(2, ev);
      setStep(2, "done");

      onAnalysisComplete?.();
    } catch (e) {
      const failIdx = statuses.findIndex((s) => s === "running");
      if (failIdx >= 0) setStep(failIdx, "error");
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했어요.");
    } finally {
      setRunning(false);
    }
  }

  function toggleExpanded(idx: number) {
    setExpanded((prev) => { const next = [...prev]; next[idx] = !next[idx]; return next; });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">MVP 3단계 분석을 순차적으로 실행해요.</p>
        {!allDone && (
          <Button size="sm" onClick={runAnalysis} disabled={running}>
            {running ? <><Loader2 className="size-4 mr-2 animate-spin" />분석 중...</> : hasStarted ? "이어서 실행" : "분석 시작"}
          </Button>
        )}
        {allDone && <Badge className="bg-green-100 text-green-700 border-green-200">분석 완료</Badge>}
      </div>

      {error && <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">{error}</p>}

      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const status = statuses[idx];
          const result = results[idx];
          const isExpanded = expanded[idx];
          return (
            <div key={step.id} className="rounded-lg border bg-card">
              <div className="flex items-center gap-3 p-3">
                {status === "done" && <CheckCircle2 className="size-5 text-green-500 shrink-0" />}
                {status === "running" && <Loader2 className="size-5 text-blue-500 shrink-0 animate-spin" />}
                {status === "pending" && <Circle className="size-5 text-slate-300 shrink-0" />}
                {status === "error" && <Circle className="size-5 text-destructive shrink-0" />}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${status === "pending" ? "text-muted-foreground" : ""}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {status === "done" && result && (
                  <button onClick={() => toggleExpanded(idx)} className="text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                )}
              </div>
              {status === "done" && result && isExpanded && (
                <div className="px-11 pb-3 text-sm text-muted-foreground space-y-1">
                  {idx === 0 && results[0] && (
                    <>
                      <p>시작점 유형: <span className="font-medium text-foreground">{results[0].startingPointType}</span></p>
                      {results[0].reason && <p className="text-xs">{results[0].reason}</p>}
                    </>
                  )}
                  {idx === 1 && results[1] && (
                    <>
                      <p>유형: <span className="font-medium text-foreground">
                        {results[1].discoveryType} ({TYPE_LABELS[results[1].discoveryType] ?? results[1].discoveryType})
                      </span></p>
                      {results[1].industry && <p>산업: {results[1].industry}</p>}
                      {results[1].targetScale && <p>규모: {results[1].targetScale}</p>}
                    </>
                  )}
                  {idx === 2 && results[2] && (
                    <>
                      <p>종합 점수: <span className="font-medium text-foreground">{results[2].overallScore}/100</span></p>
                      {results[2].summary && <p className="text-xs">{results[2].summary}</p>}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
