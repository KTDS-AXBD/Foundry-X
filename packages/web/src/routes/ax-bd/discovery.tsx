"use client";

/**
 * Sprint 94: F263 + F265 — Discovery 페이지 위저드 중심 재구성
 * Sprint 100: F269 — 프로세스 가이드 탭 통합
 */
import { useSearchParams } from "react-router-dom";
import DiscoveryWizard from "@/components/feature/discovery/DiscoveryWizard";
import DiscoveryTour from "@/components/feature/discovery/DiscoveryTour";
import ProcessGuide from "@/components/feature/ax-bd/ProcessGuide";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "wizard";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="wizard">Discovery 위저드</TabsTrigger>
          <TabsTrigger value="guide">프로세스 가이드</TabsTrigger>
        </TabsList>

        <TabsContent value="wizard" className="space-y-8">
          <DiscoveryWizard />
          <DiscoveryTour />
        </TabsContent>

        <TabsContent value="guide">
          <ProcessGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}
