"use client";

/**
 * F439 — 아이템 상세 허브 (3탭: 기본정보/발굴분석/형상화)
 * F440 — 사업기획서 생성 + 열람
 * F443 — 첨부 자료 탭 추가 (Sprint 214)
 * F444 — 사업기획서 편집기 + 버전 이력
 * F445 — 기획서 템플릿 선택
 * F447 — 파이프라인 상태 추적 스테퍼
 * F448 — 단계 간 자동 전환 CTA
 * F454 — 사업기획서 기반 PRD 자동 생성 (Sprint 220)
 * F455 — PRD 보강 인터뷰 (Sprint 220)
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileBarChart, Loader2, Pencil, History } from "lucide-react";
import LoadingSkeleton from "@/components/feature/discovery/LoadingSkeleton";
import {
  fetchBizItemDetail,
  fetchBdpLatest,
  generateBusinessPlan,
  getShapingArtifacts,
  getPipelineItemDetail,
  type BizItemDetail,
  type BdpVersion,
  type ShapingArtifacts,
  type PipelineItemDetail,
  type BusinessPlanResult,
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DiscoveryCriteriaPanel from "@/components/feature/discovery/DiscoveryCriteriaPanel";
import DiscoveryStageStepper from "@/components/feature/discovery/DiscoveryStageStepper";
import ShapingPipeline from "@/components/feature/discovery/ShapingPipeline";
import BusinessPlanViewer from "@/components/feature/discovery/BusinessPlanViewer";
import PipelineProgressStepper from "@/components/feature/discovery/PipelineProgressStepper";
import PipelineTransitionCTA from "@/components/feature/discovery/PipelineTransitionCTA";
import BusinessPlanEditor from "@/components/feature/discovery/BusinessPlanEditor";
import VersionHistoryPanel from "@/components/feature/discovery/VersionHistoryPanel";
import TemplateSelector, { type TemplateParams } from "@/components/feature/discovery/TemplateSelector";
import AttachedFilesPanel from "@/components/feature/discovery/AttachedFilesPanel";
import PrdFromBpPanel from "@/components/feature/discovery/PrdFromBpPanel";
import PrdInterviewPanel from "@/components/feature/discovery/PrdInterviewPanel";

const TYPE_LABELS: Record<string, string> = {
  I: "아이디어형", M: "시장·타겟형", P: "고객문제형", T: "기술형", S: "서비스형",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "대기", classifying: "분류 중", classified: "분류 완료",
  analyzing: "분석 중", analyzed: "분석 완료",
  evaluating: "평가 중", evaluated: "평가 완료",
  shaping: "형상화 중", done: "완료",
};

export function Component() {
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<BizItemDetail | null>(null);
  const [plan, setPlan] = useState<BdpVersion | null>(null);
  const [artifacts, setArtifacts] = useState<ShapingArtifacts | null>(null);
  const [pipelineDetail, setPipelineDetail] = useState<PipelineItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  // F444: 편집기 상태
  const [editMode, setEditMode] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  // F445: 템플릿 선택 상태
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  // F454/F455: PRD 인터뷰 상태
  const [prdInterviewPrdId, setPrdInterviewPrdId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [itemData, artifactsData, pipelineData] = await Promise.all([
        fetchBizItemDetail(id),
        getShapingArtifacts(id).catch(() => ({
          businessPlan: null, offering: null, prd: null, prototype: null,
        } as ShapingArtifacts)),
        getPipelineItemDetail(id).catch(() => null),
      ]);
      setItem(itemData);
      setArtifacts(artifactsData);
      setPipelineDetail(pipelineData);
      // 기획서가 있으면 상세 조회
      if (artifactsData.businessPlan) {
        fetchBdpLatest(id).then(setPlan).catch(() => null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadData(); }, [loadData]);

  // F450: Escape 키로 패널 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showVersionPanel) setShowVersionPanel(false);
        if (showTemplateSelector) setShowTemplateSelector(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showVersionPanel, showTemplateSelector]);

  async function handleGenerateBusinessPlan(templateParams?: TemplateParams) {
    if (!id) return;
    setGeneratingPlan(true);
    setPlanError(null);
    setShowTemplateSelector(false);
    try {
      await generateBusinessPlan(id, templateParams);
      const [newPlan, newArtifacts] = await Promise.all([
        fetchBdpLatest(id),
        getShapingArtifacts(id),
      ]);
      setPlan(newPlan);
      setArtifacts(newArtifacts);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "기획서 생성에 실패했어요.");
    } finally {
      setGeneratingPlan(false);
    }
  }

  function handleEditorSaved(newDraft: BusinessPlanResult) {
    // 저장된 버전을 BdpVersion 형태로 변환하여 뷰어에 반영
    setPlan({
      id: newDraft.id,
      bizItemId: newDraft.bizItemId,
      versionNum: newDraft.versionNum,
      content: newDraft.content,
      isFinal: false,
      createdBy: "",
      createdAt: newDraft.createdAt,
    });
    setEditMode(false);
  }

  if (loading) return <div className="p-6"><LoadingSkeleton variant="analysis-result" /></div>;
  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!item) return null;

  const statusLabel = STATUS_LABELS[item.status] ?? item.status;

  return (
    <div data-discovery-page className="space-y-6 pb-12">
      {/* 헤더 */}
      <div className="flex items-start gap-3">
        <Link to="/discovery" className="text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold truncate">{item.title}</h1>
            {item.discoveryType && (
              <Badge variant="outline">
                {item.discoveryType} — {TYPE_LABELS[item.discoveryType] ?? item.discoveryType}
              </Badge>
            )}
            <Badge
              className={
                item.status === "analyzed" || item.status === "evaluated" || item.status === "done"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : item.status === "classified"
                    ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                    : item.status === "analyzing" || item.status === "classifying" || item.status === "evaluating"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : item.status === "shaping"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
              }
            >
              {statusLabel}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            등록일: {new Date(item.createdAt).toLocaleDateString("ko")}
          </p>
        </div>
      </div>

      {/* F447: 파이프라인 진행률 스테퍼 */}
      {pipelineDetail && <PipelineProgressStepper detail={pipelineDetail} />}

      {/* 4탭 허브 (F443: "첨부 자료" 탭 추가) */}
      <Tabs defaultValue="info">
        <TabsList aria-label="아이템 상세 탭">
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="analysis">발굴분석</TabsTrigger>
          <TabsTrigger value="shaping">형상화</TabsTrigger>
          <TabsTrigger value="files">첨부 자료</TabsTrigger>
        </TabsList>

        {/* ── 탭 1: 기본정보 ── */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">제목</p>
              <p className="font-medium">{item.title}</p>
            </div>
            {item.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">설명</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">유형</p>
                <p className="text-sm font-medium">
                  {item.discoveryType
                    ? `${item.discoveryType} (${TYPE_LABELS[item.discoveryType] ?? item.discoveryType})`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">출처</p>
                <p className="text-sm font-medium">{item.source}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ID</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{item.id}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── 탭 2: 발굴분석 ── */}
        <TabsContent value="analysis" className="mt-4 space-y-6">
          {/* F480 Discovery Stage 전체 스텝퍼 */}
          <div>
            <h2 className="text-sm font-semibold mb-3">발굴 분석 실행</h2>
            <DiscoveryStageStepper
              bizItemId={item.id}
              discoveryType={item.discoveryType ?? null}
              onStageComplete={loadData}
              onAllComplete={loadData}
            />
          </div>

          {/* F437 9기준 체크리스트 */}
          <div>
            <h2 className="text-sm font-semibold mb-3">발굴 9기준 체크리스트</h2>
            <DiscoveryCriteriaPanel bizItemId={item.id} />
          </div>

          {/* F448: 발굴 완료 → 형상화 자동 전환 CTA */}
          {pipelineDetail && (
            <PipelineTransitionCTA
              bizItemId={item.id}
              bizStatus={item.status}
              currentStage={pipelineDetail.currentStage}
              hasBusinessPlan={!!(artifacts?.businessPlan)}
              onTransitionComplete={loadData}
            />
          )}

          {/* 리포트 링크 */}
          <Link
            to={`/discovery/items/${item.id}/report`}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <FileBarChart className="size-4" />
            발굴 완료 리포트 보기
          </Link>
        </TabsContent>

        {/* ── 탭 3: 형상화 ── */}
        <TabsContent value="shaping" className="mt-4 space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-3">형상화 파이프라인</h2>
            {planError && (
              <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3 mb-3">{planError}</p>
            )}
            {artifacts && (
              <ShapingPipeline
                bizItemId={item.id}
                artifacts={artifacts}
                onGenerateBusinessPlan={() => setShowTemplateSelector(true)}
                generatingPlan={generatingPlan}
              />
            )}
          </div>

          {/* 기획서 생성 중 로딩 */}
          {generatingPlan && (
            <div className="flex items-center gap-3 rounded-lg border bg-blue-50 p-4 text-blue-700">
              <Loader2 className="size-5 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium">AI가 사업기획서를 생성하고 있어요...</p>
                <p className="text-xs mt-0.5">발굴 분석 결과를 바탕으로 기획서를 작성해요. 잠시 기다려주세요.</p>
              </div>
            </div>
          )}

          {/* 기획서 열람/편집 (F440 + F444) */}
          {plan && !generatingPlan && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">사업기획서</h2>
                <div className="flex gap-2">
                  {!editMode && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVersionPanel(!showVersionPanel)}
                        aria-label="버전 이력"
                      >
                        <History className="size-4 mr-1.5" />
                        버전 이력
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                        aria-label="편집"
                      >
                        <Pencil className="size-4 mr-1.5" />
                        편집
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTemplateSelector(true)}
                        disabled={generatingPlan}
                        aria-label="사업기획서 재생성"
                      >
                        재생성
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 버전 이력 패널 */}
              {showVersionPanel && !editMode && (
                <div className="mb-4">
                  <VersionHistoryPanel bizItemId={item.id} currentVersion={plan.versionNum} />
                </div>
              )}

              {/* 편집기 (F444) */}
              {editMode ? (
                <BusinessPlanEditor
                  bizItemId={item.id}
                  onSaved={handleEditorSaved}
                  onCancel={() => setEditMode(false)}
                />
              ) : (
                <BusinessPlanViewer plan={plan} bizItemId={item.id} />
              )}
            </div>
          )}

          {/* 템플릿 선택 모달 (F445) */}
          {showTemplateSelector && (
            <TemplateSelector
              onSelect={(params) => void handleGenerateBusinessPlan(params)}
              onCancel={() => setShowTemplateSelector(false)}
            />
          )}

          {/* F454: 사업기획서 기반 PRD 자동 생성 */}
          <PrdFromBpPanel
            bizItemId={item.id}
            hasBp={!!plan}
            onPrdGenerated={(prd) => setPrdInterviewPrdId(prd.id)}
            onStartInterview={(prdId) => setPrdInterviewPrdId(prdId)}
          />

          {/* F455: PRD 보강 인터뷰 */}
          {prdInterviewPrdId && (
            <PrdInterviewPanel
              bizItemId={item.id}
              prdId={prdInterviewPrdId}
              onComplete={() => setPrdInterviewPrdId(null)}
            />
          )}
        </TabsContent>

        {/* ── 탭 4: 첨부 자료 (F443) ── */}
        <TabsContent value="files" className="mt-4">
          <div className="rounded-lg border bg-card p-5">
            <AttachedFilesPanel bizItemId={id!} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
