"use client";

/**
 * F480 — Discovery Stage 전체 스텝퍼 (AnalysisStepper 대체)
 * F485 — 완료 단계 결과 표시 + HITL 피드백 재실행
 * 11단계 HITL 스텝퍼: 2-0~2-10, v82 유형별 강도 반영
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, Play, MessageSquare, RotateCcw, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDiscoveryProgress,
  runDiscoveryStage,
  confirmDiscoveryStage,
  analyzeStartingPoint,
  classifyBizItem,
  evaluateBizItem,
  getStageResult,
  updateStageResult,
  type DiscoveryProgress,
  type StageRunResult,
  type StageResultResponse,
} from "@/lib/api-client";

interface DiscoveryStageStepperProps {
  bizItemId: string;
  discoveryType: string | null;
  onStageComplete?: (stage: string) => void;
  onAllComplete?: () => void;
}

const INTENSITY_LABELS: Record<string, { label: string; color: string }> = {
  core: { label: "심층", color: "bg-red-100 text-red-700" },
  normal: { label: "보통", color: "bg-blue-100 text-blue-700" },
  light: { label: "간소", color: "bg-green-100 text-green-700" },
};

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  go: { label: "Go", color: "bg-green-100 text-green-700" },
  pivot: { label: "Pivot", color: "bg-amber-100 text-amber-700" },
  drop: { label: "Stop", color: "bg-red-100 text-red-700" },
};

// 2-0은 기존 starting-point + classify 통합, 2-9는 기존 evaluate 사용
const LEGACY_STAGES = new Set(["2-0", "2-9"]);

export default function DiscoveryStageStepper({
  bizItemId,
  discoveryType,
  onStageComplete,
  onAllComplete,
}: DiscoveryStageStepperProps) {
  const [progress, setProgress] = useState<DiscoveryProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningStage, setRunningStage] = useState<string | null>(null);
  const [stageResult, setStageResult] = useState<StageRunResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // F485: 완료 단계 결과 캐시 + 재실행 모드
  const [completedResults, setCompletedResults] = useState<Record<string, StageResultResponse>>({});
  const [loadingResult, setLoadingResult] = useState<string | null>(null);
  const [rerunMode, setRerunMode] = useState<string | null>(null);
  // 재클릭 방어: useState 업데이트 전에도 즉시 차단되도록 ref로 가드
  const runLockRef = useRef<Set<string>>(new Set());
  // 결과 수동 편집 모드
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editConfidence, setEditConfidence] = useState(70);
  const [savingEdit, setSavingEdit] = useState(false);

  const loadProgress = useCallback(async () => {
    try {
      const data = await getDiscoveryProgress(bizItemId);
      setProgress(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "진행률 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [bizItemId]);

  useEffect(() => { void loadProgress(); }, [loadProgress]);

  // F485: 완료 단계 결과 조회
  async function handleLoadResult(stage: string) {
    if (completedResults[stage]) {
      setExpanded(expanded === stage ? null : stage);
      return;
    }

    setLoadingResult(stage);
    try {
      const result = await getStageResult(bizItemId, stage);
      setCompletedResults((prev) => ({ ...prev, [stage]: result }));
      setExpanded(stage);
    } catch {
      // 결과가 없으면 (legacy 단계 등) 무시
      setExpanded(expanded === stage ? null : stage);
    } finally {
      setLoadingResult(null);
    }
  }

  async function handleRunStage(stage: string) {
    // 재클릭 방어: ref 기반 즉시 차단 (setState 반영 전 이중 클릭 방지)
    if (runLockRef.current.has(stage) || runningStage) return;
    runLockRef.current.add(stage);

    setRunningStage(stage);
    setError(null);
    setStageResult(null);
    setRerunMode(null);

    try {
      if (stage === "2-0") {
        // 각 호출을 독립적으로 catch — 한쪽이 404/기타 에러로 실패해도
        // 다른 쪽은 계속 진행 (idempotent 백엔드 보장 하에 안전)
        try {
          await analyzeStartingPoint(bizItemId);
        } catch (spErr) {
          console.warn("analyzeStartingPoint failed, continuing", spErr);
        }
        try {
          await classifyBizItem(bizItemId);
        } catch (clErr) {
          console.warn("classifyBizItem failed", clErr);
        }
        await loadProgress();
        onStageComplete?.(stage);
        setExpanded(null);
      } else if (stage === "2-9") {
        await evaluateBizItem(bizItemId);
        await loadProgress();
        onStageComplete?.(stage);
        setExpanded(null);
      } else {
        const result = await runDiscoveryStage(bizItemId, stage, feedback || undefined);
        setStageResult(result);
        setExpanded(stage);
        // 재실행이었으면 캐시 무효화
        setCompletedResults((prev) => {
          const next = { ...prev };
          delete next[stage];
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `${stage} 실행 실패`);
    } finally {
      setRunningStage(null);
      runLockRef.current.delete(stage);
    }
  }

  function handleStartEdit(stage: string, current: StageResultResponse) {
    setEditingStage(stage);
    setEditSummary(current.result.summary);
    setEditDetails(current.result.details);
    setEditConfidence(current.result.confidence);
    setRerunMode(null);
  }

  function handleCancelEdit() {
    setEditingStage(null);
    setEditSummary("");
    setEditDetails("");
    setEditConfidence(70);
  }

  async function handleSaveEdit(stage: string) {
    if (!editSummary.trim() || !editDetails.trim()) {
      setError("요약과 상세 내용은 비워둘 수 없어요.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await updateStageResult(bizItemId, stage, {
        summary: editSummary.trim(),
        details: editDetails.trim(),
        confidence: editConfidence,
      });
      setCompletedResults((prev) => ({ ...prev, [stage]: updated }));
      setEditingStage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirm(stage: string, answer: "go" | "pivot" | "stop") {
    setRunningStage(stage);
    setError(null);
    try {
      await confirmDiscoveryStage(bizItemId, stage, answer, feedback || undefined);
      setStageResult(null);
      setFeedback("");
      setExpanded(null);
      setRerunMode(null);
      // 캐시 무효화 (새 결과가 저장됨)
      setCompletedResults((prev) => {
        const next = { ...prev };
        delete next[stage];
        return next;
      });
      await loadProgress();
      onStageComplete?.(stage);

      const updated = await getDiscoveryProgress(bizItemId);
      if (updated.completedCount === updated.totalCount) {
        onAllComplete?.();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "확인 실패");
    } finally {
      setRunningStage(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4">
        <Loader2 className="size-4 animate-spin" /> 진행률 로딩 중...
      </div>
    );
  }

  if (!progress) {
    return <div className="text-sm text-destructive p-4">{error ?? "진행률을 불러올 수 없어요."}</div>;
  }

  const isRunnable = (stage: string, status: string, idx: number): boolean => {
    if (status === "completed" || status === "skipped") return false;
    if (runningStage) return false;
    if (idx === 0) return true;
    const prevStatus = progress.stages[idx - 1]?.status;
    return prevStatus === "completed" || prevStatus === "skipped";
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">발굴 분석</h3>
          <Badge variant="outline">
            {progress.completedCount}/{progress.totalCount} 완료
          </Badge>
        </div>
        {discoveryType && (
          <Badge variant="secondary">{discoveryType}유형</Badge>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* 스테이지 목록 */}
      <div className="divide-y">
        {progress.stages.map((stage, idx) => {
          const canRun = isRunnable(stage.stage, stage.status, idx);
          const isExpanded = expanded === stage.stage;
          const isRunning = runningStage === stage.stage;
          const isLegacy = LEGACY_STAGES.has(stage.stage);
          const showResult = stageResult?.stage === stage.stage;
          const isCompleted = stage.status === "completed";
          const completedResult = completedResults[stage.stage];
          const isLoadingResult = loadingResult === stage.stage;
          const isRerunning = rerunMode === stage.stage;
          const isEditing = editingStage === stage.stage;

          return (
            <div key={stage.stage} className="p-4">
              {/* 스테이지 행 */}
              <div className="flex items-center gap-3">
                {/* 아이콘 */}
                {isCompleted ? (
                  <CheckCircle2 className="size-5 text-green-600 shrink-0" />
                ) : isRunning ? (
                  <Loader2 className="size-5 text-blue-600 animate-spin shrink-0" />
                ) : stage.status === "in_progress" ? (
                  <div className="size-5 rounded-full border-2 border-blue-600 bg-blue-100 shrink-0" />
                ) : (
                  <Circle className="size-5 text-muted-foreground shrink-0" />
                )}

                {/* 라벨 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isCompleted ? "text-muted-foreground" : ""}`}>
                      {stage.stage} {stage.stageName}
                    </span>
                    {isCompleted && (
                      <Badge variant="outline" className="text-xs bg-green-50">완료</Badge>
                    )}
                    {isLegacy && !isCompleted && (
                      <Badge variant="outline" className="text-xs">자동</Badge>
                    )}
                  </div>
                </div>

                {/* 액션 */}
                <div className="flex items-center gap-2 shrink-0">
                  {canRun && (
                    <Button
                      size="sm"
                      variant={isLegacy ? "default" : "outline"}
                      onClick={() => handleRunStage(stage.stage)}
                      disabled={isRunning}
                    >
                      {isRunning ? (
                        <><Loader2 className="size-3 animate-spin mr-1" /> 실행 중</>
                      ) : (
                        <><Play className="size-3 mr-1" /> 실행</>
                      )}
                    </Button>
                  )}
                  {/* F485: 완료 단계 펼쳐보기 */}
                  {isCompleted && !isLegacy && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleLoadResult(stage.stage)}
                      disabled={isLoadingResult}
                    >
                      {isLoadingResult ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </Button>
                  )}
                  {showResult && !isCompleted && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpanded(isExpanded ? null : stage.stage)}
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  )}
                </div>
              </div>

              {/* F485: 완료 단계 결과 표시 */}
              {isCompleted && isExpanded && completedResult && !isRerunning && !isEditing && (
                <div className="mt-3 ml-8 rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={INTENSITY_LABELS[completedResult.intensity]?.color ?? ""}>
                      {INTENSITY_LABELS[completedResult.intensity]?.label ?? completedResult.intensity}
                    </Badge>
                    {completedResult.viabilityDecision && (
                      <Badge className={DECISION_LABELS[completedResult.viabilityDecision]?.color ?? ""}>
                        {DECISION_LABELS[completedResult.viabilityDecision]?.label ?? completedResult.viabilityDecision}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      신뢰도: {completedResult.result.confidence}%
                    </span>
                  </div>
                  <p className="text-sm font-medium">{completedResult.result.summary}</p>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {completedResult.result.details}
                  </div>
                  {completedResult.feedback && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <span className="font-medium">피드백:</span> {completedResult.feedback}
                    </div>
                  )}
                  {/* 액션: 편집 + 피드백 재실행 */}
                  <div className="border-t pt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStartEdit(stage.stage, completedResult)}
                      disabled={!!runningStage}
                    >
                      <Pencil className="size-3 mr-1" /> 직접 편집
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRerunMode(stage.stage);
                        setFeedback("");
                      }}
                      disabled={!!runningStage}
                    >
                      <RotateCcw className="size-3 mr-1" /> 피드백 재실행
                    </Button>
                  </div>
                </div>
              )}

              {/* 결과 수동 편집 모드 */}
              {isCompleted && isExpanded && isEditing && (
                <div className="mt-3 ml-8 rounded-lg border-2 border-blue-300 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-blue-900">결과 직접 편집</p>
                    <span className="text-xs text-muted-foreground">변경 사항은 즉시 저장돼요</span>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">요약</label>
                    <input
                      type="text"
                      className="w-full p-2 text-sm border rounded-md bg-background"
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      placeholder="1~2문장 요약"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">상세 (마크다운)</label>
                    <textarea
                      className="w-full p-2 text-sm border rounded-md bg-background resize-y"
                      rows={10}
                      value={editDetails}
                      onChange={(e) => setEditDetails(e.target.value)}
                      placeholder="마크다운 상세 분석"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      신뢰도: {editConfidence}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                      value={editConfidence}
                      onChange={(e) => setEditConfidence(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(stage.stage)}
                      disabled={savingEdit || !editSummary.trim() || !editDetails.trim()}
                    >
                      {savingEdit ? (
                        <><Loader2 className="size-3 animate-spin mr-1" /> 저장 중</>
                      ) : (
                        <><Save className="size-3 mr-1" /> 저장</>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={savingEdit}>
                      <X className="size-3 mr-1" /> 취소
                    </Button>
                  </div>
                </div>
              )}

              {/* F485: 재실행 모드 — 피드백 입력 후 재실행 */}
              {isCompleted && isExpanded && isRerunning && (
                <div className="mt-3 ml-8 rounded-lg border bg-amber-50/50 p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-800">피드백을 입력하고 재실행하세요</p>
                  <textarea
                    className="w-full p-2 text-sm border rounded-md bg-background resize-none"
                    placeholder="개선할 점이나 추가로 분석할 내용을 입력하세요..."
                    rows={3}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRunStage(stage.stage)}
                      disabled={!!runningStage || !feedback.trim()}
                    >
                      {runningStage === stage.stage ? (
                        <><Loader2 className="size-3 animate-spin mr-1" /> 실행 중</>
                      ) : (
                        <><RotateCcw className="size-3 mr-1" /> 재실행</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRerunMode(null)}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}

              {/* 현재 실행한 결과 + HITL 패널 (기존) */}
              {showResult && isExpanded && stageResult && (
                <div className="mt-3 ml-8 rounded-lg border bg-muted/30 p-4 space-y-4">
                  {/* AI 분석 결과 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={INTENSITY_LABELS[stageResult.intensity]?.color ?? ""}>
                        {INTENSITY_LABELS[stageResult.intensity]?.label ?? stageResult.intensity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        신뢰도: {stageResult.result.confidence}%
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-1">{stageResult.result.summary}</p>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {stageResult.result.details}
                    </div>
                  </div>

                  {/* Viability Question */}
                  {stageResult.viabilityQuestion && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="size-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">사업성 체크</p>
                          <p className="text-sm text-amber-700 mt-1">{stageResult.viabilityQuestion}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commit Gate Questions (2-5) */}
                  {stageResult.commitGateQuestions && (
                    <div className="rounded-md bg-purple-50 border border-purple-200 p-3">
                      <p className="text-sm font-medium text-purple-800 mb-2">Commit Gate 질문</p>
                      <ul className="space-y-1">
                        {stageResult.commitGateQuestions.map((q, i) => (
                          <li key={i} className="text-sm text-purple-700">• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 피드백 + Go/Pivot/Stop */}
                  <div className="space-y-3">
                    <textarea
                      className="w-full p-2 text-sm border rounded-md bg-background resize-none"
                      placeholder="피드백을 입력하세요 (선택사항)..."
                      rows={2}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleConfirm(stageResult.stage, "go")}
                        disabled={!!runningStage}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Go
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfirm(stageResult.stage, "pivot")}
                        disabled={!!runningStage}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        Pivot
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfirm(stageResult.stage, "stop")}
                        disabled={!!runningStage}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Stop
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
