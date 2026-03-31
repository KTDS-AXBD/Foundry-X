"use client";

import { useState, useEffect } from "react";
import { X, Check, Pencil, RefreshCw, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  submitHitlReview,
  getHitlHistory,
  type HitlReview,
} from "@/lib/api-client";

interface HitlReviewPanelProps {
  artifactId: string;
  artifactContent: string | null;
  onClose: () => void;
  onActionComplete?: (action: HitlReview["action"]) => void;
}

type PanelMode = "view" | "edit" | "reject";

export default function HitlReviewPanel({
  artifactId,
  artifactContent,
  onClose,
  onActionComplete,
}: HitlReviewPanelProps) {
  const [mode, setMode] = useState<PanelMode>("view");
  const [editContent, setEditContent] = useState(artifactContent ?? "");
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HitlReview[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setEditContent(artifactContent ?? "");
    setMode("view");
    setRejectReason("");
    setError(null);
  }, [artifactId, artifactContent]);

  async function loadHistory() {
    try {
      const data = await getHitlHistory(artifactId);
      setHistory(data.reviews);
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory, artifactId]);

  async function handleAction(action: HitlReview["action"]) {
    setSubmitting(true);
    setError(null);
    try {
      await submitHitlReview({
        artifactId,
        action,
        reason: action === "rejected" ? rejectReason : undefined,
        modifiedContent: action === "modified" ? editContent : undefined,
      });
      onActionComplete?.(action);
      if (action === "approved" || action === "rejected") {
        onClose();
      }
      if (action === "modified") {
        setMode("view");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "리뷰 실패");
    } finally {
      setSubmitting(false);
    }
  }

  const ACTION_LABEL: Record<HitlReview["action"], string> = {
    approved: "승인됨",
    modified: "수정됨",
    regenerated: "재생성",
    rejected: "거부됨",
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-bold">산출물 리뷰</h3>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === "view" && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">
              {artifactContent ?? "(산출물 없음)"}
            </pre>
          </div>
        )}

        {mode === "edit" && (
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">
              산출물 수정
            </label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-64 w-full resize-y rounded-lg border bg-background p-3 text-sm font-mono"
              placeholder="수정할 내용을 입력하세요..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("modified")}
                disabled={submitting || !editContent.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "저장 중..." : "수정 저장 + 승인"}
              </button>
              <button
                onClick={() => setMode("view")}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {mode === "reject" && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {artifactContent ?? "(산출물 없음)"}
              </pre>
            </div>
            <label className="text-xs font-medium text-muted-foreground">
              거부 사유 (필수)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="h-24 w-full resize-y rounded-lg border bg-background p-3 text-sm"
              placeholder="거부 사유를 입력하세요..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleAction("rejected")}
                disabled={submitting || !rejectReason.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "처리 중..." : "거부 확인"}
              </button>
              <button
                onClick={() => setMode("view")}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-muted"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Actions (view mode only) */}
      {mode === "view" && (
        <div className="border-t p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAction("approved")}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> 승인
            </button>
            <button
              onClick={() => setMode("edit")}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" /> 수정
            </button>
            <button
              onClick={() => handleAction("regenerated")}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> 재생성
            </button>
            <button
              onClick={() => setMode("reject")}
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> 거부
            </button>
          </div>
        </div>
      )}

      {/* Review History (collapsible) */}
      <div className="border-t">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50"
        >
          <span>리뷰 이력</span>
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {showHistory && (
          <div className="max-h-40 overflow-y-auto px-4 pb-3">
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">이력 없음</p>
            ) : (
              <div className="space-y-2">
                {history.map((r) => (
                  <div key={r.id} className="rounded border p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-medium",
                          r.action === "approved" && "bg-green-100 text-green-700",
                          r.action === "rejected" && "bg-red-100 text-red-700",
                          r.action === "modified" && "bg-blue-100 text-blue-700",
                          r.action === "regenerated" && "bg-amber-100 text-amber-700",
                        )}
                      >
                        {ACTION_LABEL[r.action]}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(r.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    {r.reason && (
                      <p className="mt-1 text-muted-foreground">사유: {r.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
