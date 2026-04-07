/**
 * Sprint 215: 기획서 템플릿 다양화 테스트 (F445)
 */
import { describe, it, expect } from "vitest";
import {
  TEMPLATE_CONFIGS,
  getTemplateSections,
  buildGenerationPrompt,
} from "../core/offering/services/business-plan-template.js";

describe("TEMPLATE_CONFIGS", () => {
  it("internal 템플릿 — 7섹션 구성", () => {
    const sections = getTemplateSections('internal');
    expect(sections).toHaveLength(7);
    // 요약, 사업개요, 문제정의, 솔루션, 시장분석, 수익모델, 리스크
    expect(sections.map(s => s.section)).toEqual([1, 2, 3, 4, 5, 7, 9]);
  });

  it("proposal 템플릿 — 8섹션 구성", () => {
    const sections = getTemplateSections('proposal');
    expect(sections).toHaveLength(8);
    expect(sections.map(s => s.section)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("ir-pitch 템플릿 — 10섹션 전체", () => {
    const sections = getTemplateSections('ir-pitch');
    expect(sections).toHaveLength(10);
    expect(sections.map(s => s.section)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("각 템플릿에 name, focus, defaultLength 있음", () => {
    for (const [, config] of Object.entries(TEMPLATE_CONFIGS)) {
      expect(config.name).toBeTruthy();
      expect(config.focus).toBeTruthy();
      expect(['short', 'medium', 'long']).toContain(config.defaultLength);
    }
  });
});

describe("getTemplateSections", () => {
  it("알 수 없는 타입 → internal 기본값 반환", () => {
    // @ts-expect-error 의도적 잘못된 타입
    const sections = getTemplateSections('unknown-type');
    expect(sections).toHaveLength(7); // internal 기본값
  });
});

describe("buildGenerationPrompt", () => {
  it("formal 어투 포함", () => {
    const prompt = buildGenerationPrompt('internal', 'formal', 'medium');
    expect(prompt).toContain('공식');
  });

  it("casual 어투 포함", () => {
    const prompt = buildGenerationPrompt('internal', 'casual', 'medium');
    expect(prompt).toContain('친근');
  });

  it("short 분량 포함", () => {
    const prompt = buildGenerationPrompt('proposal', 'formal', 'short');
    expect(prompt).toContain('간결');
  });

  it("long 분량 포함", () => {
    const prompt = buildGenerationPrompt('ir-pitch', 'formal', 'long');
    expect(prompt).toContain('풍부');
  });

  it("템플릿 이름 포함", () => {
    const prompt = buildGenerationPrompt('proposal', 'formal', 'medium');
    expect(prompt).toContain('제안서');
  });
});
