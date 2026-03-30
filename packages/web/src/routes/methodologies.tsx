"use client";

import { useState } from "react";
import MethodologyListPanel from "@/components/feature/MethodologyListPanel";
import MethodologyDetailPanel from "@/components/feature/MethodologyDetailPanel";
import MethodologyProgressDash from "@/components/feature/MethodologyProgressDash";

export function Component() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold">방법론 관리</h1>
        <p className="mt-1 text-muted-foreground">
          등록된 분석 방법론을 관리하고, 아이템별 적용 현황을 확인해요.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <MethodologyListPanel onSelect={setSelectedId} selectedId={selectedId} />
        {selectedId && <MethodologyDetailPanel methodologyId={selectedId} />}
      </div>

      <MethodologyProgressDash items={[]} />
    </div>
  );
}
