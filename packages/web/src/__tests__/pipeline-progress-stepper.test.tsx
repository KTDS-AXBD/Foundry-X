/**
 * F447 — PipelineProgressStepper 단위 테스트
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// jsdom 환경에서 React 컴포넌트 테스트
import { renderToString } from "react-dom/server";
import PipelineProgressStepper from "@/components/feature/discovery/PipelineProgressStepper";
import type { PipelineItemDetail } from "@/lib/api-client";

function makeDetail(stage: string, history: Array<{ stage: string; enteredAt: string }>): PipelineItemDetail {
  return {
    id: "item-1",
    title: "Test Item",
    currentStage: stage,
    stageEnteredAt: new Date().toISOString(),
    stageHistory: history.map((h, i) => ({
      id: `h-${i}`,
      bizItemId: "item-1",
      stage: h.stage,
      enteredAt: h.enteredAt,
      exitedAt: null,
      enteredBy: "user-1",
      notes: null,
    })),
  };
}

describe("PipelineProgressStepper", () => {
  it("DISCOVERY 단계에서 4단계 라벨 모두 렌더링", () => {
    const detail = makeDetail("DISCOVERY", [{ stage: "DISCOVERY", enteredAt: "2026-04-01T00:00:00Z" }]);
    const html = renderToString(<PipelineProgressStepper detail={detail} />);
    expect(html).toContain("발굴");
    expect(html).toContain("형상화");
    expect(html).toContain("Offering");
    expect(html).toContain("MVP");
  });

  it("FORMALIZATION 단계에서 발굴 완료 표시", () => {
    const detail = makeDetail("FORMALIZATION", [
      { stage: "DISCOVERY", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-04-08T00:00:00Z" },
    ]);
    const html = renderToString(<PipelineProgressStepper detail={detail} />);
    // 발굴 단계 진입 날짜 표시
    expect(html).toContain("3월");
    // 파이프라인 진행률 레이블
    expect(html).toContain("파이프라인 진행률");
  });

  it("MVP 단계에서 모든 이전 단계 완료 처리", () => {
    const detail = makeDetail("MVP", [
      { stage: "DISCOVERY", enteredAt: "2026-02-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-02-15T00:00:00Z" },
      { stage: "OFFERING", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "MVP", enteredAt: "2026-04-01T00:00:00Z" },
    ]);
    const html = renderToString(<PipelineProgressStepper detail={detail} />);
    expect(html).toContain("파이프라인 진행률");
  });

  it("F484: 현재 단계에 animate-pulse 클래스 적용", () => {
    const detail = makeDetail("FORMALIZATION", [
      { stage: "DISCOVERY", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-04-08T00:00:00Z" },
    ]);
    const html = renderToString(<PipelineProgressStepper detail={detail} />);
    expect(html).toContain("animate-pulse");
  });

  it("F484: 상태 라벨 — 완료/진행 중 표시", () => {
    const detail = makeDetail("FORMALIZATION", [
      { stage: "DISCOVERY", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-04-08T00:00:00Z" },
    ]);
    const html = renderToString(<PipelineProgressStepper detail={detail} />);
    expect(html).toContain("완료");
    expect(html).toContain("진행 중");
  });

  it("F484: 진행률 퍼센트 표시", () => {
    const detail = makeDetail("OFFERING", [
      { stage: "DISCOVERY", enteredAt: "2026-02-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "OFFERING", enteredAt: "2026-04-01T00:00:00Z" },
    ]);
    const html = renderToString(<PipelineProgressStepper detail={detail} />);
    // OFFERING is index 2 of 4 → (2+1)/4 = 75%
    expect(html).toContain("75% 진행");
  });
});
