"use client";

/**
 * Sprint 156+157: F346~F350 — 9탭 발굴 완료 리포트 + 팀 검토 + 공유/PDF
 * URL: /discovery/items/:id/report?tab=2-1
 */
import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchDiscoveryReport, type DiscoveryReportData } from "@/lib/api-client";

// Sprint 156: 선 구현 4탭
const ReferenceAnalysisTab = lazy(() => import("@/components/feature/discovery/report/tabs/ReferenceAnalysisTab"));
const MarketValidationTab = lazy(() => import("@/components/feature/discovery/report/tabs/MarketValidationTab"));
const CompetitiveLandscapeTab = lazy(() => import("@/components/feature/discovery/report/tabs/CompetitiveLandscapeTab"));
const OpportunityIdeationTab = lazy(() => import("@/components/feature/discovery/report/tabs/OpportunityIdeationTab"));
// Sprint 157: 나머지 5탭
const OpportunityScoringTab = lazy(() => import("@/components/feature/discovery/report/tabs/OpportunityScoringTab"));
const CustomerPersonaTab = lazy(() => import("@/components/feature/discovery/report/tabs/CustomerPersonaTab"));
const BusinessModelTab = lazy(() => import("@/components/feature/discovery/report/tabs/BusinessModelTab"));
const PackagingTab = lazy(() => import("@/components/feature/discovery/report/tabs/PackagingTab"));
const PersonaEvalResultTab = lazy(() => import("@/components/feature/discovery/report/tabs/PersonaEvalResultTab"));
// Sprint 157: 팀 검토 + 공유/PDF
const TeamReviewPanel = lazy(() => import("@/components/feature/discovery/report/TeamReviewPanel"));
const ShareReportButton = lazy(() => import("@/components/feature/discovery/report/ShareReportButton"));
const ExportPdfButton = lazy(() => import("@/components/feature/discovery/report/ExportPdfButton"));

const TYPE_LABELS: Record<string, string> = {
  I: "아이디어형", M: "시장·타겟형", P: "고객문제형", T: "기술형", S: "서비스형",
};

const TAB_CONFIG = [
  { id: "2-1", label: "레퍼런스 분석", color: "var(--discovery-mint)" },
  { id: "2-2", label: "시장 검증", color: "var(--discovery-mint)" },
  { id: "2-3", label: "경쟁 구도", color: "var(--discovery-blue)" },
  { id: "2-4", label: "기회 도출", color: "var(--discovery-blue)" },
  { id: "2-5", label: "기회 선정", color: "var(--discovery-amber)" },
  { id: "2-6", label: "고객 페르소나", color: "var(--discovery-amber)" },
  { id: "2-7", label: "비즈니스 모델", color: "var(--discovery-amber)" },
  { id: "2-8", label: "패키징", color: "var(--discovery-red)" },
  { id: "2-9", label: "페르소나 평가", color: "var(--discovery-purple)" },
] as const;

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <p className="text-sm">탭 로딩 중...</p>
    </div>
  );
}

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "2-1";

  const [report, setReport] = useState<DiscoveryReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchDiscoveryReport(id)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "리포트 로딩 실패"));
  }, [id]);

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!report) return <div className="p-8 text-muted-foreground">리포트 로딩 중...</div>;

  // F494: bd_artifacts 비어있음 감지 — AI 분석이 실제 실행되지 않은 상태
  const hasAnyTabData = Object.values(report.tabs).some((t) => t != null);
  const isEmptyReport = report.completedStages.length === 0 && !hasAnyTabData;

  return (
    <div className="space-y-6 p-6" data-report-root>
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          to={`/discovery/items/${id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold">{report.title}</h1>
        {report.type && (
          <Badge variant="outline">
            Type {report.type} — {TYPE_LABELS[report.type] ?? ""}
          </Badge>
        )}
        <Badge variant="secondary">
          {report.overallProgress}% 완료
        </Badge>
      </div>

      {/* F494: 빈 리포트 fallback — bd_artifacts가 없으면 재실행 유도 */}
      {isEmptyReport && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3" data-testid="empty-report-fallback">
          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div>
              <p className="font-medium text-amber-900">분석 결과가 비어 있어요</p>
              <p className="text-sm text-amber-800 mt-0.5">
                이 아이템은 발굴 상태이지만 AI 분석 산출물(bd_artifacts)이 없어요. 발굴 단계를 재실행해야 리포트를 볼 수 있어요.
              </p>
            </div>
            <Link
              to={`/discovery/items/${id}`}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              발굴 단계 다시 실행하기
            </Link>
          </div>
        </div>
      )}

      {/* 9탭 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList className="flex-wrap h-auto gap-1">
          {TAB_CONFIG.map((tab) => {
            const isCompleted = report.completedStages.includes(tab.id);
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs"
                style={{
                  borderBottomColor: activeTab === tab.id ? tab.color : "transparent",
                  borderBottomWidth: 2,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full mr-1 inline-block"
                  style={{ backgroundColor: isCompleted ? tab.color : "var(--muted)" }}
                />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <Suspense fallback={<TabLoading />}>
          <TabsContent value="2-1">
            <ReferenceAnalysisTab data={report.tabs["2-1"]} />
          </TabsContent>
          <TabsContent value="2-2">
            <MarketValidationTab data={report.tabs["2-2"]} />
          </TabsContent>
          <TabsContent value="2-3">
            <CompetitiveLandscapeTab data={report.tabs["2-3"]} />
          </TabsContent>
          <TabsContent value="2-4">
            <OpportunityIdeationTab data={report.tabs["2-4"]} />
          </TabsContent>

          {/* Sprint 157: 나머지 5탭 */}
          <TabsContent value="2-5">
            <OpportunityScoringTab data={report.tabs["2-5"]} />
          </TabsContent>
          <TabsContent value="2-6">
            <CustomerPersonaTab data={report.tabs["2-6"]} />
          </TabsContent>
          <TabsContent value="2-7">
            <BusinessModelTab data={report.tabs["2-7"]} />
          </TabsContent>
          <TabsContent value="2-8">
            <PackagingTab data={report.tabs["2-8"]} />
          </TabsContent>
          <TabsContent value="2-9">
            <PersonaEvalResultTab data={report.tabs["2-9"]} />
          </TabsContent>
        </Suspense>
      </Tabs>

      {/* Sprint 157: 팀 검토 & Handoff */}
      <Suspense fallback={<TabLoading />}>
        <TeamReviewPanel itemId={id!} />
      </Suspense>

      {/* Sprint 157: 공유/PDF 버튼 (하단 액션) */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Suspense fallback={null}>
          <ShareReportButton itemId={id!} title={report.title} />
          <ExportPdfButton />
        </Suspense>
      </div>
    </div>
  );
}
