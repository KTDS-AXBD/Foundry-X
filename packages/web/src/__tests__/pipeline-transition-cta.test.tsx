/**
 * F448 — PipelineTransitionCTA 단위 테스트
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import PipelineTransitionCTA from "@/components/feature/discovery/PipelineTransitionCTA";

const noop = () => {};

describe("PipelineTransitionCTA", () => {
  it("발굴 완료 조건 (analyzed + DISCOVERY) — 형상화 CTA 노출", () => {
    const html = renderToString(
      <PipelineTransitionCTA
        bizItemId="item-1"
        bizStatus="analyzed"
        currentStage="DISCOVERY"
        hasBusinessPlan={false}
        onTransitionComplete={noop}
      />,
    );
    expect(html).toContain("형상화 단계로 이동");
    expect(html).toContain("발굴 분석 완료");
  });

  it("기획서 완료 조건 (hasBusinessPlan + FORMALIZATION) — Offering CTA 노출", () => {
    const html = renderToString(
      <PipelineTransitionCTA
        bizItemId="item-1"
        bizStatus="shaping"
        currentStage="FORMALIZATION"
        hasBusinessPlan={true}
        onTransitionComplete={noop}
      />,
    );
    expect(html).toContain("Offering 단계로 이동");
    expect(html).toContain("사업기획서 완성");
  });

  it("조건 불충족 — 아무것도 렌더링 안 함", () => {
    const html = renderToString(
      <PipelineTransitionCTA
        bizItemId="item-1"
        bizStatus="draft"
        currentStage="REGISTERED"
        hasBusinessPlan={false}
        onTransitionComplete={noop}
      />,
    );
    expect(html).toBe("");
  });

  it("analyzed지만 FORMALIZATION 단계 — CTA 없음 (이미 전환됨)", () => {
    const html = renderToString(
      <PipelineTransitionCTA
        bizItemId="item-1"
        bizStatus="analyzed"
        currentStage="FORMALIZATION"
        hasBusinessPlan={false}
        onTransitionComplete={noop}
      />,
    );
    // hasBusinessPlan=false 이므로 Offering CTA도 없음
    expect(html).toBe("");
  });
});
