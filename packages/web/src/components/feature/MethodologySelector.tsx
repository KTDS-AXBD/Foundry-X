"use client";

import { useEffect, useState } from "react";
import { getMethodologyRecommendation, getMethodologies, type MethodologyInfo, type MethodologyRecommendation } from "@/lib/api-client";

interface MethodologySelectorProps {
  bizItemId: string;
  currentMethodologyId: string | null;
  onSelect: (methodologyId: string) => void;
}

export default function MethodologySelector({
  bizItemId, currentMethodologyId, onSelect,
}: MethodologySelectorProps) {
  const [methodologies, setMethodologies] = useState<MethodologyInfo[]>([]);
  const [recommendations, setRecommendations] = useState<MethodologyRecommendation[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  useEffect(() => {
    getMethodologies().then(d => setMethodologies(d.methodologies)).catch(() => {});
    getMethodologyRecommendation(bizItemId)
      .then(d => setRecommendations(d.recommendations))
      .catch(() => {});
  }, [bizItemId]);

  const topRecommendation = recommendations[0];

  function handleSelect(id: string) {
    if (id === currentMethodologyId) return;
    setPendingSelection(id);
    setShowConfirm(true);
  }

  function confirmChange() {
    if (pendingSelection) {
      onSelect(pendingSelection);
    }
    setShowConfirm(false);
    setPendingSelection(null);
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">방법론:</label>
        <select
          value={currentMethodologyId ?? ""}
          onChange={(e) => handleSelect(e.target.value)}
          className="rounded border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">선택하세요</option>
          {methodologies.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        {topRecommendation && topRecommendation.id !== currentMethodologyId && (
          <span className="text-xs text-muted-foreground">
            추천: {topRecommendation.name} ({topRecommendation.score}점)
          </span>
        )}
      </div>

      {showConfirm && (
        <div className="mt-3 rounded bg-yellow-50 p-3 text-sm dark:bg-yellow-950">
          <p>변경 시 기존 분석 결과는 유지되며, 새 방법론 기준으로 재평가돼요.</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={confirmChange}
              className="rounded bg-primary px-3 py-1 text-xs text-primary-foreground"
            >
              변경
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded border px-3 py-1 text-xs"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
