// AI Foundry OS — Unified Design Tokens
// AXIS Design System dark mode aligned (@axis-ds/tokens v1.1.1)
// Source: ink/glint (index.tsx) + T (harness/ontology/lpon) 통합

// ─── Font Stacks ───────────────────────────────────────────────────
export const fonts = {
  display: "'Fraunces', 'Noto Serif KR', ui-serif, Georgia, serif",
  body: "'Pretendard Variable', Pretendard, -apple-system, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
} as const;

// ─── Surface / Background ──────────────────────────────────────────
// Custom deep-dark palette (AXIS gray-950 #030712 기반 확장)
const surface = {
  abyss: "#05080d",      // 최심부 배경
  hull: "#0a1018",       // 외곽 배경
  panel: "#0e1620",      // 카드/패널
  panelHi: "#131d2a",    // 카드 hover/강조
  inset: "#0a131f",      // 인셋 영역 (harness/ontology)
} as const;

// ─── Border ────────────────────────────────────────────────────────
const border = {
  default: "rgba(230, 234, 246, 0.08)",
  strong: "rgba(230, 234, 246, 0.14)",
  subtle: "#1a2d47",     // harness/ontology 패널 경계
} as const;

// ─── Text ──────────────────────────────────────────────────────────
// AXIS dark mode 매핑: primary=#F3F4F6, secondary=#9CA3AF, tertiary=#6B7280
const text = {
  primary: "#e7ecf5",    // ≈ axis-gray-100 (dark mode text-primary)
  secondary: "#a1adc4",  // ≈ axis-gray-400 (dark mode text-secondary)
  muted: "#6b7a95",      // ≈ axis-gray-500 (dark mode text-tertiary)
  dim: "#495569",        // axis-gray-600
  accent: "#60a5fa",     // axis-blue-400
} as const;

// ─── Accent (3-Plane) ──────────────────────────────────────────────
// Input(gold) / Control(green) / Takeaway(red) — Foundry OS 전용
const accent = {
  input: { accent: "#d4a54c", soft: "#2a200e", text: "#e8c679" },
  control: { accent: "#3fb08a", soft: "#0f2720", text: "#6fd7b1" },
  takeaway: { accent: "#e25c5c", soft: "#2a1012", text: "#ff8585" },
} as const;

// ─── Status ────────────────────────────────────────────────────────
// AXIS semantic colors 직접 사용
const status = {
  ok: "#34d399",         // axis-green-400
  warn: "#f59e0b",       // axis-yellow-500
  info: "#60a5fa",       // axis-blue-400
  error: "#f87171",      // axis-red-400
} as const;

// ─── Node Colors (Ontology KG) ─────────────────────────────────────
export const NODE_COLORS: Record<string, string> = {
  SubProcess: "#3b82f6",     // axis-blue-500
  Method: "#8b5cf6",         // axis-purple-500
  Condition: "#f59e0b",      // axis-yellow-500
  Actor: "#34d399",          // axis-green-400
  Requirement: "#f87171",    // axis-red-400
  DiagnosisFinding: "#ec4899", // axis-pink-500
  default: "#6b7280",       // axis-gray-500
};

// ─── Composed Export ───────────────────────────────────────────────
export const fos = {
  fonts,
  surface,
  border,
  text,
  accent,
  status,
} as const;

// ─── Type Helpers ──────────────────────────────────────────────────
export type PlaneId = keyof typeof accent;
export interface Glint {
  accent: string;
  soft: string;
  text: string;
}
