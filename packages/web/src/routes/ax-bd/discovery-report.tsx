"use client";

/**
 * Sprint 156: F346 — 9탭 발굴 완료 리포트 프레임
 * URL: /discovery/items/:id/report?tab=2-1
 */
import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { fetchDiscoveryReport, type DiscoveryReportData } from "@/lib/api-client";

const ReferenceAnalysisTab = lazy(() => import("@/components/feature/discovery/report/tabs/ReferenceAnalysisTab"));
const MarketValidationTab = lazy(() => import("@/components/feature/discovery/report/tabs/MarketValidationTab"));
const CompetitiveLandscapeTab = lazy(() => import("@/components/feature/discovery/report/tabs/CompetitiveLandscapeTab"));
const OpportunityIdeationTab = lazy(() => import("@/components/feature/discovery/report/tabs/OpportunityIdeationTab"));

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

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm mt-1">Sprint 157에서 구현 예정이에요</p>
    </div>
  );
}

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

  return (
    <div className="space-y-6 p-6">
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

          {/* Sprint 157 탭 — Coming Soon */}
          <TabsContent value="2-5"><ComingSoon label="기회 선정" /></TabsContent>
          <TabsContent value="2-6"><ComingSoon label="고객 페르소나" /></TabsContent>
          <TabsContent value="2-7"><ComingSoon label="비즈니스 모델" /></TabsContent>
          <TabsContent value="2-8"><ComingSoon label="패키징" /></TabsContent>
          <TabsContent value="2-9"><ComingSoon label="페르소나 평가" /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
