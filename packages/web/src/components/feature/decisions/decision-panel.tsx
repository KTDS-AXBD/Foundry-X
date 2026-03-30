"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postApi } from "@/lib/api-client";

interface DecisionItem {
  id: string;
  decision: "GO" | "HOLD" | "DROP";
  comment: string;
  decidedBy: string;
  createdAt: string;
  stage: string;
}

interface DecisionPanelProps {
  bizItemId: string;
  decisions: DecisionItem[];
  onDecisionMade?: () => void;
}

const DECISION_STYLES = {
  GO: { label: "Go", color: "bg-green-600 hover:bg-green-700 text-white" },
  HOLD: { label: "Hold", color: "bg-yellow-600 hover:bg-yellow-700 text-white" },
  DROP: { label: "Drop", color: "bg-red-600 hover:bg-red-700 text-white" },
};

export function DecisionPanel({ bizItemId, decisions, onDecisionMade }: DecisionPanelProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDecision = async (decision: "GO" | "HOLD" | "DROP") => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      await postApi("/decisions", { bizItemId, decision, comment });
      setComment("");
      onDecisionMade?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">의사결정</h3>

      {/* Decision input */}
      <div className="space-y-3">
        <Textarea
          placeholder="의사결정 근거를 작성해주세요 (필수)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
        <div className="flex gap-2">
          {(["GO", "HOLD", "DROP"] as const).map((d) => (
            <Button
              key={d}
              className={DECISION_STYLES[d].color}
              disabled={loading || !comment.trim()}
              onClick={() => handleDecision(d)}
            >
              {DECISION_STYLES[d].label}
            </Button>
          ))}
        </div>
      </div>

      {/* Decision history */}
      {decisions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">의사결정 이력</h4>
          <div className="space-y-2">
            {decisions.map((d) => (
              <div key={d.id} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      d.decision === "GO"
                        ? "bg-green-100 text-green-800"
                        : d.decision === "HOLD"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {d.decision}
                  </span>
                  <span className="text-muted-foreground text-xs">{d.decidedBy}</span>
                  <span className="text-muted-foreground text-xs ml-auto">
                    {new Date(d.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-muted-foreground">{d.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
