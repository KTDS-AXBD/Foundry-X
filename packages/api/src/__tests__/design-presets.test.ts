import { describe, it, expect } from "vitest";
import {
  DESIGN_PRESETS,
  findPreset,
  presetToTokenOverride,
  getPresetPrompt,
} from "../data/design-presets.js";

describe("산업별 DESIGN.md 프리셋", () => {
  it("5개 프리셋이 등록되어 있다", () => {
    expect(DESIGN_PRESETS).toHaveLength(5);
  });

  it("모든 프리셋에 필수 필드가 있다", () => {
    for (const p of DESIGN_PRESETS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.industries.length).toBeGreaterThan(0);
      expect(p.colorPalette.primary).toBeTruthy();
      expect(p.typography.headingFont).toBeTruthy();
      expect(p.guardrails.length).toBeGreaterThan(0);
      expect(p.agentPrompt).toBeTruthy();
    }
  });

  it("금융 키워드로 fintech 프리셋을 찾는다", () => {
    expect(findPreset("금융").id).toBe("fintech");
    expect(findPreset("핀테크").id).toBe("fintech");
    expect(findPreset("banking").id).toBe("fintech");
  });

  it("제조 키워드로 manufacturing 프리셋을 찾는다", () => {
    expect(findPreset("반도체").id).toBe("manufacturing");
    expect(findPreset("공급망 관리").id).toBe("manufacturing");
  });

  it("AI 키워드로 ai-platform 프리셋을 찾는다", () => {
    expect(findPreset("AI 플랫폼").id).toBe("ai-platform");
    expect(findPreset("머신러닝").id).toBe("ai-platform");
  });

  it("의료 키워드로 healthcare 프리셋을 찾는다", () => {
    expect(findPreset("헬스케어").id).toBe("healthcare");
  });

  it("매칭 안 되면 enterprise 기본 프리셋 반환", () => {
    expect(findPreset("알 수 없는 분야").id).toBe("enterprise");
    expect(findPreset("").id).toBe("enterprise");
  });

  it("presetToTokenOverride가 올바른 키를 반환한다", () => {
    const tokens = presetToTokenOverride(DESIGN_PRESETS[0]!);
    expect(tokens["color.text.primary"]).toBeTruthy();
    expect(tokens["color.bg.default"]).toBeTruthy();
    expect(tokens["typography.hero.size"]).toBeTruthy();
  });

  it("getPresetPrompt에 핵심 정보가 포함된다", () => {
    const prompt = getPresetPrompt(DESIGN_PRESETS[0]!);
    expect(prompt).toContain("Design Preset");
    expect(prompt).toContain("Color Palette");
    expect(prompt).toContain("Guardrails");
    expect(prompt).toContain("Agent Instruction");
  });

  it("모든 프리셋의 색상이 순수 흑백이 아니다", () => {
    for (const p of DESIGN_PRESETS) {
      const colors = Object.values(p.colorPalette);
      for (const c of colors) {
        expect(c).not.toBe("#000000");
        expect(c).not.toBe("#ffffff");
      }
    }
  });

  it("모든 프리셋의 폰트가 AI 기본 폰트가 아니다", () => {
    const banned = ["Arial", "Inter", "system-ui", "Helvetica"];
    for (const p of DESIGN_PRESETS) {
      for (const font of [p.typography.headingFont, p.typography.bodyFont]) {
        for (const b of banned) {
          expect(font).not.toContain(b);
        }
      }
    }
  });
});
