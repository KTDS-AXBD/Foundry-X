// ─── F469: CSS Anti-Pattern Guard (Sprint 230) ───
// 생성 후처리 — AI 기본 폰트/순수 흑백/비배수 spacing 자동 수정

export interface CssCorrection {
  type: "font" | "color" | "spacing";
  original: string;
  corrected: string;
  reason: string;
}

const FONT_REPLACEMENTS: Record<string, string> = {
  "Arial": "'Plus Jakarta Sans', sans-serif",
  "Helvetica": "'DM Sans', sans-serif",
  "Inter": "'Space Grotesk', sans-serif",
  "system-ui": "'Outfit', sans-serif",
};

const COLOR_REPLACEMENTS: Record<string, string> = {
  "#000000": "#0f172a",   // pure black → slate-950
  "#000": "#0f172a",
  "#ffffff": "#fafbfc",   // pure white → tinted white
  "#fff": "#fafbfc",
  "#808080": "#64748b",   // pure gray → slate-500
  "#999999": "#94a3b8",   // → slate-400
  "#999": "#94a3b8",
  "#aaaaaa": "#94a3b8",
  "#cccccc": "#cbd5e1",   // → slate-300
  "#ccc": "#cbd5e1",
};

export function guardCss(html: string): { fixed: string; corrections: CssCorrection[] } {
  let fixed = html;
  const corrections: CssCorrection[] = [];

  // 1. AI 기본 폰트 교체
  for (const [bad, good] of Object.entries(FONT_REPLACEMENTS)) {
    const regex = new RegExp(`font-family:\\s*[^;]*\\b${bad}\\b`, "gi");
    const matches = fixed.match(regex);
    if (matches) {
      for (const m of matches) {
        const corrected = m.replace(new RegExp(`\\b${bad}\\b`, "gi"), good);
        fixed = fixed.replace(m, corrected);
        corrections.push({
          type: "font",
          original: bad,
          corrected: good,
          reason: `AI 기본 폰트 "${bad}" → 전문 폰트 교체`,
        });
      }
    }
  }

  // 2. 순수 흑백/회색 → tinted neutral
  for (const [bad, good] of Object.entries(COLOR_REPLACEMENTS)) {
    if (fixed.includes(bad)) {
      fixed = fixed.replaceAll(bad, good);
      corrections.push({
        type: "color",
        original: bad,
        corrected: good,
        reason: `순수 색상 ${bad} → tinted neutral ${good}`,
      });
    }
  }

  // 3. 비배수 spacing 감지 (기록만, 자동 수정은 side-effect 위험으로 미적용)
  const spacingRegex = /(?:margin|padding|gap):\s*(\d+)px/g;
  let spacingMatch;
  while ((spacingMatch = spacingRegex.exec(fixed)) !== null) {
    const val = parseInt(spacingMatch[1] ?? "0", 10);
    if (val > 0 && val % 4 !== 0) {
      const rounded = Math.round(val / 4) * 4;
      corrections.push({
        type: "spacing",
        original: `${val}px`,
        corrected: `${rounded}px`,
        reason: `비배수 spacing ${val}px → ${rounded}px (4px 배수) — 수동 확인 권장`,
      });
    }
  }

  return { fixed, corrections };
}
