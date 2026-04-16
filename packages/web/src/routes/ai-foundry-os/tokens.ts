// AI Foundry OS — Theme-aware Design Tokens
// CSS custom properties defined in globals.css (:root + .dark)
// AXIS Design System aligned (@axis-ds/tokens v1.1.1)

// ─── Font Stacks ───────────────────────────────────────────────────
export const fonts = {
  display: "'Fraunces', 'Noto Serif KR', ui-serif, Georgia, serif",
  body: "'Pretendard Variable', Pretendard, -apple-system, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
} as const;

// ─── CSS Variable References ───────────────────────────────────────
// These resolve at runtime based on the active theme (.dark / :root)
const surface = {
  abyss: "var(--fos-surface-abyss)",
  hull: "var(--fos-surface-hull)",
  panel: "var(--fos-surface-panel)",
  panelHi: "var(--fos-surface-panel-hi)",
  inset: "var(--fos-surface-inset)",
} as const;

const border = {
  default: "var(--fos-border-default)",
  strong: "var(--fos-border-strong)",
  subtle: "var(--fos-border-subtle)",
} as const;

const text = {
  primary: "var(--fos-text-primary)",
  secondary: "var(--fos-text-secondary)",
  muted: "var(--fos-text-muted)",
  dim: "var(--fos-text-dim)",
  accent: "var(--fos-text-accent)",
} as const;

const accent = {
  input: {
    accent: "var(--fos-accent-input)",
    soft: "var(--fos-accent-input-soft)",
    text: "var(--fos-accent-input-text)",
  },
  control: {
    accent: "var(--fos-accent-control)",
    soft: "var(--fos-accent-control-soft)",
    text: "var(--fos-accent-control-text)",
  },
  takeaway: {
    accent: "var(--fos-accent-takeaway)",
    soft: "var(--fos-accent-takeaway-soft)",
    text: "var(--fos-accent-takeaway-text)",
  },
} as const;

const status = {
  ok: "var(--fos-status-ok)",
  warn: "var(--fos-status-warn)",
  info: "var(--fos-status-info)",
  error: "var(--fos-status-error)",
} as const;

// ─── Node Colors (Ontology KG) — semantic, theme-independent ──────
export const NODE_COLORS: Record<string, string> = {
  SubProcess: "#3b82f6",       // axis-blue-500
  Method: "#8b5cf6",           // axis-purple-500
  Condition: "#f59e0b",        // axis-yellow-500
  Actor: "#34d399",            // axis-green-400
  Requirement: "#f87171",      // axis-red-400
  DiagnosisFinding: "#ec4899", // axis-pink-500
  default: "#6b7280",         // axis-gray-500
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
