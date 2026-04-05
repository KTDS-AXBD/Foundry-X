"use client";

/**
 * F324 — 발굴 통합 페이지
 * 3탭: 대시보드 / 프로세스 / BMC
 * URL: /discovery?tab=dashboard|process|bmc
 */
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Map, Lightbulb } from "lucide-react";

// 기존 라우트 컴포넌트를 탭 콘텐츠로 재사용
import { Component as DiscoverDashboard } from "@/routes/ax-bd/discover-dashboard";
import { Component as DiscoveryProcess } from "@/routes/ax-bd/discovery";
import { Component as IdeasBmc } from "@/routes/ax-bd/ideas-bmc";

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "dashboard";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">발굴</h1>
        <p className="text-muted-foreground">
          사업 아이템 발굴 · 분석 · 평가
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 size-4" /> 대시보드
          </TabsTrigger>
          <TabsTrigger value="process">
            <Map className="mr-2 size-4" /> 프로세스
          </TabsTrigger>
          <TabsTrigger value="bmc">
            <Lightbulb className="mr-2 size-4" /> BMC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DiscoverDashboard />
        </TabsContent>

        <TabsContent value="process">
          <DiscoveryProcess />
        </TabsContent>

        <TabsContent value="bmc">
          <IdeasBmc />
        </TabsContent>
      </Tabs>
    </div>
  );
}
