"use client";

/**
 * F439 — 아이템 상세 허브 (3탭: 기본정보/발굴분석/형상화)
 * F440 — 사업기획서 생성 + 열람
 * F447 — 파이프라인 상태 추적 스테퍼
 * F448 — 단계 간 자동 전환 CTA
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileBarChart, Loader2 } from "lucide-react";
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
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DiscoveryCriteriaPanel from "@/components/feature/discovery/DiscoveryCriteriaPanel";
import AnalysisStepper from "@/components/feature/discovery/AnalysisStepper";
import ShapingPipeline from "@/components/feature/discovery/ShapingPipeline";
import BusinessPlanViewer from "@/components/feature/discovery/BusinessPlanViewer";
import PipelineProgressStepper from "@/components/feature/discovery/PipelineProgressStepper";
import PipelineTransitionCTA from "@/components/feature/discovery/PipelineTransitionCTA";

const TYPE_LABELS: Record<string, string> = {
  I: "아이디어형", M: "시장·타겟형", P: "고객문제형", T: "기술형", S: "서비스형",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "대기", analyzing: "분석 중", analyzed: "분석 완료", shaping: "형상화 중", done: "완료",
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

  async function handleGenerateBusinessPlan() {
    if (!id) return;
    setGeneratingPlan(true);
    setPlanError(null);
    try {
      await generateBusinessPlan(id);
      // 생성 완료 후 기획서 + 아티팩트 다시 로드
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

  if (loading) return <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="size-5 animate-spin mr-2" />로딩 중...</div>;
  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!item) return null;

  const statusLabel = STATUS_LABELS[item.status] ?? item.status;

  return (
    <div className="space-y-6 pb-12">
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
                item.status === "analyzed" || item.status === "done"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : item.status === "analyzing"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
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

      {/* 3탭 허브 */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본정보</TabsTrigger>
          <TabsTrigger value="analysis">발굴분석</TabsTrigger>
          <TabsTrigger value="shaping">형상화</TabsTrigger>
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
          {/* F438 분석 스텝퍼 */}
          <div>
            <h2 className="text-sm font-semibold mb-3">발굴 분석 실행</h2>
            <AnalysisStepper bizItemId={item.id} onAnalysisComplete={loadData} />
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
                onGenerateBusinessPlan={() => void handleGenerateBusinessPlan()}
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

          {/* 기획서 열람 (F440) */}
          {plan && !generatingPlan && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">사업기획서</h2>
                <Button variant="outline" size="sm" onClick={() => void handleGenerateBusinessPlan()} disabled={generatingPlan}>
                  재생성
                </Button>
              </div>
              <BusinessPlanViewer plan={plan} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
