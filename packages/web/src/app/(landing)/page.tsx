"use client";

import Link from "next/link";
import {
  Anvil,
  ArrowRight,
  Bot,
  Brain,
  Eye,
  GitBranch,
  Layers,
  Network,
  Rocket,
  Scan,
  Shield,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════ */

const pillars = [
  {
    icon: Brain,
    title: "PlannerAgent",
    label: "에이전트 통제",
    desc: "AI가 코드를 쓰기 전에 계획을 세우고, 사람이 승인해요. 자율성과 통제의 균형.",
    detail: "코드베이스 리서치 → 계획 수립 → 인간 승인 → 실행",
    color: "forge-amber",
  },
  {
    icon: Network,
    title: "조직 지식 연결",
    label: "MCP Skill 소비",
    desc: "AI Foundry의 도메인 Skill을 에이전트가 MCP로 직접 활용해요.",
    detail: "3,924 Skills → MCP Server → Foundry-X 에이전트 도구로 소비",
    color: "axis-blue",
  },
  {
    icon: Workflow,
    title: "실험-코드 연결",
    label: "Discovery-X HANDOFF",
    desc: "실험이 코드 프로젝트로 전환될 때, 하네스가 자동 부트스트랩돼요.",
    detail: "Discovery-X 실험 → HANDOFF → Foundry-X 자동 초기화",
    color: "axis-green",
  },
];

const ecosystem = [
  {
    name: "Discovery-X",
    role: "실험 관리",
    desc: "관찰 → 행동 → 근거 → 자산",
    color: "axis-green",
    arrow: "실험 컨텍스트",
  },
  {
    name: "AI Foundry",
    role: "지식 추출",
    desc: "SI 산출물 → AI Skill 자산",
    color: "axis-violet",
    arrow: "MCP Skill tools",
  },
  {
    name: "AXIS DS",
    role: "공유 UI",
    desc: "디자인 토큰 + React 컴포넌트",
    color: "axis-blue",
    arrow: "@axis-ds/* 컴포넌트",
  },
];

const architecture = [
  {
    layer: "CLI Layer",
    items: ["foundry-x init", "foundry-x sync", "foundry-x status"],
    tech: "TypeScript + Commander + Ink TUI",
  },
  {
    layer: "API Layer",
    items: [
      "57 Endpoints (OpenAPI)",
      "19 Services",
      "MCP Protocol",
    ],
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
    items: ["D1 SQLite (12 Tables)", "KV Cache", "Git (SSOT)"],
    tech: "Cloudflare D1 + simple-git",
  },
];

const roadmap = [
  {
    phase: "Phase 1",
    title: "CLI + Plumb Engine",
    version: "v0.1 → v0.5",
    status: "done" as const,
    items: ["CLI 3커맨드", "Ink TUI", "4 Builders", "106 테스트"],
  },
  {
    phase: "Phase 2",
    title: "API + Web + Agent",
    version: "v0.6 → v1.3",
    status: "done" as const,
    items: [
      "57 API 엔드포인트",
      "MCP 프로토콜",
      "PlannerAgent",
      "에이전트 자동 PR",
    ],
  },
  {
    phase: "Phase 3",
    title: "멀티테넌시 + 외부 연동",
    version: "v2.0",
    status: "current" as const,
    items: [
      "AI Foundry MCP 연동",
      "AXIS DS UI 전환",
      "멀티테넌시",
      "팀 온보딩",
    ],
  },
  {
    phase: "Phase 4",
    title: "생태계 통합",
    version: "v3.0",
    status: "planned" as const,
    items: [
      "Discovery-X HANDOFF",
      "에이전트 마켓플레이스",
      "엔터프라이즈 SSO",
      "온프레미스 배포",
    ],
  },
];

const stats = [
  { value: "57", label: "API Endpoints" },
  { value: "19", label: "Services" },
  { value: "450+", label: "Tests" },
  { value: "15", label: "Sprints" },
];

/* ═══════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════ */

function EcosystemDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-2xl py-8">
      {/* Center node — Foundry-X */}
      <div className="relative z-10 mx-auto flex w-fit flex-col items-center">
        <div className="animate-pulse-ring flex size-28 items-center justify-center rounded-2xl border-2 border-forge-amber/40 bg-forge-amber/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1">
            <Anvil className="size-8 text-forge-amber" />
            <span className="font-display text-xs font-bold text-forge-amber">
              Foundry-X
            </span>
          </div>
        </div>
        <span className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          AI 협업 플랫폼
        </span>
      </div>

      {/* Satellite nodes */}
      <div className="mt-10 grid grid-cols-3 gap-4">
        {ecosystem.map((svc) => (
          <div key={svc.name} className="flex flex-col items-center gap-3">
            {/* Arrow label */}
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-forge-amber/30 to-forge-amber/60" />
              <span className="font-mono text-[9px] text-muted-foreground/70">
                {svc.arrow}
              </span>
              <div className="h-3 w-px bg-forge-amber/40" />
            </div>
            {/* Node */}
            <div
              className="flex w-full flex-col items-center rounded-xl border p-4 transition-all"
              style={{
                borderColor: `color-mix(in oklch, var(--${svc.color}) 20%, transparent)`,
                backgroundColor: `color-mix(in oklch, var(--${svc.color}) 5%, transparent)`,
              }}
            >
              <span className="font-display text-sm font-bold">{svc.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {svc.role}
              </span>
              <span className="mt-1 text-center text-[11px] leading-tight text-muted-foreground/70">
                {svc.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArchitectureBlueprint() {
  return (
    <div className="blueprint-grid relative overflow-hidden rounded-2xl border border-axis-blue/10 p-1">
      <div className="relative z-10 space-y-1">
        {architecture.map((layer, i) => (
          <div
            key={layer.layer}
            className="group relative overflow-hidden rounded-xl border border-border/30 bg-background/80 backdrop-blur-sm transition-all hover:border-forge-amber/20"
          >
            {/* Layer depth indicator */}
            <div
              className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-forge-amber/80 to-forge-copper/40"
              style={{ opacity: 1 - i * 0.2 }}
            />
            <div className="flex items-start gap-4 p-4 pl-5">
              <div className="flex min-w-[120px] flex-col">
                <span className="font-display text-sm font-bold text-forge-amber">
                  {layer.layer}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  {layer.tech}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {layer.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-border/40 bg-muted/30 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors group-hover:border-forge-amber/20 group-hover:text-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapTimeline() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {roadmap.map((phase, i) => {
        const isDone = phase.status === "done";
        const isCurrent = phase.status === "current";
        return (
          <div key={phase.phase} className="relative">
            {/* Connector line */}
            {i < roadmap.length - 1 && (
              <div className="absolute top-5 right-0 hidden h-px w-4 bg-border/40 translate-x-full md:block" />
            )}
            <div
              className={`h-full rounded-xl border p-5 transition-all ${
                isCurrent
                  ? "border-forge-amber/30 bg-forge-amber/5"
                  : isDone
                    ? "border-border/30 bg-muted/20"
                    : "border-dashed border-border/20 bg-transparent"
              }`}
            >
              {/* Phase badge */}
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent
                      ? "bg-forge-amber/20 text-forge-amber"
                      : isDone
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground/50"
                  }`}
                >
                  {phase.phase}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  {phase.version}
                </span>
                {isDone && (
                  <span className="ml-auto text-[10px] text-forge-amber">
                    ✓
                  </span>
                )}
                {isCurrent && (
                  <span className="ml-auto size-1.5 animate-pulse rounded-full bg-forge-amber" />
                )}
              </div>
              <h4
                className={`font-display text-sm font-bold ${
                  phase.status === "planned"
                    ? "text-muted-foreground/50"
                    : "text-foreground"
                }`}
              >
                {phase.title}
              </h4>
              <ul className="mt-3 space-y-1.5">
                {phase.items.map((item) => (
                  <li
                    key={item}
                    className={`flex items-center gap-2 text-[12px] ${
                      phase.status === "planned"
                        ? "text-muted-foreground/40"
                        : "text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`size-1 rounded-full ${
                        isDone
                          ? "bg-forge-amber/60"
                          : isCurrent
                            ? "bg-forge-amber"
                            : "bg-muted-foreground/20"
                      }`}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="grain-overlay relative overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="forge-grid relative flex min-h-[92vh] items-center justify-center px-6 pt-16">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-forge-amber/5 blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-axis-blue/3 blur-[100px]" />
          <div className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-forge-copper/4 blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Version badge */}
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-forge-amber/20 bg-forge-amber/5 px-4 py-1.5">
            <Sparkles className="size-3.5 text-forge-amber" />
            <span className="font-mono text-xs font-medium text-forge-amber">
              v1.3.0 &middot; Phase 2 Complete
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in-up stagger-1 font-display text-5xl leading-[1.08] font-bold tracking-tight sm:text-6xl md:text-7xl">
            사람과 AI가
            <br />
            <span className="bg-gradient-to-r from-forge-amber via-forge-ember to-forge-copper bg-clip-text text-transparent">
              함께 만드는 곳
            </span>
          </h1>

          {/* Subheading */}
          <p className="animate-fade-in-up stagger-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            AI가 코드를 생성하고, 팀 전체가 확인하고, 함께 결정해요.
            <br className="hidden sm:block" />
            <span className="text-foreground/80">
              하나의 협업 플랫폼에서 명세부터 배포까지.
            </span>
          </p>

          {/* 3-line formula */}
          <div className="animate-fade-in-up stagger-3 mx-auto mt-8 flex max-w-md flex-col gap-2">
            {[
              { icon: Scan, text: "Plan", desc: "에이전트가 코드베이스를 분석하고 계획을 세워요" },
              { icon: Eye, text: "Approve", desc: "사람이 계획을 검토하고 승인해요" },
              { icon: Rocket, text: "Execute", desc: "승인된 계획을 Git worktree에서 격리 실행해요" },
            ].map((step) => (
              <div
                key={step.text}
                className="flex items-center gap-3 rounded-lg border border-border/20 bg-background/40 px-4 py-2.5 backdrop-blur-sm"
              >
                <step.icon className="size-4 shrink-0 text-forge-amber" />
                <span className="w-20 font-display text-sm font-bold text-forge-amber">
                  {step.text}
                </span>
                <span className="text-left text-sm text-muted-foreground">
                  {step.desc}
                </span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="animate-fade-in-up stagger-4 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="forge-glow-strong group inline-flex h-12 items-center gap-2 rounded-xl bg-forge-amber px-7 text-sm font-bold text-forge-charcoal transition-all hover:bg-forge-ember"
            >
              Dashboard 열기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/KTDS-AXBD/Foundry-X"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-7 text-sm font-medium backdrop-blur transition-all hover:border-forge-amber/30 hover:bg-forge-amber/5"
            >
              <GitBranch className="size-4 text-forge-amber" />
              GitHub에서 보기
            </a>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="border-y border-border/30 bg-muted/20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="font-display text-2xl font-bold text-forge-amber sm:text-3xl">
                {stat.value}
              </span>
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 3 PILLARS ═══ */}
      <section id="features" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-forge-amber uppercase">
              Core Pillars
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              세 가지{" "}
              <span className="text-forge-amber">차별점</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              에이전트 통제, 조직 지식, 실험-코드 연결.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                className={`animate-fade-in-up stagger-${i + 1} forge-glass group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-forge-amber/20 hover:bg-forge-amber/5`}
              >
                {/* Icon */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-forge-amber/10 transition-colors group-hover:bg-forge-amber/20">
                    <p.icon className="size-5 text-forge-amber" />
                  </div>
                  <span className="rounded-md border border-border/30 bg-muted/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {p.label}
                  </span>
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
                {/* Detail strip */}
                <div className="mt-4 rounded-lg border border-border/20 bg-muted/20 px-3 py-2">
                  <span className="font-mono text-[11px] leading-relaxed text-muted-foreground/80">
                    {p.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ECOSYSTEM — BluePrint ═══ */}
      <section
        id="ecosystem"
        className="relative px-6 py-24 md:py-32"
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-axis-blue/3 blur-[150px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-axis-blue uppercase">
              Ecosystem BluePrint
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              AX BD팀{" "}
              <span className="bg-gradient-to-r from-axis-blue to-axis-violet bg-clip-text text-transparent">
                제품 생태계
              </span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              세 서비스의 지식과 자산이 Foundry-X로 수렴해요.
            </p>
          </div>

          <EcosystemDiagram />
        </div>
      </section>

      {/* ═══ ARCHITECTURE ═══ */}
      <section
        id="architecture"
        className="forge-grid relative px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-forge-amber uppercase">
              System Architecture
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              4-Layer{" "}
              <span className="text-forge-amber">아키텍처</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              CLI → API → Agent → Data, 각 레이어가 독립 확장돼요.
            </p>
          </div>

          <ArchitectureBlueprint />

          {/* Tech badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              "TypeScript",
              "Hono",
              "Cloudflare Workers",
              "D1 SQLite",
              "Next.js 14",
              "MCP Protocol",
              "Turborepo",
              "Vitest",
            ].map((tech) => (
              <span
                key={tech}
                className="rounded-lg border border-border/30 bg-muted/20 px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-forge-amber/20 hover:text-foreground"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ ROADMAP ═══ */}
      <section id="roadmap" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-forge-amber uppercase">
              Roadmap
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              서비스{" "}
              <span className="text-forge-amber">로드맵</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              CLI에서 시작해, 생태계 통합까지.
            </p>
          </div>

          <RoadmapTimeline />
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="forge-grid relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-forge-amber uppercase">
              Quick Start
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              3분이면{" "}
              <span className="text-forge-amber">시작</span>
            </h2>
          </div>

          {/* Terminal card */}
          <div className="forge-glass overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-border/30 px-5 py-3">
              <div className="size-3 rounded-full bg-forge-copper/40" />
              <div className="size-3 rounded-full bg-forge-amber/40" />
              <div className="size-3 rounded-full bg-green-500/40" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">
                terminal
              </span>
            </div>
            <div className="space-y-4 p-6 font-mono text-sm">
              {/* Step 1 */}
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                  01 &mdash; 설치 &amp; 초기화
                </div>
                <div>
                  <span className="text-forge-amber">$</span>{" "}
                  <span className="text-foreground">npx foundry-x init</span>
                </div>
                <div className="ml-4 mt-1 space-y-0.5 text-muted-foreground">
                  <div>
                    <span className="text-green-400">&#10003;</span> Node.js +
                    TypeScript detected
                  </div>
                  <div>
                    <span className="text-green-400">&#10003;</span>{" "}
                    CLAUDE.md, ARCHITECTURE.md 자동 생성
                  </div>
                </div>
              </div>
              {/* Step 2 */}
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                  02 &mdash; 동기화 검증
                </div>
                <div>
                  <span className="text-forge-amber">$</span>{" "}
                  <span className="text-foreground">foundry-x sync</span>
                </div>
                <div className="ml-4 mt-1 text-muted-foreground">
                  SDD Triangle:{" "}
                  <span className="font-bold text-green-400">92%</span> (Grade A)
                </div>
              </div>
              {/* Step 3 */}
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground/50">
                  03 &mdash; 대시보드
                </div>
                <div>
                  <span className="text-forge-amber">$</span>{" "}
                  <span className="text-foreground">
                    open fx.minu.best/dashboard
                  </span>
                </div>
                <div className="ml-4 mt-1 text-muted-foreground">
                  <span className="text-forge-amber">&#9670;</span> 에이전트 상태, Spec↔Code↔Test 건강도 한눈에
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center justify-center gap-3">
            <Anvil className="size-8 text-forge-amber" />
            <Shield className="size-7 text-forge-amber/50" />
            <Bot className="size-7 text-axis-blue/50" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            함께{" "}
            <span className="bg-gradient-to-r from-forge-amber to-forge-copper bg-clip-text text-transparent">
              만들어요
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            AI가 코드를 생성하고, 팀이 함께 검토하고, 모든 과정이 기록돼요.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="forge-glow-strong group inline-flex h-12 items-center gap-2 rounded-xl bg-forge-amber px-8 text-sm font-bold text-forge-charcoal transition-all hover:bg-forge-ember"
            >
              Dashboard 열기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://www.npmjs.com/package/foundry-x"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-8 text-sm font-medium backdrop-blur transition-all hover:border-forge-amber/30 hover:bg-forge-amber/5"
            >
              <Terminal className="size-4 text-forge-amber" />
              npm i -g foundry-x
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
