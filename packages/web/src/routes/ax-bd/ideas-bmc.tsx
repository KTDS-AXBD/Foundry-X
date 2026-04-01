"use client";

/**
 * Sprint 100: F269 — 아이디어·BMC 통합 페이지
 * 기존 /ax-bd/ideas + /ax-bd/bmc를 탭으로 통합
 */
import { useSearchParams } from "react-router-dom";
import IdeaListPage from "@/components/feature/ax-bd/IdeaListPage";
import BmcListPage from "@/components/feature/ax-bd/BmcListPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "ideas";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold">아이디어 · BMC</h1>
        <p className="text-sm text-muted-foreground">
          사업 아이디어와 비즈니스 모델 캔버스를 관리해요.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="ideas">아이디어</TabsTrigger>
          <TabsTrigger value="bmc">BMC</TabsTrigger>
        </TabsList>

        <TabsContent value="ideas">
          <IdeaListPage />
        </TabsContent>

        <TabsContent value="bmc">
          <BmcListPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
