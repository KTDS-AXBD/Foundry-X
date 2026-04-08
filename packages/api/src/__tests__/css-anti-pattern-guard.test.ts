import { describe, it, expect } from "vitest";
import { guardCss } from "../core/harness/services/css-anti-pattern-guard.js";

describe("CSS Anti-Pattern Guard (F469)", () => {
  it("AI 기본 폰트를 전문 폰트로 교체한다", () => {
    const html = '<style>body { font-family: Arial, sans-serif; }</style>';
    const { fixed, corrections } = guardCss(html);
    expect(fixed).not.toContain("Arial");
    expect(fixed).toContain("Plus Jakarta Sans");
    expect(corrections.some(c => c.type === "font")).toBe(true);
  });

  it("순수 흑색을 tinted neutral로 교체한다", () => {
    const html = '<style>.text { color: #000000; background: #ffffff; }</style>';
    const { fixed, corrections } = guardCss(html);
    expect(fixed).not.toContain("#000000");
    expect(fixed).toContain("#0f172a");
    expect(fixed).not.toContain("#ffffff");
    expect(fixed).toContain("#fafbfc");
    expect(corrections.filter(c => c.type === "color")).toHaveLength(2);
  });

  it("순수 회색을 채도 있는 neutral로 교체한다", () => {
    const html = '<style>.muted { color: #808080; }</style>';
    const { fixed } = guardCss(html);
    expect(fixed).toContain("#64748b");
  });

  it("비배수 spacing을 감지한다 (수정은 안 함)", () => {
    const html = '<style>.box { padding: 13px; margin: 22px; }</style>';
    const { fixed, corrections } = guardCss(html);
    // spacing은 기록만, 실제 수정 안 함
    expect(fixed).toContain("13px");
    expect(corrections.filter(c => c.type === "spacing")).toHaveLength(2);
  });

  it("이미 좋은 CSS는 수정하지 않는다", () => {
    const html = "<style>body { font-family: 'Plus Jakarta Sans'; color: #0f172a; padding: 16px; }</style>";
    const { corrections } = guardCss(html);
    expect(corrections).toHaveLength(0);
  });
});
