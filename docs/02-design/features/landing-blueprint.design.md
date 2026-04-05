---
code: FX-DSGN-015
title: Blueprint 랜딩 페이지 비주얼 전환 — 상세 설계
version: 1.0
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
feature: landing-blueprint
plan: "[[FX-PLAN-015]]"
---

## 1. 설계 개요

FX-PLAN-015 기반 Blueprint 랜딩 페이지 상세 설계.
landing.tsx 전면 리라이트 — 기존 데이터 구조 유지, 렌더링만 Blueprint 스타일로 전환.

### 1.1 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `packages/web/src/routes/landing.tsx` | **전면 리라이트** | 9개 컴포넌트 + Component() 리디자인 |
| `packages/web/src/components/landing/navbar.tsx` | 미세 조정 | bp-line 색상 적용, 배경 투명도 조절 |
| `packages/web/src/components/landing/footer.tsx` | 미세 조정 | bp-box 테두리, bp-annotation 스타일 |
| `packages/web/src/app/globals.css` | 유지 | bp-* 클래스 이미 추가됨 (세션 #198) |

### 1.2 유지 사항 (변경 금지)
- 데이터 상수: `SITE_META_FALLBACK`, `STATS_FALLBACK`, `pillars`, `agents`, `architecture`, `roadmap`, `ecosystem`, `processSteps`
- TinaCMS 연동: `parseFrontmatter`, `heroRaw`, `sectionOrder`, `getSectionOrder()`
- import 구조: lucide-react 아이콘, react-router-dom Link
- content/ Markdown 파일

## 2. 섹션별 상세 설계

### 2.1 Hero 섹션

**현재**: 중앙 정렬, 그래디언트 텍스트, 작은 Phase 뱃지, 3개 value proposition 카드
**Blueprint**: 2컬럼 비대칭 레이아웃, 좌측 대형 타이포, 우측 수치 측정 주석

```
┌─────────────────────────────────────────────────────┐
│  bp-bg (설계도 그리드)                                │
│                                                      │
│  ┌─ Phase badge (bp-annotation) ──────────┐          │
│  │ Sprint 137 · Phase 12                  │          │
│  └────────────────────────────────────────┘          │
│                                                      │
│  ┌─ 좌측 (col-span-7) ──────────────────┐ ┌─ 우측 ─┐│
│  │  AI 에이전트가                        │ │ 89     ││
│  │  일하는 방식을                        │ │ ROUTES ││
│  │  설계하다                             │ │ ─────  ││
│  │                                       │ │ 206    ││
│  │  [서브헤딩 — bp-line 색상]            │ │ SRVCS  ││
│  │                                       │ │ ─────  ││
│  │  ┌─ CTA ────┐ ┌─ GitHub ──┐          │ │ 3,148  ││
│  │  │Dashboard │ │ GitHub    │          │ │ TESTS  ││
│  │  └──────────┘ └───────────┘          │ │ ─────  ││
│  └───────────────────────────────────────┘ │ 137    ││
│                                             │ SPRINTS││
│                                             └────────┘│
└─────────────────────────────────────────────────────┘
```

**JSX 구조:**
```tsx
<section className="bp-bg relative min-h-[92vh] px-6 pt-16">
  <div className="mx-auto max-w-6xl">
    {/* Phase badge */}
    <div className="bp-annotation mb-6 inline-block border border-current/20 px-3 py-1">
      {SITE_META.sprint} · {SITE_META.phase}
    </div>

    <div className="grid gap-12 lg:grid-cols-12">
      {/* 좌측: 헤드라인 + CTA */}
      <div className="lg:col-span-7">
        <h1 className="bp-line font-display text-5xl font-bold leading-[1.1] sm:text-6xl md:text-7xl">
          AI 에이전트가<br/>일하는 방식을<br/>설계하다
        </h1>
        <p className="bp-line/70 mt-6 max-w-lg text-lg">
          수집→발굴→형상화→검증→제품화→GTM→평가 —
          BDP 7단계를 AI 에이전트가 자동화해요.
        </p>
        {/* CTA 버튼: bp-box 스타일 */}
        <div className="mt-8 flex gap-4">
          <Link to="/dashboard" className="bp-box px-6 py-3 font-bold bp-line hover:bg-axis-primary/10">
            Dashboard 열기 →
          </Link>
          <a href="..." className="bp-box px-6 py-3 bp-line/60">GitHub</a>
        </div>
      </div>

      {/* 우측: 수치 측정 주석 */}
      <div className="lg:col-span-5 flex flex-col justify-center gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bp-box p-4 flex items-baseline gap-3">
            <span className="bp-line font-display text-3xl font-bold">{stat.value}</span>
            <span className="bp-annotation uppercase tracking-widest">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
```

**반응형:**
- `lg:` (1024px+): 7:5 그리드, 수치 우측 배치
- `md:` (768px): 동일 그리드, 폰트 축소
- `< md`: 1컬럼 스택, 수치는 헤드라인 아래 가로 나열

### 2.2 Stats Bar — Hero에 통합

기존 독립 Stats Bar 섹션을 **Hero 우측에 통합** (위 2.1 참조).
별도 Stats 섹션은 삭제하고, Hero의 우측 컬럼이 Stats 역할을 겸함.

### 2.3 Process Flow 섹션 (가장 복잡)

**현재**: 7개 둥근 아이콘 카드 가로 나열
**Blueprint**: 플로우차트 — 다이아몬드(의사결정) + 프로세스 박스 + 화살표

```
┌─────────────────────────────────────────────────┐
│  BDP 7-STEP PROCESS (bp-annotation 라벨)        │
│                                                  │
│  ◇ → [01 수집] → ◇ → [02 발굴] → ◇ → [03 형상화]│
│                                    ↓             │
│  [07 평가] ← ◇ ← [06 GTM] ← ◇ ← [05 제품화]    │
│                                    ↑             │
│                               [04 검증]          │
└─────────────────────────────────────────────────┘
```

**JSX 구조:**
```tsx
function ProcessFlow() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
      {processSteps.map((step, i) => (
        <Fragment key={step.step}>
          {/* 다이아몬드 (의사결정 노드) */}
          {i > 0 && <div className="bp-diamond shrink-0"><span className="sr-only">→</span></div>}
          {/* 프로세스 박스 */}
          <div className="bp-box group relative px-4 py-3 transition-colors hover:bg-axis-primary/5">
            <div className="flex items-center gap-2">
              <span className="bp-annotation font-bold">{step.step}</span>
              <step.icon className="size-4 bp-line" />
            </div>
            <h3 className="bp-line font-display text-sm font-bold mt-1">{step.title}</h3>
            {/* 호버 시 설명 표시 */}
            <div className="hidden group-hover:block absolute top-full left-0 z-20 mt-1 w-48 bp-box p-3">
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          </div>
          {/* 화살표 (마지막 제외) */}
          {i < processSteps.length - 1 && (
            <span className="bp-line text-lg hidden md:inline">→</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
```

**반응형:**
- `md+`: 가로 플로우 (다이아몬드 + 박스 + 화살표 일렬)
- `< md`: 세로 스택 (박스만, 다이아몬드는 세로 구분선으로 대체)

### 2.4 Pillars 섹션

**현재**: 3열 둥근 글래스 카드
**Blueprint**: 3열 bp-box + bp-annotation 라벨

```tsx
function PillarGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {pillars.map(p => (
        <div key={p.title} className="bp-box p-6 transition-colors hover:bg-axis-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <p.icon className="size-6 bp-line" />
            <span className="bp-annotation uppercase">{p.label}</span>
          </div>
          <h3 className="bp-line font-display text-lg font-bold">{p.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
          <div className="mt-4 border-t border-current/10 pt-3">
            <span className="bp-annotation">{p.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 2.5 Agent Grid 섹션

**현재**: 3×2 둥근 글래스 카드
**Blueprint**: 회로도 스타일 — bp-box + 좌측 핀 마커 + 상태 LED

```tsx
function AgentGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map(agent => (
        <div key={agent.name} className="bp-box group relative p-5 transition-colors hover:bg-axis-primary/5">
          {/* 좌측 핀 마커 */}
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-axis-primary border border-background" />
          <div className="flex items-center gap-3 mb-3">
            <agent.icon className="size-5 bp-line" />
            <div>
              <h3 className="bp-line font-display text-sm font-bold">{agent.name}</h3>
              <span className="bp-annotation">{agent.role}</span>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{agent.desc}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2.6 Architecture 섹션

**현재**: 스택 레이어 + 뱃지 나열
**Blueprint**: 시스템 다이어그램 — 4단 박스 + 세로 화살표

```
┌──────────────────────────────────────────┐
│  4-LAYER ARCHITECTURE (bp-annotation)    │
│                                          │
│  ┌─ CLI Layer ──────────────────────┐    │
│  │ init   sync   status             │    │
│  │ TypeScript + Commander + Ink      │    │
│  └──────────────┬───────────────────┘    │
│                 ↓                        │
│  ┌─ API Layer ──────────────────────┐    │
│  │ ~89 Routes  ~206 Services        │    │
│  │ Hono on Cloudflare Workers        │    │
│  └──────────────┬───────────────────┘    │
│                 ↓                        │
│  ┌─ Agent Layer ────────────────────┐    │
│  │ BMC  Insight  Review  Architect   │    │
│  │ Orchestrator + MCP + Multi-Model  │    │
│  └──────────────┬───────────────────┘    │
│                 ↓                        │
│  ┌─ Data Layer ─────────────────────┐    │
│  │ D1 SQLite    KV Cache    Git     │    │
│  │ Cloudflare D1 + simple-git        │    │
│  └──────────────────────────────────┘    │
└──────────────────────────────────────────┘
```

```tsx
function ArchitectureBlueprint() {
  return (
    <div className="bp-bg rounded-lg p-6 space-y-0">
      {architecture.map((layer, i) => (
        <Fragment key={layer.layer}>
          <div className="bp-box p-4 relative">
            <div className="flex items-start gap-4">
              <div className="min-w-[120px]">
                <span className="bp-line font-display text-sm font-bold">{layer.layer}</span>
                <br/>
                <span className="bp-annotation">{layer.tech}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {layer.items.map(item => (
                  <span key={item} className="bp-box px-2.5 py-1 font-mono text-[11px] bp-line">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {/* 레이어 간 화살표 */}
          {i < architecture.length - 1 && (
            <div className="flex justify-center py-1">
              <span className="bp-line text-lg">↓</span>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
```

### 2.7 Ecosystem 섹션

**현재**: 중앙 pulse 노드 + 3개 위성
**Blueprint**: 연결 다이어그램 — 중앙 원 + 실선 연결

```tsx
function EcosystemDiagram() {
  return (
    <div className="relative mx-auto max-w-2xl py-8">
      {/* 중앙 노드 */}
      <div className="mx-auto flex w-fit flex-col items-center">
        <div className="bp-box flex size-28 items-center justify-center rounded-full">
          <div className="flex flex-col items-center gap-1">
            <Anvil className="size-8 bp-line" />
            <span className="bp-line font-display text-xs font-bold">Foundry-X</span>
          </div>
        </div>
        <span className="bp-annotation mt-2 uppercase tracking-widest">오케스트레이션</span>
      </div>
      {/* 연결선 + 위성 노드 */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        {ecosystem.map(svc => (
          <div key={svc.name} className="flex flex-col items-center gap-3">
            <div className="h-8 w-px bg-current/20" />
            <span className="bp-annotation">{svc.arrow}</span>
            <div className="bp-box w-full p-4 text-center">
              <span className="bp-line font-display text-sm font-bold">{svc.name}</span>
              <br/>
              <span className="bp-annotation">{svc.role}</span>
              <p className="mt-1 text-[11px] text-muted-foreground">{svc.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2.8 Roadmap 섹션

**현재**: 6열 카드 그리드
**Blueprint**: Gantt 바 차트 스타일 — 수평 바 + Phase 라벨

```tsx
function RoadmapTimeline() {
  return (
    <div className="space-y-3">
      {roadmap.map(phase => (
        <div key={phase.phase} className="flex items-center gap-4">
          {/* Phase 라벨 */}
          <div className="w-28 shrink-0">
            <span className="bp-line font-display text-sm font-bold">{phase.phase}</span>
            <br/>
            <span className="bp-annotation">{phase.version}</span>
          </div>
          {/* Gantt 바 */}
          <div className="flex-1">
            <div className="bp-box flex items-center gap-3 px-4 py-2">
              <span className="bp-line font-bold text-sm">{phase.title}</span>
              <span className="text-xs text-muted-foreground">
                {phase.items.join(" · ")}
              </span>
              {phase.status === "done" && (
                <span className="ml-auto bp-annotation">✓ DONE</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**반응형:**
- `md+`: Phase 라벨 좌측 + Gantt 바 우측 (가로 레이아웃)
- `< md`: 라벨 위 + 바 아래 (세로 스택)

### 2.9 CTA 섹션

```tsx
<section className="px-6 py-24">
  <div className="mx-auto max-w-3xl text-center">
    <h2 className="bp-line font-display text-3xl font-bold">
      AI 에이전트와 함께<br/>사업개발을 자동화하세요
    </h2>
    <p className="mt-6 text-lg text-muted-foreground">...</p>
    <div className="mt-10 flex justify-center gap-4">
      <Link to="/dashboard" className="bp-box px-7 py-3 font-bold bp-line hover:bg-axis-primary/10">
        시작하기 →
      </Link>
      <a href="..." className="bp-box px-7 py-3 bp-line/60">GitHub ↗</a>
    </div>
  </div>
</section>
```

### 2.10 Navbar 미세 조정

| 변경 | 현재 | Blueprint |
|------|------|-----------|
| 스크롤 배경 | `bg-background/80 backdrop-blur-xl` | `bp-bg/90 backdrop-blur-sm` |
| CTA 버튼 | `bg-axis-primary text-white` | `bp-box bp-line font-bold` |
| 로고 배경 | `bg-axis-primary/10 rounded-lg` | `bp-box rounded-lg` |

### 2.11 Footer 미세 조정

| 변경 | 현재 | Blueprint |
|------|------|-----------|
| 상단 보더 | `border-border/50` | `border-current/20` (bp-line 계열) |
| 링크 호버 | `hover:text-axis-primary` | `hover:bp-line` |

## 3. Component() 최상위 구조

```tsx
export function Component() {
  // 섹션 순서 (TinaCMS sort_order 기반)
  const sections = [
    { key: "hero", order: getSectionOrder("hero"), render: () => <HeroSection /> },
    { key: "process", order: getSectionOrder("process"), render: () => <ProcessSection /> },
    { key: "features", order: getSectionOrder("features"), render: () => <PillarsSection /> },
    { key: "agents", order: getSectionOrder("agents"), render: () => <AgentsSection /> },
    { key: "architecture", order: getSectionOrder("architecture"), render: () => <ArchitectureSection /> },
    { key: "ecosystem", order: getSectionOrder("ecosystem"), render: () => <EcosystemSection /> },
    { key: "roadmap", order: getSectionOrder("roadmap"), render: () => <RoadmapSection /> },
    { key: "cta", order: getSectionOrder("cta"), render: () => <CTASection /> },
  ].sort((a, b) => a.order - b.order);

  return (
    <div className="bp-bg relative overflow-hidden">
      {sections.map(s => <Fragment key={s.key}>{s.render()}</Fragment>)}
    </div>
  );
}
```

**핵심 변경**: `grain-overlay` → `bp-bg` (최상위 배경)

## 4. 섹션 헤더 공통 패턴

모든 섹션(Process, Pillars, Agents, Architecture, Ecosystem, Roadmap)의 헤더는 동일 패턴:

```tsx
function SectionHeader({ label, title, desc }: { label: string; title: React.ReactNode; desc: string }) {
  return (
    <div className="mb-16 text-center">
      <span className="bp-annotation mb-4 inline-block uppercase tracking-widest">{label}</span>
      <h2 className="bp-line font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg text-muted-foreground">{desc}</p>
    </div>
  );
}
```

**현재와 차이**: `text-axis-primary` → `bp-annotation`, 헤드라인 `bp-line` 단색

## 5. 검증 항목

| # | 항목 | 검증 방법 | PASS 기준 |
|---|------|----------|-----------|
| V1 | Hero 2컬럼 레이아웃 | 1440px 스크린샷 | 좌측 타이포 + 우측 수치 |
| V2 | Process 플로우차트 | 시각적 확인 | 다이아몬드 + 박스 + 화살표 |
| V3 | Architecture 다이어그램 | 시각적 확인 | 4단 박스 + 세로 화살표 |
| V4 | Roadmap Gantt 바 | 시각적 확인 | 수평 바 + Phase 라벨 |
| V5 | 다크 모드 | 테마 토글 | bp-* 클래스 다크 변형 |
| V6 | 모바일 375px | 브라우저 축소 | 1컬럼 스택, 깨짐 없음 |
| V7 | typecheck | `turbo typecheck` | 0 errors |
| V8 | E2E 기존 통과 | `pnpm e2e` | 기존 테스트 회귀 없음 |
| V9 | TinaCMS 연동 | hero.md 수정 | 수치 반영 확인 |
| V10 | 설계도 그리드 배경 | 시각적 확인 | bp-bg 그리드 라인 표시 |

## 6. 구현 순서

1. `SectionHeader` 공통 컴포넌트 추출
2. Hero 섹션 리디자인 (Stats Bar 통합)
3. Process Flow 플로우차트 구현
4. Architecture 시스템 다이어그램
5. Roadmap Gantt 바
6. Pillars, Agents, Ecosystem bp-box 전환
7. CTA 섹션
8. Navbar/Footer 미세 조정
9. Component() 최상위 래퍼 bp-bg 적용
10. 반응형 + 다크 모드 검증
