"use client";

/**
 * Sprint 94: F263 + F265 — Discovery 페이지 위저드 중심 재구성
 * 기존 나열형 → DiscoveryWizard 통합 + DiscoveryTour 자동 실행
 */
import DiscoveryWizard from "@/components/feature/discovery/DiscoveryWizard";
import DiscoveryTour from "@/components/feature/discovery/DiscoveryTour";

export function Component() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <DiscoveryWizard />
      <DiscoveryTour />
    </div>
  );
}
