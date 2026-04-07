// ─── F423: impeccable 디자인 참조문서 번들 (Sprint 203) ───
// 출처: https://github.com/pbakaus/impeccable (Apache 2.0)
// 7개 도메인 전체 주입 — M0 PoC 실증: ~8K 토큰 (30K 한도의 27%)

export const IMPECCABLE_DOMAINS = {
  typography: `## Typography

### Core Principles
- **Type scale**: Use a modular scale (1.25× or 1.333×) — never arbitrary sizes
- **Line height**: Body text 1.5–1.7; headings 1.1–1.3; never use unitless 1.0 for body
- **Line length**: 55–75 characters per line (45ch–65ch width) for optimal readability
- **Font pairing**: Max 2 typefaces — one for headings, one for body. Use weights/styles within families instead of adding fonts
- **Hierarchy**: Establish clear size contrast between levels (minimum 1.25× ratio between adjacent heading levels)

### Font Selection
- **Avoid**: Arial, Inter, system-ui, Helvetica as primary display fonts — these signal "AI default"
- **Prefer**: Google Fonts with personality — Fraunces, Plus Jakarta Sans, DM Sans, Space Grotesk, Outfit for modern feel; Playfair Display, Lora for editorial
- **Body text**: Minimum 16px (1rem) for comfort; 18px for long-form reading
- **Letter spacing**: Headings: -0.02em to -0.04em (tighten); body: 0; small caps/labels: +0.05em to +0.1em

### Weight Usage
- Use 2–3 weights maximum per typeface
- Bold (700) for headings, Regular (400) for body, Medium (500) for UI labels
- Never use font-weight: 900 without verifying the face supports it visually`,

  colorContrast: `## Color & Contrast

### Core Principles
- **Avoid pure neutrals**: Never use #000000 or #ffffff as primary colors — use tinted neutrals
- **Tinted neutrals**: Add 5–10% hue saturation to grays (e.g., slate-950: #0f172a, not #1a1a1a)
- **Avoid**: #808080, #999999, #aaaaaa, #cccccc — pure grays look flat and lifeless
- **Color palette**: 1 primary + 1 accent + 2–3 tinted neutrals + semantic colors (success/warning/error)

### OKLCH Color Space
- Prefer OKLCH for perceptually uniform hue shifts: oklch(L C H)
- Example primary palette: oklch(0.45 0.18 260) for rich indigo, oklch(0.92 0.02 260) for light tint
- Tinted white alternative: oklch(0.98 0.01 260) — barely perceptible blue tint, not pure white

### Contrast Requirements
- Body text on background: minimum 4.5:1 (WCAG AA)
- Large text (18px+ bold): minimum 3:1
- UI components/borders: minimum 3:1
- Never place medium gray text (#999) on white — fails at ~2.8:1

### Color Roles
- **Surface**: Background colors — use tinted neutrals, not pure white
- **On-surface**: Text colors — use tinted dark, not pure black
- **Primary**: CTAs, active states — saturated, high contrast with white text
- **Muted**: Secondary labels, placeholders — 60–70% opacity of on-surface`,

  spatialDesign: `## Spatial Design

### Spacing System
- **Base unit**: 4px or 8px — all spacing values must be multiples
- **Scale**: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px — stick to this progression
- **Never**: Use arbitrary values like 7px, 13px, 22px — they break visual rhythm

### Layout Principles
- **Breathing room**: Section padding minimum 64px vertical (96px for hero sections)
- **Content max-width**: 1200px container; text content: 720px (readability limit)
- **Whitespace**: 20–30% of any given screen should be empty — resist filling space
- **Grouping**: Related items closer together (8–16px gap); unrelated sections further apart (48–96px)

### Component Spacing
- **Cards**: Internal padding 24px; gap between cards 24px; never less than 16px
- **Buttons**: Vertical padding 12–16px; horizontal 24–32px; never less than 44px tap target
- **Form fields**: Height 44–48px; internal padding 12px horizontal; gap between fields 16px
- **Inline elements**: Icon + text gap: 8px; badge padding: 4px 10px

### Negative Space
- Every dense section should be followed by a lighter, more spacious section
- Use negative space to draw attention — isolation creates emphasis`,

  motionDesign: `## Motion Design

### Timing Principles
- **Micro-interactions**: 100–200ms (hover states, toggles)
- **Transitions**: 200–350ms (page elements, modals appearing)
- **Complex animations**: 400–600ms (multi-step, orchestrated)
- Never exceed 600ms for UI transitions — users perceive it as slow

### Easing
- **Enter animations**: ease-out (starts fast, decelerates) — cubic-bezier(0.0, 0.0, 0.2, 1)
- **Exit animations**: ease-in (starts slow, accelerates) — cubic-bezier(0.4, 0.0, 1, 1)
- **Standard transitions**: ease-in-out — cubic-bezier(0.4, 0.0, 0.2, 1)
- **Never**: Linear easing for UI (feels mechanical); spring physics for basic hover

### CSS Implementation
- Use CSS custom properties for timing: --duration-fast: 150ms; --duration-standard: 300ms
- Prefer transform and opacity — never animate width, height, or layout properties
- Use will-change sparingly and only on elements that definitely animate
- Respect prefers-reduced-motion: @media (prefers-reduced-motion: reduce) { transition: none }`,

  interactionDesign: `## Interaction Design

### Feedback Principles
- **Every action needs feedback**: clicks, submissions, hover states, loading, errors
- **Response time**: < 100ms feels instant; 100–1000ms needs indicator; > 1s needs progress feedback
- **Error states**: Appear inline next to the problematic field, not in a separate location

### States to Design
All interactive elements need all applicable states:
- **Default**: Resting state
- **Hover**: 10–15% darker/lighter; subtle scale(1.02) for buttons
- **Active/Pressed**: More pronounced change (scale 0.98); immediate feedback
- **Focus**: Visible outline for keyboard navigation (2px solid, 2px offset, primary color)
- **Disabled**: 40% opacity; cursor: not-allowed; no hover state
- **Loading**: Skeleton screens preferred over spinners; optimistic updates when possible

### Affordances
- **Clickable elements**: Cursor pointer; sufficient hit target (44×44px minimum)
- **Text links**: Underline on hover at minimum; color should differ from body text
- **Buttons vs Links**: Buttons for actions (submit, save, delete); links for navigation
- **Cards as links**: Entire card area should be clickable if it leads somewhere

### Form Design
- **Labels**: Always visible above fields — never rely on placeholders as labels
- **Validation**: Real-time validation only after first submit or on blur; not on keydown
- **Submit state**: Disable button during submission; show loading state
- **Success**: Clear confirmation — inline message or redirect with success state`,

  responsiveDesign: `## Responsive Design

### Mobile-First Approach
- Write base CSS for mobile (320px–480px) first, then enhance with min-width media queries
- **Never** use max-width media queries as primary breakpoint strategy

### Breakpoints
- Mobile: 0–767px (base styles)
- Tablet: 768px–1023px (@media (min-width: 768px))
- Desktop: 1024px–1439px (@media (min-width: 1024px))
- Wide: 1440px+ (@media (min-width: 1440px))

### Fluid Typography
- Use clamp() for fluid type scaling: font-size: clamp(1rem, 2.5vw, 1.5rem)
- Hero heading: clamp(2rem, 5vw, 4rem) — scales smoothly from mobile to desktop

### Fluid Layout
- **CSS Grid**: Prefer for 2D layouts — grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))
- **Flexbox**: Prefer for 1D layouts and component internals
- **Padding**: Use clamp() for section padding: clamp(2rem, 5vw, 6rem)
- **Images**: Always max-width: 100%; height: auto

### Touch Considerations
- Minimum tap target: 44×44px (iOS HIG); 48×48px (Material Design)
- Spacing between tap targets: minimum 8px to prevent mis-taps
- Avoid hover-only interactions — everything must work on touch`,

  uxWriting: `## UX Writing

### Voice & Tone
- **Clear over clever**: Prioritize clarity, not wordplay. Users read labels, not prose
- **Active voice**: "Save your work" not "Your work will be saved"
- **Second person**: "Your projects", "You have 3 notifications" — direct and personal
- **Positive framing**: "Enter a valid email" not "Invalid email format"

### Labels & Microcopy
- **Button labels**: Use verbs — "Save", "Delete", "Send message" — not "OK" or "Submit"
- **Placeholder text**: Describe format/example, not repeat the label — Email: "name@company.com"
- **Error messages**: Say what happened + what to do — "Email already in use. Try logging in instead"
- **Empty states**: Explain what goes here + offer an action — not just "No data"
- **Loading states**: "Generating your prototype..." — present progressive, not passive

### Content Hierarchy
- **Headlines**: Outcome-focused — "Launch faster with AI" not "AI-Powered Platform"
- **Subheadings**: Support and expand the headline; answer "so what?"
- **Body copy**: 2–3 sentences maximum per paragraph; bullet points for 3+ items
- **CTAs**: One primary CTA per section; secondary CTAs in lower visual weight

### Numbers & Formatting
- **Dates**: Unambiguous format — "April 7, 2026" or "7 Apr 2026" — never "04/07/26"
- **Numbers**: Use commas for thousands — "1,234 users" not "1234 users"
- **Percentages**: "87% faster" with context — what is it faster than?`,
} as const;

/**
 * 7도메인 전체를 하나의 문자열로 반환 (~8K 토큰)
 * OgdGeneratorService 시스템 프롬프트 주입용
 */
export function getImpeccableReference(): string {
  return Object.entries(IMPECCABLE_DOMAINS)
    .map(([, content]) => content)
    .join("\n\n---\n\n");
}
