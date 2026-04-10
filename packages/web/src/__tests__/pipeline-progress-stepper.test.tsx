/**
 * F447 — PipelineProgressStepper 단위 테스트
 * F495 — 발굴/형상화 2-stage + 세부 진행률로 갱신
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import PipelineProgressStepper from "@/components/feature/discovery/PipelineProgressStepper";
import type { PipelineItemDetail, ShapingArtifacts } from "@/lib/api-client";

function makeDetail(
  stage: string,
  history: Array<{ stage: string; enteredAt: string }>,
): PipelineItemDetail {
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

function makeArtifacts(done: number): ShapingArtifacts {
  const all: ShapingArtifacts = {
    businessPlan: { versionNum: 1, createdAt: "2026-04-01" },
    offering: { id: "off-1", status: "draft" },
    prd: { versionNum: 1 },
    prototype: { id: "proto-1" },
  };
  const keys: (keyof ShapingArtifacts)[] = ["businessPlan", "offering", "prd", "prototype"];
  const result: ShapingArtifacts = { businessPlan: null, offering: null, prd: null, prototype: null };
  for (let i = 0; i < done && i < keys.length; i++) {
    (result as Record<keyof ShapingArtifacts, unknown>)[keys[i]!] = all[keys[i]!];
  }
  return result;
}

describe("PipelineProgressStepper (F495)", () => {
  it("F495: 발굴/형상화 2개 라벨만 렌더링 (Offering/MVP 제거)", () => {
    const detail = makeDetail("DISCOVERY", [
      { stage: "DISCOVERY", enteredAt: "2026-04-01T00:00:00Z" },
    ]);
    const html = renderToString(<PipelineProgressStepper detail={detail} />);
    expect(html).toContain("발굴");
    expect(html).toContain("형상화");
    expect(html).not.toContain("Offering");
    expect(html).not.toContain("MVP");
  });

  it("F495: DISCOVERY + 5/9 sub-progress 렌더링", () => {
    const detail = makeDetail("DISCOVERY", [
      { stage: "DISCOVERY", enteredAt: "2026-04-01T00:00:00Z" },
    ]);
    const html = renderToString(
      <PipelineProgressStepper
        detail={detail}
        discoveryProgress={{ done: 5, total: 9 }}
      />,
    );
    expect(html).toContain("5");
    expect(html).toContain("9");
    expect(html).toContain("기준");
    // 전체 진행률 = 발굴 5/9 * 50 + 형상화 0/4 * 50 = 28%
    expect(html).toContain("28% 진행");
  });

  it("F495: FORMALIZATION + 9/9 발굴 + 4/4 형상화 → 형상화 완료", () => {
    const detail = makeDetail("FORMALIZATION", [
      { stage: "DISCOVERY", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-04-08T00:00:00Z" },
    ]);
    const html = renderToString(
      <PipelineProgressStepper
        detail={detail}
        discoveryProgress={{ done: 9, total: 9 }}
        shapingArtifacts={makeArtifacts(4)}
      />,
    );
    expect(html).toContain("100% 진행");
    // 두 단계 모두 완료 라벨
    const completedMatches = html.match(/완료/g) ?? [];
    expect(completedMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("F495: FORMALIZATION 진행 중 + 2/4 산출물 → 형상화 진행률 반영 (드리프트 해소)", () => {
    const detail = makeDetail("FORMALIZATION", [
      { stage: "DISCOVERY", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-04-08T00:00:00Z" },
    ]);
    const html = renderToString(
      <PipelineProgressStepper
        detail={detail}
        discoveryProgress={{ done: 9, total: 9 }}
        shapingArtifacts={makeArtifacts(2)}
      />,
    );
    expect(html).toContain("산출물");
    expect(html).toContain("animate-pulse"); // 형상화가 현재 진행 중
    // 발굴 50% + 형상화 25% = 75%
    expect(html).toContain("75% 진행");
  });

  it("F495: 형상화 완료 라벨 — 4/4 시 '완료' 표시", () => {
    const detail = makeDetail("FORMALIZATION", [
      { stage: "DISCOVERY", enteredAt: "2026-03-01T00:00:00Z" },
      { stage: "FORMALIZATION", enteredAt: "2026-04-08T00:00:00Z" },
    ]);
    const html = renderToString(
      <PipelineProgressStepper
        detail={detail}
        discoveryProgress={{ done: 9, total: 9 }}
        shapingArtifacts={makeArtifacts(4)}
      />,
    );
    expect(html).toContain("완료");
  });

  it("F495: REGISTERED 단계에서도 발굴이 '진행 중' 으로 표시", () => {
    const detail = makeDetail("REGISTERED", []);
    const html = renderToString(
      <PipelineProgressStepper
        detail={detail}
        discoveryProgress={{ done: 0, total: 9 }}
      />,
    );
    expect(html).toContain("진행 중");
  });
});
