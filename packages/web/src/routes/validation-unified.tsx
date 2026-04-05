"use client";

/**
 * F326 — 검증 통합 페이지
 * 4탭: 인터뷰·미팅 / 본부 검증 / 전사 검증 / 임원 검증
 * URL: /validation?tab=meetings|division|company|executive
 */
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Shield, Building2, Users } from "lucide-react";

import { Component as ValidationMeetings } from "@/routes/validation-meetings";
import { Component as ValidationDivision } from "@/routes/validation-division";
import { Component as ValidationCompany } from "@/routes/validation-company";

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "meetings";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">검증</h1>
        <p className="text-muted-foreground">
          본부 · 전사 · 임원 검증 + 인터뷰/미팅 관리
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="meetings">
            <CalendarDays className="mr-2 size-4" /> 인터뷰/미팅
          </TabsTrigger>
          <TabsTrigger value="division">
            <Shield className="mr-2 size-4" /> 본부 검증
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="mr-2 size-4" /> 전사 검증
          </TabsTrigger>
          <TabsTrigger value="executive">
            <Users className="mr-2 size-4" /> 임원 검증
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meetings">
          <ValidationMeetings />
        </TabsContent>

        <TabsContent value="division">
          <ValidationDivision />
        </TabsContent>

        <TabsContent value="company">
          <ValidationCompany />
        </TabsContent>

        <TabsContent value="executive">
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-3 size-8" />
            <p className="font-medium">임원 검증</p>
            <p className="text-sm">준비 중이에요</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
