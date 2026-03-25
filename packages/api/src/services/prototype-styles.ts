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

export function getBaseCSS(theme: ThemeColors): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, sans-serif; color: #1a1a2e; line-height: 1.6; }
    .hero { background: linear-gradient(135deg, ${theme.primary}, ${theme.accent}); color: white; padding: 80px 40px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto 24px; }
    .hero .cta { display: inline-block; padding: 12px 32px; background: white; color: ${theme.primary}; border-radius: 8px; font-weight: 700; text-decoration: none; }
    .section { padding: 60px 40px; max-width: 960px; margin: 0 auto; }
    .section h2 { font-size: 1.8rem; margin-bottom: 24px; color: ${theme.text}; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card h3 { font-size: 1.1rem; margin-bottom: 8px; color: ${theme.primary}; }
    .stat { text-align: center; padding: 20px; }
    .stat .value { font-size: 2rem; font-weight: 800; color: ${theme.primary}; }
    .stat .label { font-size: 0.875rem; color: #6b7280; }
    .quote { background: ${theme.bg}; border-left: 4px solid ${theme.accent}; padding: 16px 24px; margin: 12px 0; border-radius: 0 8px 8px 0; }
    .cta-section { background: ${theme.bg}; padding: 60px 40px; text-align: center; }
    .cta-section .btn { display: inline-block; padding: 14px 40px; background: ${theme.primary}; color: white; border-radius: 8px; font-weight: 700; text-decoration: none; }
    @media (max-width: 768px) { .hero { padding: 40px 20px; } .hero h1 { font-size: 1.8rem; } .section { padding: 40px 20px; } }
  `;
}
