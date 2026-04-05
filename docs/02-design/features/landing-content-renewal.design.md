---
code: FX-DSGN-016
title: 랜딩 페이지 콘텐츠 리뉴얼 — 상세 설계
version: 1.0
status: Active
category: DSGN
feature: F332
sprint: Sprint 147
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
references:
  - "[[FX-PLAN-016]]"
  - "[[FX-DSGN-015]]"
---

# FX-DSGN-016: 랜딩 페이지 콘텐츠 리뉴얼 — 상세 설계

## §1 데이터 상수 변경

### 1.1 SITE_META_FALLBACK

```ts
const SITE_META_FALLBACK = {
  sprint: "Sprint 147",
  phase: "Phase 13 진행 중",
  phaseTitle: "IA 재설계",
  tagline: "사업기회 발굴부터 데모까지, AI가 자동화하는 BD 플랫폼",
} as const;
```

### 1.2 STATS_FALLBACK — 사용자 중심 수치

```ts
const STATS_FALLBACK = [
  { value: "6", label: "BD 파이프라인" },
  { value: "10+", label: "AI 에이전트" },
  { value: "22", label: "자동화 스킬" },
  { value: "147", label: "Sprints" },
];
```

### 1.3 pillars — SDD Triangle → 오케스트레이션

```ts
const pillars = [
  {
    icon: Brain,
    title: "BDP 라이프사이클",
    label: "6단계 자동화",
    desc: "수집→발굴→형상화→검증→제품화→GTM. 사업개발 전체를 한 곳에서.",
    detail: "AX BD 프로세스 v8.2 기반, 5유형(I/M/P/T/S) 분류 + 사업성 체크포인트",
  },
  {
    icon: Target,
    title: "AI 에이전트 파이프라인",
    label: "10+ 에이전트 · 멀티모델",
    desc: "BMC 초안, 인사이트 도출, 다중 AI 검토, PRD 자동 생성. 발굴에서 실행까지.",
    detail: "Anthropic + OpenAI + Gemini + DeepSeek 멀티모델 파이프라인",
  },
  {
    icon: Layers,   // import 변경: Shield → Layers 유지 (이미 import됨)
    title: "오케스트레이션",
    label: "에이전트 조율 · 품질 보장",
    desc: "에이전트들이 병렬로 일하고, 결과를 자동 검증하고, 품질 기준을 강제해요.",
    detail: "O-G-D 적대적 루프 + Gap Analysis 90%+ 통과 + Sprint 자동화",
  },
];
```

### 1.4 processSteps — 6+1 (평가 비활성)

```ts
const processSteps = [
  { step: "01", title: "수집", desc: "시장/트렌드/경쟁사 데이터 자동 수집 (Discovery-X 연동)", icon: Scan, active: true },
  { step: "02", title: "발굴", desc: "아이디어 등록 + 5유형(I/M/P/T/S) 분류 + 사업성 체크포인트", icon: Lightbulb, active: true },
  { step: "03", title: "형상화", desc: "BMC 에디터 + AI 초안 + PRD 자동 작성 + 다중 AI 검토", icon: PenTool, active: true },
  { step: "04", title: "검증", desc: "본부/전사/임원 3단계 검증 + Go/Hold/Drop 의사결정", icon: CheckCircle2, active: true },
  { step: "05", title: "제품화", desc: "PoC/MVP 자동 구축 — AI 에이전트가 코드·테스트·배포 처리", icon: Rocket, active: true },
  { step: "06", title: "GTM", desc: "제안서·Offering Pack·데모 환경 자동 생성", icon: Megaphone, active: true },
  { step: "07", title: "평가", desc: "KPI 추적 + 포트폴리오 대시보드 + Go/Kill 판단", icon: BarChart3, active: false },
];
```

### 1.5 agents — 3그룹 구조

```ts
interface AgentGroup {
  group: string;
  label: string;
  agents: { name: string; role: string; icon: LucideIcon }[];
}

const agentGroups: AgentGroup[] = [
  {
    group: "발굴",
    label: "Discover · 기회를 찾다",
    agents: [
      { name: "InsightAgent", role: "아이디어→기회 발굴", icon: Lightbulb },
      { name: "BMCAgent", role: "BMC 자동 작성", icon: PenTool },
      { name: "DiscoveryAgent", role: "시장/트렌드 수집", icon: Scan },
    ],
  },
  {
    group: "형상화",
    label: "Shape · 기회를 구체화하다",
    agents: [
      { name: "ShapingAgent", role: "PRD 자동 생성", icon: PenTool },
      { name: "OGD Loop", role: "적대적 품질 검증", icon: Shield },
      { name: "SixHats", role: "다각도 토론", icon: Brain },
      { name: "ReviewAgent", role: "멀티AI 교차 검토", icon: Eye },
    ],
  },
  {
    group: "실행",
    label: "Execute · 구현하고 배포하다",
    agents: [
      { name: "SprintAgent", role: "자동 구현 (Plan→Code)", icon: Rocket },
      { name: "TestAgent", role: "테스트 자동 생성", icon: TestTube },
      { name: "DeployAgent", role: "배포 자동화", icon: ArrowUpRight },
    ],
  },
];
```

### 1.6 architecture → systemFlow (시스템 구성도)

```ts
interface SystemNode {
  name: string;
  desc: string;
  tech: string;
  icon: LucideIcon;
}

const systemFlow: SystemNode[] = [
  { name: "사용자", desc: "웹 브라우저", tech: "fx.minu.best", icon: /* User or Monitor */ Eye },
  { name: "Web Dashboard", desc: "시각화 · 관리", tech: "React + Vite", icon: Layers },
  { name: "API Server", desc: "비즈니스 로직", tech: "Hono on CF Workers", icon: GitBranch },
  { name: "AI 에이전트", desc: "자동화 파이프라인", tech: "멀티모델 오케스트레이션", icon: Brain },
  { name: "Data Store", desc: "영속 저장소", tech: "D1 SQLite + Git", icon: Shield },
];
```

### 1.7 ecosystem → openSourcePartners

```ts
const openSourcePartners = [
  { name: "gstack", role: "코드리뷰 · QA · 배포", desc: "AI 기반 코드 리뷰, QA 자동화, 원클릭 배포" },
  { name: "bkit", role: "PDCA 사이클 관리", desc: "Plan→Design→Do→Check→Act 전체 사이클 자동화" },
  { name: "OpenSpec", role: "명세 자동화", desc: "Spec ↔ Code ↔ Test 동기화 엔진" },
  { name: "TinaCMS", role: "콘텐츠 관리", desc: "랜딩 페이지·위키 콘텐츠를 Git 기반으로 편집" },
  { name: "Marker.io", role: "피드백 수집", desc: "스크린샷 기반 시각 피드백 → 자동 이슈 생성" },
];
```

### 1.8 roadmap — 핵심 마일스톤 4개

```ts
const roadmap = [
  { phase: "기반 구축", version: "Sprint 1~74", status: "done" as const,
    items: ["CLI + API + Web Dashboard", "SSO + RBAC 멀티테넌시", "6종 AI Agent 기반"] },
  { phase: "BD 자동화", version: "Sprint 75~121", status: "done" as const,
    items: ["BD Pipeline E2E 통합", "O-G-D Agent Loop", "IA 대개편 12 F-items"] },
  { phase: "현재", version: "Sprint 122~147", status: "current" as const,
    items: ["Skill Unification", "TinaCMS + Marker.io", "IA 재설계 v1.3"] },
  { phase: "다음 목표", version: "Phase 14+", status: "planned" as const,
    items: ["평가 프레임워크", "팀 확산 온보딩", "외부 공개 준비"] },
];
```

## §2 컴포넌트 설계

### 2.1 HeroSection — 직설형 메시지

```
┌────────────────────────────────���─────────────────────┐
│ [bp-annotation] Sprint 147 · Phase 13 IA 재설계      │
│                                                      │
│ ┌─ 7:5 grid ────────────────────────────────────┐   │
│ │ 사업기회 발굴부터       │ ┌──────────────────┐ │   │
│ │ 데모까지,              │ │ 6  BD 파이프라인  │ │   │
│ │ AI가 자동화해요         │ │ 10+ AI 에이전트  │ │   │
│ │                        │ │ 22  자동화 스킬   │ │   │
│ │ [BDP 6단계를 AI 에이전트│ │ 147 Sprints     │ │   │
│ │  가 자동으로 처리...]   │ └──────────────────┘ │   │
│ │                        │                      │   │
│ │ [Dashboard 열기] [GitHub]│                     │   │
│ └────────────────────────┴──────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

헤드라인 JSX:
```tsx
<h1 className="bp-line font-display text-5xl font-bold leading-[1.1] sm:text-6xl md:text-7xl">
  사업기회 발굴부터
  <br />
  데모까지,
  <br />
  AI가 자동화해요
</h1>
```

### 2.2 ProcessFlow — 6+1 비활성 표시

7번째 단계에 `active: false` 일 때:
```tsx
<div className={`bp-box ... ${!step.active ? "opacity-40 border-dashed" : ""}`}>
  ...
  {!step.active && (
    <span className="bp-annotation text-[10px]">향후 구현</span>
  )}
</div>
```

시각 효과:
- `opacity-40`: 반투명
- `border-dashed`: 점선 테두리
- "향후 구현" 라벨

### 2.3 AgentGroupGrid — 3그룹 시각화 (핵심)

```
┌─ 발굴 ─────────┐    ┌─ 형상화 ──────────┐    ┌─ 실행 ─────────┐
│ Discover         │ →  │ Shape              │ →  │ Execute         │
│ 기회를 찾다      │    │ 기회를 구체화하다  │    │ 구현하고 배포   │
│                  │    │                    │    │                 │
│ ┌──────────────┐│    │ ┌────────────────┐ │    │ ┌─────────────┐│
│ │ InsightAgent ││    │ │ ShapingAgent   │ │    │ │ SprintAgent ││
│ │ BMCAgent     ││    │ │ OGD Loop       │ │    │ │ TestAgent   ││
│ │ DiscoveryAgt ││    │ │ SixHats        │ │    │ │ DeployAgent ││
│ └──────────────┘│    │ │ ReviewAgent    │ │    │ └─────────────┘│
└──────────────────┘    │ └────────────────┘ │    └────────────────┘
                        └────────────────────┘
```

```tsx
function AgentGroupGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {agentGroups.map((group, gi) => (
        <div key={group.group} className="relative">
          {/* Group header */}
          <div className="bp-box border-b-0 rounded-b-none px-4 py-3">
            <span className="bp-annotation uppercase tracking-widest">{group.group}</span>
            <h3 className="bp-line font-display text-sm font-bold mt-1">{group.label}</h3>
          </div>
          {/* Agent cards inside group */}
          <div className="bp-box rounded-t-none space-y-2 p-4">
            {group.agents.map((agent) => (
              <div key={agent.name} className="flex items-center gap-3 py-1.5">
                <agent.icon className="size-4 bp-line shrink-0" />
                <div>
                  <span className="bp-line text-sm font-bold">{agent.name}</span>
                  <span className="ml-2 bp-annotation">{agent.role}</span>
                </div>
              </div>
            ))}
          </div>
          {/* Arrow to next group (except last) */}
          {gi < agentGroups.length - 1 && (
            <div className="absolute top-1/2 -right-3 z-10 hidden md:block">
              <span className="bp-line text-lg">→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 2.4 SystemFlowDiagram — 좌→우 흐름도 (핵심)

```
사용자 ──→ Web Dashboard ──→ API Server ──→ AI 에이전트 ──→ Data Store
(브라우저)  (React+Vite)     (Hono/CF)     (멀티모델)      (D1+Git)
```

```tsx
function SystemFlowDiagram() {
  return (
    <div className="bp-bg rounded-lg p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-center md:gap-0">
        {systemFlow.map((node, i) => (
          <Fragment key={node.name}>
            {/* Node */}
            <div className="bp-box px-4 py-3 text-center min-w-[120px]">
              <node.icon className="mx-auto size-5 bp-line mb-1" />
              <span className="bp-line font-display text-sm font-bold block">{node.name}</span>
              <span className="bp-annotation block">{node.desc}</span>
              <span className="text-[10px] text-muted-foreground block mt-1">{node.tech}</span>
            </div>
            {/* Arrow */}
            {i < systemFlow.length - 1 && (
              <>
                <span className="bp-line hidden md:inline text-lg mx-2">→</span>
                <div className="h-4 w-px bg-current/20 mx-auto md:hidden" />
              </>
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
```

### 2.5 OpenSourcePartners — 파트너 카드

```tsx
function OpenSourcePartners() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {openSourcePartners.map((partner) => (
        <div key={partner.name} className="bp-box p-5 transition-colors hover:bg-[oklch(0.55_0.15_250/5%)]">
          <span className="bp-line font-display text-lg font-bold">{partner.name}</span>
          <span className="ml-2 bp-annotation">{partner.role}</span>
          <p className="mt-2 text-sm text-muted-foreground">{partner.desc}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2.6 RoadmapTimeline — 4 마일스톤

기존 `RoadmapTimeline` 구조 유지, `roadmap` 데이터만 4행으로 축소.
`current` 상태에 `● NOW` 표시, `planned`에 점선 표시.

### 2.7 CTA 섹션 갱신

```tsx
<h2>사업개발, 수동으로 하고 계신가요?</h2>
<p>Foundry-X가 발굴부터 데모까지 자동화해요.<br/>우리 팀의 BD 프로세스를 한 단계 올려보세요.</p>
```

## §3 hero.md TinaCMS 동기화

```yaml
---
title: Foundry-X
section: hero
sort_order: 0
tagline: "사업기회 발굴부터 데모까지, AI가 자동화하는 BD 플랫폼"
phase: "Phase 13 진행 중"
phaseTitle: "IA 재설계"
stats:
  - value: "6"
    label: "BD 파이프라인"
  - value: "10+"
    label: "AI 에이전트"
  - value: "22"
    label: "자동화 스킬"
  - value: "147"
    label: "Sprints"
---
```

## §4 footer.tsx 갱신

```tsx
<p className="font-mono text-xs text-muted-foreground/60">
  Sprint 147 &middot; Phase 13
</p>
```

## §5 prod-e2e smoke.spec.ts 갱신

TC-2 히어로 텍스트 매칭 변경:
```ts
// Before
await expect(page.getByRole("heading", { name: /AI 에이전트가/i })).toBeVisible();
await expect(page.getByText("설계하다")).toBeVisible();

// After
await expect(page.getByRole("heading", { name: /사업기회 발굴부터/i })).toBeVisible();
await expect(page.getByText("자동화해요")).toBeVisible();
```

## §6 반응형 + 다크 모드

### 반응형 (375px)
- AgentGroupGrid: `grid-cols-1` (세로 스택, 그룹 간 ↓ 화살표)
- SystemFlowDiagram: `flex-col` (세로 스택, 노드 간 ↓ 화살표)
- OpenSourcePartners: `grid-cols-1`

### 다크 모드
- 기존 bp-* CSS 다크 모드 변수 재활용 (변경 없음)
- `opacity-40` 비활성은 다크 모드에서도 동일하게 동작

## §7 구현 순서

1. landing.tsx 데이터 상수 전체 교체 (§1)
2. ProcessFlow 컴포넌트 — active prop 추가 + 비활성 스타일 (§2.2)
3. AgentGroupGrid 컴포넌트 신규 (§2.3) — AgentGrid 대체
4. SystemFlowDiagram 컴포넌트 신규 (§2.4) — ArchitectureBlueprint 대체
5. OpenSourcePartners 컴포넌트 신규 (§2.5) — EcosystemDiagram 대체
6. HeroSection 메시지 + CTA 갱신 (§2.1, §2.7)
7. SectionHeader 제목/설명 갱신 (각 섹션)
8. hero.md + footer.tsx 동기화 (§3, §4)
9. smoke.spec.ts 갱신 (§5)
10. 전체 빌드 + typecheck + 시각 확인

## §8 검증 항목

| # | 항목 | 방법 | PASS 기준 |
|---|------|------|-----------|
| V1 | 히어로 직설형 메시지 | 텍스트 확인 | "사업기회 발굴부터" 포함 |
| V2 | Stats 사용자 중심 | 데이터 확인 | BD 파이프라인/AI 에이전트/스킬/Sprint |
| V3 | BDP 6+1 | 시각 확인 | 6단계 실선, 7단계 점선+비활성 |
| V4 | 3대 차별점 | 데이터 확인 | BDP+AI에이전트+오케스트레이션 |
| V5 | 에이전트 3그룹 | 시각 확인 | 발굴/형상화/실행 3구획+화살표 |
| V6 | 시스템 구성도 | 시각 확인 | 좌→우 5노드 흐름 |
| V7 | 오픈소스 연계 5종 | 데이터 확인 | gstack/bkit/OpenSpec/TinaCMS/Marker.io |
| V8 | 로드맵 4 마일스톤 | 데이터 확인 | 기반→BD→현재→다음 |
| V9 | 다크 모드 | 시각 확인 | bp-* 다크 변수 적용 |
| V10 | 375px 반응형 | 시각 확인 | 그리드→스택 전환 |
| V11 | prod-e2e smoke | CI/CD | PASS |
| V12 | TypeScript | pnpm typecheck | 0 errors |
