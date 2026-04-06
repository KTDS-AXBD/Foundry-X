/**
 * F377: Offering Validation Dashboard (Sprint 170)
 * GAN 추진론/반대론 + Six Hats + Expert 리뷰 시각화
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, Shield, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchOfferingDetail,
  fetchOfferingValidations,
  triggerOfferingValidation,
  type OfferingDetail,
  type OfferingValidationItem,
} from "@/lib/api-client";
import { ScoreBar } from "@/components/feature/offering-validate/score-bar";
import { GanPanel } from "@/components/feature/offering-validate/gan-panel";
import { SixHatsGrid } from "@/components/feature/offering-validate/six-hats-grid";
import { ExpertCards } from "@/components/feature/offering-validate/expert-cards";
import { ValidationHistory } from "@/components/feature/offering-validate/validation-history";

const PURPOSE_LABELS: Record<string, string> = {
  report: "보고용",
  proposal: "제안용",
  review: "검토용",
};

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [offering, setOffering] = useState<OfferingDetail | null>(null);
  const [validations, setValidations] = useState<OfferingValidationItem[]>([]);
  const [selected, setSelected] = useState<OfferingValidationItem | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [off, vals] = await Promise.all([
        fetchOfferingDetail(id),
        fetchOfferingValidations(id),
      ]);
      setOffering(off);
      setValidations(vals);
      if (vals.length > 0) setSelected(vals[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleValidate = async (mode: "full" | "quick") => {
    if (!id) return;
    setRunning(true);
    setError(null);
    try {
      const result = await triggerOfferingValidation(id, mode);
      setSelected(result);
      // Reload validations list
      const vals = await fetchOfferingValidations(id);
      setValidations(vals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setRunning(false);
    }
  };

  if (error && !offering) return <div className="p-8 text-destructive">{error}</div>;
  if (!offering) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Link to={`/shaping/offering/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-bold">{offering.title}</h1>
          <Badge variant="outline">{PURPOSE_LABELS[offering.purpose] ?? offering.purpose}</Badge>
          <Badge>{offering.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Link to={`/shaping/offering/${id}/edit`}>
            <Button size="sm" variant="outline">
              <FileText className="size-4 mr-1" /> 에디터
            </Button>
          </Link>
          <Link to={`/shaping/offering/${id}/validate`}>
            <Button size="sm" variant="default">
              <Shield className="size-4 mr-1" /> 검증
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={() => handleValidate("full")} disabled={running}>
            <Play className="size-4 mr-1" /> {running ? "검증 실행 중..." : "검증 시작 (Full)"}
          </Button>
          <Button variant="outline" onClick={() => handleValidate("quick")} disabled={running}>
            <Play className="size-4 mr-1" /> 검증 시작 (Quick)
          </Button>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        {/* Score overview */}
        {selected && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <ScoreBar
                label="종합 점수 (Overall)"
                score={selected.overallScore}
                status={selected.status}
              />
              <ScoreBar
                label="GAN 점수"
                score={selected.ganScore}
              />
            </div>

            {/* GAN Panel */}
            <GanPanel ganFeedback={selected.ganFeedback} />

            {/* Six Hats */}
            <SixHatsGrid sixhatsSummary={selected.sixhatsSummary} />

            {/* Expert Reviews */}
            <ExpertCards expertSummary={selected.expertSummary} />
          </>
        )}

        {/* Validation History */}
        <div>
          <h3 className="text-sm font-semibold mb-3">검증 히스토리</h3>
          <ValidationHistory
            validations={validations}
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
          />
        </div>
      </div>
    </div>
  );
}
