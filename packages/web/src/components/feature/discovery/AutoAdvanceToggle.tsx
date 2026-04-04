/**
 * F314: AutoAdvanceToggle — 파이프라인 자동 진행 토글
 */
import { useState, useCallback } from "react";

interface Props {
  pipelineRunId: string;
  currentStep: string | null;
  status: string;
  hasActiveCheckpoint: boolean;
  onAutoAdvance: (runId: string) => Promise<{
    status: string;
    nextStep: string | null;
    checkpointId?: string;
  }>;
}

const STEP_LABELS: Record<string, string> = {
  "2-0": "아이디어 분류",
  "2-1": "사업 적합성",
  "2-2": "시장 트렌드",
  "2-3": "경쟁 분석",
  "2-4": "고객 니즈",
  "2-5": "Commit Gate",
  "2-6": "기술 타당성",
  "2-7": "파일럿 설계",
  "2-8": "패키징",
  "2-9": "AI 멀티페르소나 평가",
  "2-10": "최종 보고서",
};

export function AutoAdvanceToggle({
  pipelineRunId,
  currentStep,
  status,
  hasActiveCheckpoint,
  onAutoAdvance,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const canAdvance =
    status === "discovery_running" && !hasActiveCheckpoint && !loading;

  const handleAdvance = useCallback(async () => {
    setLoading(true);
    setLastResult(null);
    try {
      const result = await onAutoAdvance(pipelineRunId);
      setLastResult(
        result.status === "checkpoint_pending"
          ? "체크포인트 승인 대기"
          : result.status === "shaping_triggered"
            ? "형상화 자동 시작됨"
            : result.nextStep
              ? `${STEP_LABELS[result.nextStep] ?? result.nextStep} 진행 중`
              : "완료",
      );
    } catch (err) {
      setLastResult(`오류: ${err instanceof Error ? err.message : "실패"}`);
    } finally {
      setLoading(false);
    }
  }, [pipelineRunId, onAutoAdvance]);

  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">현재 단계:</span>
          <span className="text-sm font-semibold text-blue-600">
            {currentStep ? (STEP_LABELS[currentStep] ?? currentStep) : "—"}
          </span>
        </div>
        {lastResult && (
          <p className="text-xs text-gray-500 mt-1">{lastResult}</p>
        )}
      </div>

      {hasActiveCheckpoint ? (
        <span className="px-3 py-1.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full animate-pulse">
          승인 필요
        </span>
      ) : (
        <button
          onClick={handleAdvance}
          disabled={!canAdvance}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              실행 중...
            </>
          ) : (
            "▶ 다음 단계 실행"
          )}
        </button>
      )}
    </div>
  );
}
