/**
 * Sprint 58: Prototype 스타일 — CSS + SVG 아이콘 + verdict별 컬러 테마 (F181)
 */

export const VERDICT_THEMES = {
  green: { primary: "#059669", bg: "#ecfdf5", accent: "#10b981", text: "#064e3b" },
  keep:  { primary: "#d97706", bg: "#fffbeb", accent: "#f59e0b", text: "#78350f" },
  red:   { primary: "#dc2626", bg: "#fef2f2", accent: "#ef4444", text: "#7f1d1d" },
  default: { primary: "#2563eb", bg: "#eff6ff", accent: "#3b82f6", text: "#1e3a5f" },
} as const;

export type ThemeColors = { readonly primary: string; readonly bg: string; readonly accent: string; readonly text: string };

export function getTheme(verdict: string): ThemeColors {
  return VERDICT_THEMES[verdict as keyof typeof VERDICT_THEMES] ?? VERDICT_THEMES.default;
}

export const SVG_ICONS = {
  problem: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
  solution: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/></svg>`,
  market: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>`,
  check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
} as const;

// F465: Design Token 오버라이드 인터페이스 (Sprint 230)
export interface DesignTokenOverride {
  "color.text.primary"?: string;
  "color.text.secondary"?: string;
  "color.bg.default"?: string;
  "color.bg.alt"?: string;
  "color.border.default"?: string;
  "typography.hero.size"?: string;
  "typography.section.size"?: string;
  "typography.body.size"?: string;
  "layout.maxWidth"?: string;
  "layout.cardRadius"?: string;
  "spacing.grid.gap"?: string;
  "spacing.section.margin"?: string;
}

/**
 * F465: DesignTokenJson → DesignTokenOverride 변환
 * DesignTokenService.getAsJson()의 중첩 구조를 플랫 키로 변환
 */
export function flattenTokens(json: Record<string, Record<string, string>>): DesignTokenOverride {
  const result: Record<string, string> = {};
  for (const [, values] of Object.entries(json)) {
    for (const [key, value] of Object.entries(values)) {
      result[key] = value;
    }
  }
  return result as unknown as DesignTokenOverride;
}

export function getBaseCSS(theme: ThemeColors, tokens?: DesignTokenOverride): string {
  // F465: 토큰이 전달되면 오버라이드, 없으면 기존 하드코딩 유지 (하위호환)
  const textColor = tokens?.["color.text.primary"] ?? "#0f172a";
  const textSecondary = tokens?.["color.text.secondary"] ?? "#475569";
  const bgDefault = tokens?.["color.bg.default"] ?? "#fafbfc";
  const bgAlt = tokens?.["color.bg.alt"] ?? theme.bg;
  const borderColor = tokens?.["color.border.default"] ?? "#e2e8f0";
  const heroSize = tokens?.["typography.hero.size"] ?? "clamp(2rem, 5vw, 2.5rem)";
  const sectionSize = tokens?.["typography.section.size"] ?? "1.8rem";
  const bodySize = tokens?.["typography.body.size"] ?? "1rem";
  const maxWidth = tokens?.["layout.maxWidth"] ?? "960px";
  const cardRadius = tokens?.["layout.cardRadius"] ?? "12px";
  const gridGap = tokens?.["spacing.grid.gap"] ?? "24px";
  const sectionMargin = tokens?.["spacing.section.margin"] ?? "64px";

  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', 'Pretendard', -apple-system, sans-serif; color: ${textColor}; line-height: 1.6; font-size: ${bodySize}; background: ${bgDefault}; }
    .hero { background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); color: white; padding: 96px 40px; text-align: center; }
    .hero h1 { font-size: ${heroSize}; margin-bottom: 16px; letter-spacing: -0.02em; line-height: 1.2; }
    .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto 24px; line-height: 1.7; }
    .hero .cta { display: inline-block; padding: 12px 32px; background: white; color: ${theme.primary}; border-radius: 8px; font-weight: 700; text-decoration: none; }
    .section { padding: ${sectionMargin} 40px; max-width: ${maxWidth}; margin: 0 auto; }
    .section h2 { font-size: ${sectionSize}; margin-bottom: 24px; color: ${theme.text}; letter-spacing: -0.02em; line-height: 1.3; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: ${gridGap}; }
    .card { background: ${bgDefault}; border: 1px solid ${borderColor}; border-radius: ${cardRadius}; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .card h3 { font-size: 1.1rem; margin-bottom: 8px; color: ${theme.primary}; }
    .stat { text-align: center; padding: 24px; }
    .stat .value { font-size: 2rem; font-weight: 800; color: ${theme.primary}; }
    .stat .label { font-size: 0.875rem; color: ${textSecondary}; }
    .quote { background: ${bgAlt}; border-left: 4px solid ${theme.accent}; padding: 16px 24px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .cta-section { background: ${bgAlt}; padding: ${sectionMargin} 40px; text-align: center; }
    .cta-section .btn { display: inline-block; padding: 14px 40px; background: ${theme.primary}; color: white; border-radius: 8px; font-weight: 700; text-decoration: none; }
    @media (max-width: 768px) { .hero { padding: 48px 20px; } .hero h1 { font-size: clamp(1.5rem, 4vw, 1.8rem); } .section { padding: 40px 20px; } }
    @media (min-width: 1024px) { .section { padding: ${sectionMargin} 48px; } }
  `;
}
