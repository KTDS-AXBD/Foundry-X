"use client";

/**
 * F327 — 제품화 통합 페이지
 * 2탭: MVP / PoC
 * URL: /product?tab=mvp|poc
 */
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TestTubes } from "lucide-react";

import { Component as MvpTracking } from "@/routes/mvp-tracking";
import { Component as ProductPoc } from "@/routes/product-poc";

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "mvp";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">제품화</h1>
        <p className="text-muted-foreground">MVP · PoC 추적 관리</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="mvp">
            <Target className="mr-2 size-4" /> MVP
          </TabsTrigger>
          <TabsTrigger value="poc">
            <TestTubes className="mr-2 size-4" /> PoC
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mvp">
          <MvpTracking />
        </TabsContent>

        <TabsContent value="poc">
          <ProductPoc />
        </TabsContent>
      </Tabs>
    </div>
  );
}
