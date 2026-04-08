// ─── 산업별 DESIGN.md 프리셋 (awesome-design-md 기반) ───
// 출처: https://github.com/VoltAgent/awesome-design-md
// 고객 산업에 맞는 디자인 시스템을 Prototype/Offering 생성 시 자동 적용
// 9개 영역: theme, color, typography, component, layout, depth, guardrails, responsive, agent

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  industries: string[];  // 매칭되는 산업 키워드
  theme: string;
  colorPalette: {
    primary: string;
    accent: string;
    surface: string;
    onSurface: string;
    muted: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    heroSize: string;
    bodySize: string;
  };
  guardrails: string[];  // "하지 말 것" 리스트
  agentPrompt: string;   // LLM에 주입할 디자인 지시
}

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "fintech",
    name: "Fintech / Banking",
    description: "신뢰감 + 정밀함. Toss/Stripe 스타일 — 넓은 여백, 숫자 강조, 차분한 색조",
    industries: ["금융", "핀테크", "은행", "보험", "결제", "투자", "fintech", "banking", "payment", "insurance"],
    theme: "Clean, trustworthy, precise. Numbers are always prominent. Generous whitespace conveys stability.",
    colorPalette: {
      primary: "#1a1a2e",
      accent: "#3b82f6",
      surface: "#fafbfc",
      onSurface: "#0f172a",
      muted: "#64748b",
    },
    typography: {
      headingFont: "'Plus Jakarta Sans', sans-serif",
      bodyFont: "'DM Sans', sans-serif",
      heroSize: "clamp(2.5rem, 5vw, 4rem)",
      bodySize: "1rem",
    },
    guardrails: [
      "Never use bright/saturated accent colors for financial data — convey calm trust",
      "Numbers must be 2× larger than their labels",
      "Only ONE accent color. Everything else is grayscale",
      "No playful illustrations — use clean data visualizations",
    ],
    agentPrompt: "Design for a fintech audience. Emphasize trust, precision, and clarity. Use muted tones with one blue accent. Numbers should be visually dominant. White space conveys stability.",
  },
  {
    id: "manufacturing",
    name: "Manufacturing / Industrial",
    description: "견고함 + 효율. 제조/공장 자동화 — 다크 테마, 데이터 밀도 높음, 모니터링 UI",
    industries: ["제조", "공장", "산업", "자동화", "공급망", "물류", "반도체", "manufacturing", "industrial", "supply chain", "semiconductor"],
    theme: "Industrial, efficient, data-dense. Dark backgrounds for monitoring. Structured grid layouts for control panels.",
    colorPalette: {
      primary: "#0f172a",
      accent: "#22c55e",
      surface: "#1e293b",
      onSurface: "#e2e8f0",
      muted: "#94a3b8",
    },
    typography: {
      headingFont: "'Space Grotesk', sans-serif",
      bodyFont: "'DM Sans', sans-serif",
      heroSize: "clamp(2rem, 4vw, 3rem)",
      bodySize: "0.9375rem",
    },
    guardrails: [
      "Dark theme is default — light text on dark backgrounds",
      "Data density is acceptable — don't over-simplify for this audience",
      "Use green for positive/operational, red for alerts, amber for warnings",
      "Monospace font for numerical data and codes",
    ],
    agentPrompt: "Design for manufacturing/industrial operators. Dark theme with green accent for operational status. Dense data layout is expected. Use grid-based panel layouts reminiscent of control rooms.",
  },
  {
    id: "healthcare",
    name: "Healthcare / Medical",
    description: "안전 + 접근성. 의료/헬스케어 — 높은 대비, 큰 터치 타겟, 차분한 파란/초록 톤",
    industries: ["의료", "헬스케어", "병원", "건강", "바이오", "제약", "healthcare", "medical", "bio", "pharma"],
    theme: "Safe, accessible, calming. High contrast for readability. Generous touch targets. Blue/teal palette conveys care.",
    colorPalette: {
      primary: "#0d9488",
      accent: "#2563eb",
      surface: "#f0fdfa",
      onSurface: "#134e4a",
      muted: "#5eead4",
    },
    typography: {
      headingFont: "'Outfit', sans-serif",
      bodyFont: "'DM Sans', sans-serif",
      heroSize: "clamp(2rem, 5vw, 3.5rem)",
      bodySize: "1.0625rem",
    },
    guardrails: [
      "WCAG AAA contrast (7:1) for all critical text",
      "Minimum touch target 48×48px (not 44px)",
      "Never use red for non-error states — reserve for critical alerts only",
      "Avoid dense data layouts — prioritize clarity over information density",
    ],
    agentPrompt: "Design for healthcare professionals. Prioritize accessibility and clarity. Use calming teal/blue palette. High contrast, large touch targets, generous spacing. Red is reserved for critical alerts only.",
  },
  {
    id: "ai-platform",
    name: "AI / ML Platform",
    description: "혁신 + 기술력. AI 플랫폼 — 그라데이션, 코드 블록, 다크 모드, 미래 지향적",
    industries: ["AI", "인공지능", "ML", "머신러닝", "LLM", "데이터", "분석", "플랫폼", "ai", "machine learning", "data", "analytics"],
    theme: "Innovative, technical, forward-looking. Subtle gradients convey AI sophistication. Code-friendly with monospace elements.",
    colorPalette: {
      primary: "#6366f1",
      accent: "#a855f7",
      surface: "#fafbfc",
      onSurface: "#0f172a",
      muted: "#94a3b8",
    },
    typography: {
      headingFont: "'Space Grotesk', sans-serif",
      bodyFont: "'DM Sans', sans-serif",
      heroSize: "clamp(2.5rem, 5vw, 4rem)",
      bodySize: "1rem",
    },
    guardrails: [
      "Gradients: subtle, max 2 colors, never rainbow",
      "Code blocks use monospace with syntax-like coloring",
      "Avoid generic 'AI brain' imagery — show actual interfaces",
      "Dark mode should be available but not default for business content",
    ],
    agentPrompt: "Design for an AI/ML platform audience. Use indigo-to-purple subtle gradient for hero. Include monospace elements for technical credibility. Modern, clean, forward-looking aesthetic.",
  },
  {
    id: "enterprise",
    name: "Enterprise / SaaS",
    description: "전문성 + 확장성. 기업용 SaaS — 중성 톤, 정돈된 레이아웃, 데이터 테이블 중심",
    industries: ["기업", "SaaS", "B2B", "ERP", "CRM", "업무", "엔터프라이즈", "enterprise", "saas", "b2b", "erp"],
    theme: "Professional, scalable, organized. Neutral tones with one brand accent. Table-friendly layouts. Clear information hierarchy.",
    colorPalette: {
      primary: "#1e40af",
      accent: "#3b82f6",
      surface: "#f8fafc",
      onSurface: "#0f172a",
      muted: "#64748b",
    },
    typography: {
      headingFont: "'Plus Jakarta Sans', sans-serif",
      bodyFont: "'DM Sans', sans-serif",
      heroSize: "clamp(2rem, 4vw, 3rem)",
      bodySize: "0.9375rem",
    },
    guardrails: [
      "Avoid trendy gradients or flashy animations — convey stability",
      "Tables and data grids are first-class citizens",
      "Navigation should be immediately obvious — no hidden menus",
      "Use badges and status indicators for workflow states",
    ],
    agentPrompt: "Design for enterprise B2B users. Professional, clean, organized. Blue accent with neutral grays. Tables and data grids should be well-styled. Clear navigation and status indicators.",
  },
];

/**
 * 산업 키워드로 가장 적합한 Design Preset을 찾는다
 * @param industryHint 산업 키워드 또는 biz_item의 산업 분류
 * @returns 매칭된 preset 또는 enterprise (기본)
 */
export function findPreset(industryHint: string): DesignPreset {
  const hint = industryHint.toLowerCase();
  for (const preset of DESIGN_PRESETS) {
    if (preset.industries.some(kw => hint.includes(kw.toLowerCase()))) {
      return preset;
    }
  }
  return DESIGN_PRESETS.find(p => p.id === "enterprise")!;
}

/**
 * Preset의 colorPalette → DesignTokenOverride 형식으로 변환
 */
export function presetToTokenOverride(preset: DesignPreset): Record<string, string> {
  return {
    "color.text.primary": preset.colorPalette.onSurface,
    "color.text.secondary": preset.colorPalette.muted,
    "color.bg.default": preset.colorPalette.surface,
    "color.bg.alt": preset.colorPalette.surface,
    "typography.hero.size": preset.typography.heroSize,
    "typography.body.size": preset.typography.bodySize,
    "layout.maxWidth": "1200px",
    "spacing.grid.gap": "24px",
    "spacing.section.margin": "64px",
  };
}

/**
 * OGD Generator 시스템 프롬프트에 주입할 산업별 디자인 가이드 생성
 */
export function getPresetPrompt(preset: DesignPreset): string {
  return [
    `## Design Preset: ${preset.name}`,
    `Theme: ${preset.theme}`,
    ``,
    `### Color Palette`,
    `- Primary: ${preset.colorPalette.primary}`,
    `- Accent: ${preset.colorPalette.accent}`,
    `- Surface: ${preset.colorPalette.surface}`,
    `- Text: ${preset.colorPalette.onSurface}`,
    ``,
    `### Typography`,
    `- Heading: ${preset.typography.headingFont}`,
    `- Body: ${preset.typography.bodyFont}`,
    ``,
    `### Guardrails`,
    ...preset.guardrails.map(g => `- ${g}`),
    ``,
    `### Agent Instruction`,
    preset.agentPrompt,
  ].join("\n");
}
