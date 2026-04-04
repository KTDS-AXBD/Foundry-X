/**
 * F314: CheckpointReviewPanel — HITL 체크포인트 승인/거부 UI
 */
import { useState } from "react";

interface CheckpointQuestion {
  question: string;
  required?: boolean;
}

interface Checkpoint {
  id: string;
  stepId: string;
  checkpointType: string;
  status: string;
  questions: CheckpointQuestion[];
  deadline: string | null;
}

interface Props {
  checkpoint: Checkpoint;
  pipelineRunId: string;
  onApprove: (checkpointId: string, data: {
    decision: "approved";
    responses: Array<{ question: string; answer: string; signal?: string }>;
  }) => void;
  onReject: (checkpointId: string, reason: string) => void;
}

const STEP_LABELS: Record<string, string> = {
  "2-1": "초기 역량 검증",
  "2-3": "시장 검증",
  "2-5": "Commit Gate (투자 결정)",
  "2-7": "파일럿 검증",
};

export function CheckpointReviewPanel({ checkpoint, onApprove, onReject }: Props) {
  const [responses, setResponses] = useState<Array<{ answer: string; signal?: string }>>(
    checkpoint.questions.map(() => ({ answer: "", signal: undefined })),
  );
  const [rejectReason, setRejectReason] = useState("");
  const [mode, setMode] = useState<"review" | "reject">("review");

  const isCommitGate = checkpoint.checkpointType === "commit_gate";
  const allAnswered = checkpoint.questions.every((q, i) =>
    !q.required || responses[i]?.answer.trim(),
  );

  const handleApprove = () => {
    onApprove(checkpoint.id, {
      decision: "approved",
      responses: checkpoint.questions.map((q, i) => ({
        question: q.question,
        answer: responses[i]?.answer ?? "",
        signal: responses[i]?.signal,
      })),
    });
  };

  const handleReject = () => {
    onReject(checkpoint.id, rejectReason);
  };

  const deadline = checkpoint.deadline ? new Date(checkpoint.deadline) : null;
  const timeLeft = deadline ? Math.max(0, deadline.getTime() - Date.now()) : 0;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className={`border-2 rounded-lg p-4 ${isCommitGate ? "border-red-300 bg-red-50" : "border-yellow-300 bg-yellow-50"}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-lg ${isCommitGate ? "text-red-600" : "text-yellow-600"}`}>
            {isCommitGate ? "🛡️" : "⚡"}
          </span>
          <h3 className="font-semibold text-gray-800">
            {STEP_LABELS[checkpoint.stepId] ?? `체크포인트 ${checkpoint.stepId}`}
          </h3>
          {isCommitGate && (
            <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded">
              Commit Gate
            </span>
          )}
        </div>
        {deadline && timeLeft > 0 && (
          <span className="text-xs text-gray-500">
            마감: {hoursLeft}시간 {minutesLeft}분 남음
          </span>
        )}
      </div>

      {mode === "review" ? (
        <>
          <div className="space-y-3 mb-4">
            {checkpoint.questions.map((q, i) => (
              <div key={i} className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  {q.question}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm"
                  rows={2}
                  placeholder="의견을 입력하세요..."
                  value={responses[i]?.answer ?? ""}
                  onChange={(e) => {
                    const next = [...responses];
                    next[i] = { ...next[i]!, answer: e.target.value };
                    setResponses(next);
                  }}
                />
                {isCommitGate && (
                  <div className="flex gap-2 mt-1">
                    {(["go", "pivot", "drop"] as const).map((signal) => (
                      <button
                        key={signal}
                        onClick={() => {
                          const next = [...responses];
                          next[i] = { ...next[i]!, signal };
                          setResponses(next);
                        }}
                        className={`px-2 py-0.5 text-xs rounded border ${
                          responses[i]?.signal === signal
                            ? signal === "go"
                              ? "bg-green-100 border-green-400 text-green-700"
                              : signal === "pivot"
                                ? "bg-yellow-100 border-yellow-400 text-yellow-700"
                                : "bg-red-100 border-red-400 text-red-700"
                            : "bg-white border-gray-300 text-gray-500"
                        }`}
                      >
                        {signal === "go" ? "🟢 Go" : signal === "pivot" ? "🟡 Pivot" : "🔴 Drop"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={!allAnswered}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              ✅ 승인 — 다음 단계 진행
            </button>
            <button
              onClick={() => setMode("reject")}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            >
              ❌ 거부
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={3}
            placeholder="거부 사유를 입력하세요..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
            >
              거부 확정
            </button>
            <button
              onClick={() => setMode("review")}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
