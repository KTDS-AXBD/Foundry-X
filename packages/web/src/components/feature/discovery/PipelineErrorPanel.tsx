/**
 * F313: PipelineErrorPanel — 에러 복구 UI (재시도/건너뛰기/중단)
 */
import { useState } from "react";

interface Props {
  runId: string;
  currentStep: string | null;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  onAction: (action: "retry" | "skip" | "abort", reason?: string) => Promise<void>;
  isProcessing?: boolean;
}

export function PipelineErrorPanel({
  runId: _runId,
  currentStep,
  errorMessage,
  retryCount,
  maxRetries,
  onAction,
  isProcessing = false,
}: Props) {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const canRetry = retryCount < maxRetries;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h3 className="text-sm font-semibold text-red-800">Pipeline Error</h3>
      </div>

      {currentStep && (
        <p className="text-xs text-red-700">
          Failed at step: <span className="font-mono font-bold">{currentStep}</span>
        </p>
      )}

      {errorMessage && (
        <div className="bg-red-100 rounded p-2">
          <p className="text-xs text-red-800 font-mono break-all">{errorMessage}</p>
        </div>
      )}

      <p className="text-xs text-red-600">
        Retry attempts: {retryCount}/{maxRetries}
      </p>

      <div className="flex gap-2">
        {/* Retry */}
        <button
          onClick={() => onAction("retry")}
          disabled={isProcessing || !canRetry}
          className="flex-1 py-1.5 px-3 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {canRetry ? "Retry" : "Max retries"}
        </button>

        {/* Skip */}
        <button
          onClick={() => onAction("skip")}
          disabled={isProcessing}
          className="flex-1 py-1.5 px-3 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Skip
        </button>

        {/* Abort */}
        {!showAbortConfirm ? (
          <button
            onClick={() => setShowAbortConfirm(true)}
            disabled={isProcessing}
            className="flex-1 py-1.5 px-3 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Abort
          </button>
        ) : (
          <button
            onClick={() => { onAction("abort"); setShowAbortConfirm(false); }}
            disabled={isProcessing}
            className="flex-1 py-1.5 px-3 bg-red-800 text-white text-xs font-medium rounded animate-pulse"
          >
            Confirm Abort
          </button>
        )}
      </div>
    </div>
  );
}
