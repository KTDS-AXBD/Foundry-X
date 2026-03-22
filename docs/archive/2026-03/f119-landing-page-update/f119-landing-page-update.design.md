# F119 — Foundry-X 정체성 및 소개 페이지 업데이트 Design Document

> **Summary**: PRD v5 통합 비전 반영 + 서비스 소개 섹션 신설 + 데이터 중앙 관리 + 로드맵 5-Phase 재구성
>
> **Project**: Foundry-X
> **Version**: v2.0.0
> **Author**: AX BD팀
> **Date**: 2026-03-20
> **Status**: Draft
> **Plan Reference**: `docs/01-plan/features/f119-landing-page-update.plan.md`

---

## 1. Design Overview

### 1.1 변경 범위

3개 파일 수정 + E2E 테스트 1개 수정:

| 파일 | 변경 유형 | LOC 변경 추정 |
|------|----------|:------------:|
| `packages/web/src/app/(landing)/page.tsx` | 데이터 갱신 + Services 섹션 신설 + 로드맵 재구성 | ~150줄 |
| `packages/web/src/components/landing/navbar.tsx` | navLinks 1건 추가 | ~3줄 |
| `packages/web/src/components/landing/footer.tsx` | 버전 동적화 + 링크 업데이트 | ~10줄 |
| `packages/web/e2e/landing.spec.ts` | 영문→한국어 헤드라인 수정 | ~5줄 |

### 1.2 설계 원칙

1. **데이터-뷰 분리 유지**: 기존 `page.tsx` 상단 const → 하단 컴포넌트 패턴 유지
2. **AXIS DS 토큰 활용**: 기존 `--axis-*` CSS 변수 + Tailwind 클래스 체계 100% 활용
3. **최소 구조 변경**: 새 파일 생성 없이, 기존 파일 내 데이터/컴포넌트 수정만

---

## 2. Data Layer 설계

### 2.1 SITE_META 상수 (신설)

```typescript
// page.tsx 상단 — 버전·Phase 정보 중앙 관리
const SITE_META = {
  version: "v2.0.0",
  phase: "Phase 3",
  phaseStatus: "진행 중",
  tagline: "통합 플랫폼",
} as const;
```

**Footer에서도 참조**: footer.tsx에서 import하거나, 인라인 상수로 동일 값 사용.

### 2.2 stats 데이터 갱신

```typescript
// 현재 (v1.3 기준, 전부 outdated)
const stats = [
  { value: "57",   label: "API Endpoints" },
  { value: "19",   label: "Services" },
  { value: "450+", label: "Tests" },
  { value: "15",   label: "Sprints" },
];

// 목표 (v2.0 SPEC.md/MEMORY.md 기준)
const stats = [
  { value: "97",   label: "API Endpoints" },
  { value: "39",   label: "Services" },
  { value: "689+", label: "Tests" },
  { value: "24",   label: "Sprints" },
];
```

### 2.3 pillars 데이터 갱신

PRD v5 핵심 5축 중 3가지 차별점으로 재정의:

```typescript
const pillars = [
  {
    icon: Brain,
    title: "PlannerAgent",
    label: "에이전트 통제",
    desc: "AI가 코드를 쓰기 전에 계획을 세우고, 사람이 승인해요. 자율성과 통제의 균형.",
    detail: "코드베이스 리서치 → 계획 수립 → 인간 승인 → 격리 실행",
    color: "axis-primary",
  },
  {
    icon: Layers,
    title: "통합 플랫폼",
    label: "루트 앱 통합",
    desc: "탐색·구축·동기화를 하나의 플랫폼에서. 서비스 간 전환 없이 전 과정을 관리해요.",
    detail: "Discovery-X + AI Foundry + AXIS DS → Foundry-X 통합",
    color: "axis-blue",
  },
  {
    icon: Shield,
    title: "SDD Triangle",
    label: "명세↔코드↔테스트",
    desc: "Spec, Code, Test가 항상 동기화돼요. Git이 진실, Foundry-X는 렌즈.",
    detail: "Plumb 엔진 기반 자동 정합성 검증 + 건강도 점수",
    color: "axis-green",
  },
];
```

### 2.4 ecosystem 데이터 갱신

비전 전환: "수렴" → "통합 플랫폼의 서브 앱"

```typescript
const ecosystem = [
  {
    name: "Discovery-X",
    role: "탐색 · 실험",
    desc: "관찰 → 실험 → 기록 → 자산화",
    color: "axis-green",
    arrow: "실험 → 프로젝트 전환",
  },
  {
    name: "AI Foundry",
    role: "지식 · 구축",
    desc: "SI 산출물 → AI Skill 자산",
    color: "axis-violet",
    arrow: "MCP Skill 도구 제공",
  },
  {
    name: "AXIS DS",
    role: "UI · 일관성",
    desc: "디자인 토큰 + React 컴포넌트",
    color: "axis-blue",
    arrow: "@axis-ds 컴포넌트",
  },
];
```

**EcosystemDiagram 컴포넌트 텍스트 갱신**:
- 중앙 노드 라벨: `"AI 협업 플랫폼"` → `"통합 플랫폼"`

### 2.5 services 데이터 (신설)

```typescript
import { Compass, Cpu, Palette } from "lucide-react";

const services = [
  {
    name: "Discovery-X",
    tagline: "관찰 → 실험 → 기록",
    desc: "데이터 기반으로 기회를 발견하고 검증하는 신사업 발굴 플랫폼이에요. 실험 결과가 Foundry-X 프로젝트로 자동 연결돼요.",
    status: "개발 중 · 80%",
    statusColor: "axis-warm",
    color: "axis-green",
    link: null, // 준비 중 — 링크 없음
    icon: Compass,
  },
  {
    name: "AI Foundry",
    tagline: "요구사항 → 스펙 → 코드",
    desc: "SI 산출물을 AI Skill로 전환하는 파이프라인. 3,924개 스킬을 MCP로 Foundry-X 에이전트에 도구로 제공해요.",
    status: "개발 중 · 90%",
    statusColor: "axis-blue",
    color: "axis-violet",
    link: "https://github.com/IDEA-on-Action/AI-Foundry",
    icon: Cpu,
  },
  {
    name: "AXIS Design System",
    tagline: "디자인 토큰 + React 컴포넌트",
    desc: "팀 공통 UI/UX 체계. OKLch 색공간 기반 토큰과 React 컴포넌트로 일관된 사용자 경험을 보장해요.",
    status: "준비 완료",
    statusColor: "axis-green",
    color: "axis-blue",
    link: "https://github.com/IDEA-on-Action/AXIS-Design-System",
    icon: Palette,
  },
];
```

### 2.6 architecture 데이터 갱신

```typescript
const architecture = [
  {
    layer: "CLI Layer",
    items: ["foundry-x init", "foundry-x sync", "foundry-x status"],
    tech: "TypeScript + Commander + Ink TUI",
  },
  {
    layer: "API Layer",
    items: ["97 Endpoints (OpenAPI)", "39 Services", "MCP Protocol"],
    tech: "Hono on Cloudflare Workers",
  },
  {
    layer: "Agent Layer",
    items: [
      "PlannerAgent (계획 수립)",
      "AgentInbox (비동기 메시지)",
      "WorktreeManager (격리 실행)",
    ],
    tech: "Orchestrator + Runner + Claude API",
  },
  {
    layer: "Data Layer",
    items: ["D1 SQLite (27 Tables)", "KV Cache", "Git (SSOT)"],
    tech: "Cloudflare D1 + simple-git",
  },
];
```

### 2.7 roadmap 데이터 갱신 (4 → 5 Phases)

```typescript
const roadmap = [
  {
    phase: "Phase 1",
    title: "CLI + Plumb",
    version: "v0.1 → v0.5",
    status: "done" as const,
    items: ["CLI 3커맨드", "Ink TUI", "4 Builders", "106 테스트"],
  },
  {
    phase: "Phase 2",
    title: "API + Web + Agent",
    version: "v0.6 → v1.5",
    status: "done" as const,
    items: ["79 API 엔드포인트", "MCP 프로토콜", "PlannerAgent", "에이전트 자동 PR"],
  },
  {
    phase: "Phase 3",
    title: "통합 준비",
    version: "v1.6 → v2.0",
    status: "current" as const,
    items: ["멀티테넌시", "GitHub/Slack 연동", "AXIS DS 전환", "기술 스택 점검"],
  },
  {
    phase: "Phase 4",
    title: "통합 실행",
    version: "v2.1 → v2.2",
    status: "planned" as const,
    items: ["프론트엔드 통합", "인증 SSO", "API BFF→모듈 통합", "D1 스키마 통합"],
  },
  {
    phase: "Phase 5",
    title: "고객 파일럿",
    version: "v3.0",
    status: "planned" as const,
    items: ["KT DS SR 시나리오", "외부 고객 파일럿", "엔터프라이즈 배포"],
  },
];
```

---

## 3. Component 설계

### 3.1 ServiceCards 컴포넌트 (신설)

Ecosystem 섹션 아래에 배치. 각 서비스의 상세 소개 + 링크 + 상태를 표시.

```
┌─────────────────────────────────────────────────────────────┐
│  Our Services                                                │
│  "Foundry-X 생태계를 구성하는 서비스들"                         │
│                                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │ 🧭 Discovery-X  │ │ ⚙️ AI Foundry   │ │ 🎨 AXIS DS     ││
│  │                 │ │                 │ │                 ││
│  │ 관찰→실험→기록   │ │ 요구사항→코드    │ │ 토큰+컴포넌트    ││
│  │                 │ │                 │ │                 ││
│  │ 데이터 기반으로  │ │ SI 산출물을 AI  │ │ OKLch 기반 토큰  ││
│  │ 기회를 발견하고  │ │ Skill로 전환... │ │ 과 React 컴포... ││
│  │ 검증하는...     │ │                 │ │                 ││
│  │                 │ │                 │ │                 ││
│  │ [개발 중 · 80%] │ │ [개발 중 · 90%] │ │ [준비 완료]      ││
│  │                 │ │  → GitHub ↗     │ │  → GitHub ↗     ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**AXIS DS 스타일링**:
- 카드: `.axis-glass` (기존 유틸리티 — 5% bg + 12px blur + 8% border)
- 아이콘 배경: `bg-{svc.color}/10` (기존 패턴)
- 상태 배지: `bg-{svc.statusColor}/10 text-{svc.statusColor}` (rounded-md, font-mono, text-[10px])
- 링크: `hover:text-axis-primary` 트랜지션
- 호버: `hover:border-axis-primary/20 hover:bg-axis-primary/5` (기존 패턴)

**JSX 구조**:

```tsx
function ServiceCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {services.map((svc) => (
        <div
          key={svc.name}
          className="axis-glass group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-axis-primary/20 hover:bg-axis-primary/5"
        >
          {/* Icon + Name */}
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-xl transition-colors group-hover:bg-axis-primary/20"
              style={{
                backgroundColor: `color-mix(in oklch, var(--${svc.color}) 10%, transparent)`,
              }}
            >
              <svc.icon
                className="size-5"
                style={{ color: `var(--${svc.color})` }}
              />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">{svc.name}</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                {svc.tagline}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            {svc.desc}
          </p>

          {/* Status badge + Link */}
          <div className="mt-4 flex items-center justify-between">
            <span
              className="rounded-md px-2 py-0.5 font-mono text-[10px] font-medium"
              style={{
                backgroundColor: `color-mix(in oklch, var(--${svc.statusColor}) 10%, transparent)`,
                color: `var(--${svc.statusColor})`,
              }}
            >
              {svc.status}
            </span>
            {svc.link && (
              <a
                href={svc.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-axis-primary"
              >
                GitHub
                <ArrowUpRight className="size-3" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 3.2 RoadmapTimeline 그리드 변경

5 Phase를 수용하기 위해 레이아웃 조정:

**현재**: `md:grid-cols-4` (4 Phase)

**변경**: `md:grid-cols-5` — 5개가 한 행에 들어가되, 각 카드 너비가 좁아지므로 텍스트를 간결하게 유지.

**대안** (카드가 너무 좁으면): `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` — 모바일 2열, 태블릿 3열, 데스크톱 5열.

### 3.3 Hero 섹션 갱신

```tsx
// 버전 배지
<span className="font-mono text-xs font-medium text-axis-primary">
  {SITE_META.version} &middot; {SITE_META.phase} {SITE_META.phaseStatus}
</span>

// 헤드라인, 서브헤드 — 텍스트는 유지 (PRD v5 태그라인과 일치)
// "사람과 AI가 함께 만드는 곳" — 변경 불필요
```

### 3.4 Ecosystem 섹션 텍스트 갱신

```tsx
// 섹션 헤드라인
<h2>AX BD팀 <span>제품 생태계</span></h2>
<p>세 서비스가 Foundry-X 통합 플랫폼으로 하나가 돼요.</p>
// 변경: "수렴해요" → "하나가 돼요"

// 중앙 노드 라벨
<span>통합 플랫폼</span>
// 변경: "AI 협업 플랫폼" → "통합 플랫폼"
```

---

## 4. 섹션 배치 순서

```
┌─────────────────────────────────┐
│ Hero (버전 배지 + 헤드라인)       │  ← SITE_META.version 갱신
├─────────────────────────────────┤
│ Stats Bar (4 수치)               │  ← 97/39/689+/24 갱신
├─────────────────────────────────┤
│ Core Pillars (3 카드)            │  ← 통합 플랫폼 비전 반영
├─────────────────────────────────┤
│ Ecosystem BluePrint (다이어그램)  │  ← 텍스트 "통합" 비전
├─────────────────────────────────┤
│ ★ Services (3 카드) — 신설       │  ← 각 서비스 상세 소개
├─────────────────────────────────┤
│ Architecture (4 레이어)          │  ← 수치 갱신
├─────────────────────────────────┤
│ Roadmap (5 Phase)               │  ← 4→5 Phase 재구성
├─────────────────────────────────┤
│ Quick Start (터미널 카드)         │  ← 변경 없음
├─────────────────────────────────┤
│ Final CTA                        │  ← 변경 없음
└─────────────────────────────────┘
```

Services 섹션은 **Ecosystem 바로 아래**에 배치:
- Ecosystem이 "어떻게 연결되는가"(고수준 다이어그램)
- Services가 "각 서비스가 뭔지"(상세 소개)
- 자연스러운 줌인 흐름

---

## 5. Navbar + Footer 설계

### 5.1 Navbar

```typescript
// navLinks에 Services 추가
const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#services", label: "Services" },  // 신설
  { href: "#ecosystem", label: "Ecosystem" },
  { href: "#architecture", label: "Architecture" },
  { href: "#roadmap", label: "Roadmap" },
];
```

### 5.2 Footer

```typescript
// 버전 동적화 — 하단 표시
<p className="font-mono text-xs text-muted-foreground/60">
  v2.0.0 &middot; Phase 3
</p>

// Ecosystem 링크 업데이트
const footerLinks = {
  Product: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Agents", href: "/agents" },
    { label: "Architecture", href: "/architecture" },
    { label: "Wiki", href: "/wiki" },
  ],
  Ecosystem: [
    { label: "AI Foundry", href: "https://github.com/IDEA-on-Action/AI-Foundry" },
    { label: "AXIS Design System", href: "https://github.com/IDEA-on-Action/AXIS-Design-System" },
    { label: "Discovery-X", href: "#" },  // 준비 중 유지
  ],
  Community: [
    { label: "GitHub", href: "https://github.com/KTDS-AXBD/Foundry-X" },
    { label: "npm", href: "https://www.npmjs.com/package/foundry-x" },
  ],
};
```

---

## 6. E2E 테스트 수정

### 6.1 landing.spec.ts

현재 영문 헤드라인("Where Humans & AI", "Forge Together")을 체크 — F74 이후 한국어로 바뀌었으므로 갱신 필요:

```typescript
test("renders hero with Foundry-X branding", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /사람과 AI가/i }),
  ).toBeVisible();
  await expect(page.getByText("함께 만드는 곳")).toBeVisible();
});
```

### 6.2 smoke.spec.ts

이미 한국어("사람과 AI가", "함께 만드는 곳")로 검증 — **변경 불필요**.

---

## 7. AXIS Design System 활용 전략

### 7.1 현재 활용 수준

| 영역 | 활용도 | 상태 |
|------|:------:|------|
| CSS 토큰 (`--axis-*`) | 100% | globals.css에 정의, light/dark 모드 |
| Tailwind 통합 (`bg-axis-primary` 등) | 100% | `@theme inline` 연동 |
| 유틸리티 클래스 (`.axis-glass` 등) | 6개 | 랜딩+대시보드 공용 |
| `@axis-ds` npm 패키지 | 0% | 미사용 (F104에서 전환 예정) |

### 7.2 이번 작업의 AXIS DS 활용

| 요소 | AXIS DS 적용 |
|------|-------------|
| ServiceCards 카드 | `.axis-glass` + `color-mix(in oklch, var(--axis-*))` |
| 상태 배지 | `var(--axis-warm)`, `var(--axis-green)`, `var(--axis-blue)` 동적 참조 |
| 호버/트랜지션 | `hover:border-axis-primary/20 hover:bg-axis-primary/5` (기존 패턴) |
| 아이콘 배경 | `color-mix` + `var(--axis-{color})` 패턴 (EcosystemDiagram과 동일) |
| 섹션 라벨 | `font-mono text-xs tracking-widest text-axis-primary uppercase` |

### 7.3 F104(AXIS DS UI 전환)와의 관계

- F119는 **데이터/콘텐츠 갱신** — 기존 AXIS 토큰 체계를 그대로 활용
- F104는 **컴포넌트 전환** — shadcn/ui → `@axis-ds/react` 패키지로 전환
- F119가 먼저 실행되고, F104에서 컴포넌트가 바뀌더라도 데이터 구조는 유지됨

---

## 8. Implementation Checklist

### Step 1: 데이터 갱신 (~30줄)
- [ ] `SITE_META` 상수 추가
- [ ] `stats` 수치 갱신 (97/39/689+/24)
- [ ] `architecture` 수치 갱신 (97 Endpoints, 39 Services, 27 Tables)
- [ ] Hero 버전 배지에 `SITE_META` 참조

### Step 2: 생태계 비전 (~15줄)
- [ ] `ecosystem` const: role/desc 텍스트 갱신
- [ ] `EcosystemDiagram` 중앙 노드 라벨: "통합 플랫폼"
- [ ] 섹션 서브헤드: "하나가 돼요"

### Step 3: Core Pillars (~15줄)
- [ ] `pillars` const: 2번째 카드를 "통합 플랫폼"으로 재정의
- [ ] detail 텍스트 갱신

### Step 4: Services 섹션 신설 (~80줄)
- [ ] `services` const 추가 (3개 서비스 데이터)
- [ ] `ServiceCards` 컴포넌트 구현
- [ ] 페이지에 `id="services"` 섹션 추가 (Ecosystem과 Architecture 사이)
- [ ] lucide 아이콘 import 추가 (Compass, Cpu, Palette, ArrowUpRight)

### Step 5: 로드맵 5-Phase (~25줄)
- [ ] `roadmap` const: 5 Phase 데이터
- [ ] `RoadmapTimeline`: `md:grid-cols-5` 또는 반응형 그리드

### Step 6: Navbar + Footer (~10줄)
- [ ] navbar: navLinks에 Services 추가
- [ ] footer: 버전 `v2.0.0 · Phase 3`으로 갱신

### Step 7: E2E 테스트 (~5줄)
- [ ] landing.spec.ts: 영문→한국어 헤드라인 수정

---

## 9. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 5-Phase 로드맵이 모바일에서 레이아웃 깨짐 | Low | 반응형 grid-cols 조합 (2/3/5) |
| Discovery-X 링크 미준비 | Low | `link: null` → 링크 버튼 미표시 |
| landing.spec.ts 수정이 CI 깨뜨림 | Medium | 구현 시 함께 수정, typecheck 전에 확인 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-20 | Initial draft | AX BD팀 |
