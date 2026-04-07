"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquarePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalysisStepResultProps {
  stage: string;
  stageName: string;
  result: Record<string, unknown>;
  onSupplement?: (stage: string, text: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  startingPoint: "시작점",
  confidence: "신뢰도",
  reasoning: "분석 근거",
  needsConfirmation: "확인 필요",
  itemType: "아이템 유형",
  verdict: "평가 결론",
  avgScore: "평균 점수",
  totalConcerns: "우려 사항 수",
};

function formatValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    if (key === "confidence") return `${(value * 100).toFixed(1)}%`;
    if (key === "avgScore") return `${value.toFixed(1)}점`;
    return String(value);
  }
  if (typeof value === "boolean") return value ? "예" : "아니오";
  return String(value);
}

export default function AnalysisStepResult({
  stage,
  stageName,
  result,
  onSupplement,
}: AnalysisStepResultProps) {
  const [expanded, setExpanded] = useState(true);
  const [supplementMode, setSupplementMode] = useState(false);
  const [supplementText, setSupplementText] = useState("");

  const summaryEntries = Object.entries(result).filter(
    ([k]) =>
      !["scores", "turnAnswers", "analysisPath", "analysisWeights", "warnings", "id", "bizItemId"].includes(k),
  );

  const scores = (result as { scores?: EvaluationScore[] }).scores;

  return (
    <div className="rounded-lg border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs shrink-0">
            Step {stage}
          </Badge>
          <span className="text-sm font-medium">{stageName}</span>
          <Badge className="text-xs bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
            완료
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t p-4 space-y-3">
          {/* Summary fields */}
          <div className="grid gap-2">
            {summaryEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2 text-sm">
                <span className="text-muted-foreground min-w-[100px] shrink-0">
                  {FIELD_LABELS[key] ?? key}
                </span>
                <span className="font-medium break-words">{formatValue(key, value)}</span>
              </div>
            ))}
          </div>

          {/* Persona scores (evaluate result) */}
          {scores && scores.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">페르소나별 평가</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {scores.map((s) => (
                  <div key={s.personaId} className="rounded-md bg-muted/40 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.personaId}</span>
                      <span className="text-muted-foreground">
                        avg {((s.businessViability + s.strategicFit + s.customerValue + s.techMarket + s.execution) / 5).toFixed(1)}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{s.summary}</p>
                    {s.concerns.length > 0 && (
                      <p className="text-amber-600">우려: {s.concerns.join(" · ")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supplement input */}
          {onSupplement && !supplementMode && (
            <button
              onClick={() => setSupplementMode(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              보완 입력
            </button>
          )}

          {supplementMode && (
            <div className="space-y-2">
              <textarea
                value={supplementText}
                onChange={(e) => setSupplementText(e.target.value)}
                placeholder="이 단계 결과에 추가할 내용을 입력하세요..."
                className="h-20 w-full resize-y rounded-md border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onSupplement?.(stage, supplementText);
                    setSupplementMode(false);
                    setSupplementText("");
                  }}
                  disabled={!supplementText.trim()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setSupplementMode(false);
                    setSupplementText("");
                  }}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// type needed locally (not exported from api-client to avoid duplication)
interface EvaluationScore {
  personaId: string;
  businessViability: number;
  strategicFit: number;
  customerValue: number;
  techMarket: number;
  execution: number;
  summary: string;
  concerns: string[];
}
