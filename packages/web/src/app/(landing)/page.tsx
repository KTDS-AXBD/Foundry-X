"use client";

import Link from "next/link";
import {
  Anvil,
  ArrowRight,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Cpu,
  Eye,
  GitBranch,
  Layers,
  Network,
  Rocket,
  Scan,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TestTube,
  Timer,
  Zap,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   DATA — PRD v8 기반
   ═══════════════════════════════════════════════ */

const SITE_META = {
  sprint: "Sprint 46",
  phase: "Phase 5",
  phaseTitle: "고객 파일럿",
  tagline: "AI 에이전트 오케스트레이션 플랫폼",
} as const;

const stats = [
  { value: "163", label: "API Endpoints" },
  { value: "76", label: "Services" },
  { value: "1,160+", label: "Tests" },
  { value: "6", label: "AI Agents" },
  { value: "46", label: "Sprints" },
];

const pillars = [
  {
    icon: Brain,
    title: "에이전트 오케스트레이션",
    label: "6종 전문 에이전트",
    desc: "Architect, Test, Security, QA, Infra, Reviewer — 각 역할에 특화된 AI 에이전트가 병렬로 작업해요.",
    detail: "계획 → 코드 생성 → 테스트 → 보안 검토 → 배포까지 자동화",
    color: "axis-primary",
  },
  {
    icon: Target,
    title: "PoC/MVP 속도",
    label: "3일 이내 구축",
    desc: "사업기회 발굴부터 데모 가능한 MVP까지. AI 에이전트가 병목을 제거해 수주 경쟁력을 높여요.",
    detail: "기존 2~4주 → 3일 이내 (최대 85% 시간 절감)",
    color: "axis-blue",
  },
  {
    icon: Shield,
    title: "SDD Triangle",
    label: "Spec ↔ Code ↔ Test",
    desc: "명세, 코드, 테스트가 항상 동기화돼요. Git이 진실, Foundry-X는 렌즈.",
    detail: "Plumb 엔진 기반 자동 정합성 검증 + 건강도 점수",
    color: "axis-green",
  },
];

const agents = [
  {
    name: "ArchitectAgent",
    role: "아키텍처 분석 · 설계 리뷰",
    desc: "코드베이스 구조를 분석하고, 의존성 관계를 파악하며, 설계 품질을 평가해요.",
    icon: Layers,
  },
  {
    name: "TestAgent",
    role: "테스트 생성 · 커버리지 분석",
    desc: "테스트 케이스를 자동 생성하고, 커버리지 갭과 엣지 케이스를 탐지해요.",
    icon: TestTube,
  },
  {
    name: "SecurityAgent",
    role: "OWASP 스캔 · PR 보안 분석",
    desc: "보안 취약점을 사전에 탐지하고, PR diff를 분석해 위험 요소를 리포트해요.",
    icon: ShieldCheck,
  },
  {
    name: "QAAgent",
    role: "브라우저 테스트 · 수용 기준 검증",
    desc: "실제 브라우저 환경에서 테스트하고, 수용 기준을 자동 검증해요.",
    icon: CheckCircle2,
  },
  {
    name: "InfraAgent",
    role: "인프라 분석 · 마이그레이션 검증",
    desc: "인프라 상태를 시뮬레이션하고, 마이그레이션 안전성을 사전 검증해요.",
    icon: Cpu,
  },
  {
    name: "ReviewerAgent",
    role: "코드 리뷰 · 자동 PR 파이프라인",
    desc: "코드 품질을 분석하고, PR을 자동 생성/리뷰하며 머지 큐를 관리해요.",
    icon: Eye,
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
      "163 Endpoints",
      "76 Services",
      "30 Route Modules",
    ],
    tech: "Hono on Cloudflare Workers",
  },
  {
    layer: "Agent Layer",
    items: [
      "6종 전문 에이전트",
      "모델 라우팅 + Fallback",
      "Evaluator-Optimizer 패턴",
    ],
    tech: "Orchestrator + MCP + Claude API",
  },
  {
    layer: "Data Layer",
    items: ["D1 SQLite (47 Tables)", "KV Cache", "Git (SSOT)"],
    tech: "Cloudflare D1 + simple-git",
  },
];

const roadmap: {
  phase: string;
  title: string;
  version: string;
  status: "done" | "current" | "planned";
  items: string[];
}[] = [
  {
    phase: "Phase 1",
    title: "CLI + Plumb",
    version: "v0.1 → v0.5",
    status: "done",
    items: ["CLI 3커맨드", "Ink TUI", "4 Builders", "106 테스트"],
  },
  {
    phase: "Phase 2",
    title: "API + Web + Agent",
    version: "v0.6 → v1.5",
    status: "done",
    items: ["59 엔드포인트", "MCP 프로토콜", "PlannerAgent", "자동 PR"],
  },
  {
    phase: "Phase 3",
    title: "멀티테넌시 + 연동",
    version: "v1.6 → v2.0",
    status: "done",
    items: ["멀티테넌시", "GitHub/Slack/Jira", "워크플로우 엔진"],
  },
  {
    phase: "Phase 4",
    title: "에이전트 생태계",
    version: "v2.1+",
    status: "done",
    items: ["6종 에이전트", "모델 라우팅", "앙상블 투표", "마켓플레이스"],
  },
  {
    phase: "Phase 5",
    title: "고객 파일럿",
    version: "현재",
    status: "current",
    items: ["Azure PoC", "SR 시나리오", "KPI 수집", "데모 환경"],
  },
];

const ecosystem = [
  {
    name: "Discovery-X",
    role: "탐색 · 실험",
    desc: "데이터 기반 신사업 발굴",
    arrow: "실험 → 프로젝트",
    color: "axis-green",
  },
  {
    name: "AI Foundry",
    role: "지식 · 구축",
    desc: "SI 산출물 → AI Skill 자산",
    arrow: "MCP Skill 제공",
    color: "axis-violet",
  },
  {
    name: "AXIS DS",
    role: "UI · 일관성",
    desc: "디자인 토큰 + React 컴포넌트",
    arrow: "컴포넌트 시스템",
    color: "axis-blue",
  },
];

const processSteps = [
  {
    step: "01",
    title: "사업기회 수집",
    desc: "SR(Service Request) 자동 분류 및 우선순위 매핑",
    icon: Scan,
  },
  {
    step: "02",
    title: "에이전트 계획 수립",
    desc: "PlannerAgent가 코드베이스를 분석하고 실행 계획 생성",
    icon: Brain,
  },
  {
    step: "03",
    title: "병렬 자동화 실행",
    desc: "6종 에이전트가 코드·테스트·보안·인프라를 동시 처리",
    icon: Zap,
  },
  {
    step: "04",
    title: "PoC/MVP 데모",
    desc: "고객에게 즉시 데모 가능한 결과물 제공",
    icon: Rocket,
  },
];

/* ═══════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════ */

function AgentGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <div
          key={agent.name}
          className="axis-glass group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:border-axis-primary/20 hover:bg-axis-primary/5"
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-axis-primary/10 transition-colors group-hover:bg-axis-primary/20">
              <agent.icon className="size-5 text-axis-primary" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold">{agent.name}</h3>
              <span className="font-mono text-[10px] text-muted-foreground">
                {agent.role}
              </span>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {agent.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProcessFlow() {
  return (
    <div className="grid gap-6 md:grid-cols-4">
      {processSteps.map((step, i) => (
        <div key={step.step} className="relative">
          {/* Connector */}
          {i < processSteps.length - 1 && (
            <div className="absolute top-8 right-0 hidden h-px w-6 translate-x-full bg-gradient-to-r from-axis-primary/40 to-transparent md:block" />
          )}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl border border-axis-primary/20 bg-axis-primary/5">
              <step.icon className="size-6 text-axis-primary" />
              <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-axis-primary font-mono text-[10px] font-bold text-white">
                {step.step}
              </span>
            </div>
            <h3 className="font-display text-sm font-bold">{step.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              {step.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EcosystemDiagram() {
  return (
    <div className="relative mx-auto w-full max-w-2xl py-8">
      {/* Center node */}
      <div className="relative z-10 mx-auto flex w-fit flex-col items-center">
        <div className="animate-pulse-ring flex size-28 items-center justify-center rounded-2xl border-2 border-axis-primary/40 bg-axis-primary/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-1">
            <Anvil className="size-8 text-axis-primary" />
            <span className="font-display text-xs font-bold text-axis-primary">
              Foundry-X
            </span>
          </div>
        </div>
        <span className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          오케스트레이션
        </span>
      </div>

      {/* Satellite nodes */}
      <div className="mt-10 grid grid-cols-3 gap-4">
        {ecosystem.map((svc) => (
          <div key={svc.name} className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-px bg-gradient-to-b from-transparent via-axis-primary/30 to-axis-primary/60" />
              <span className="font-mono text-[9px] text-muted-foreground/70">
                {svc.arrow}
              </span>
              <div className="h-3 w-px bg-axis-primary/40" />
            </div>
            <div
              className="flex w-full flex-col items-center rounded-xl border p-4 transition-all"
              style={{
                borderColor: `color-mix(in oklch, var(--${svc.color}) 20%, transparent)`,
                backgroundColor: `color-mix(in oklch, var(--${svc.color}) 5%, transparent)`,
              }}
            >
              <span className="font-display text-sm font-bold">
                {svc.name}
              </span>
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
            className="group relative overflow-hidden rounded-xl border border-border/30 bg-background/80 backdrop-blur-sm transition-all hover:border-axis-primary/20"
          >
            <div
              className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-axis-primary/80 to-axis-accent/40"
              style={{ opacity: 1 - i * 0.2 }}
            />
            <div className="flex items-start gap-4 p-4 pl-5">
              <div className="flex min-w-[120px] flex-col">
                <span className="font-display text-sm font-bold text-axis-primary">
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
                    className="rounded-md border border-border/40 bg-muted/30 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors group-hover:border-axis-primary/20 group-hover:text-foreground"
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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {roadmap.map((phase, i) => {
        const isDone = phase.status === "done";
        const isCurrent = phase.status === "current";
        return (
          <div key={phase.phase} className="relative">
            {i < roadmap.length - 1 && (
              <div className="absolute top-5 right-0 hidden h-px w-4 translate-x-full bg-border/40 md:block" />
            )}
            <div
              className={`h-full rounded-xl border p-5 transition-all ${
                isCurrent
                  ? "border-axis-primary/30 bg-axis-primary/5"
                  : isDone
                    ? "border-border/30 bg-muted/20"
                    : "border-dashed border-border/20 bg-transparent"
              }`}
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent
                      ? "bg-axis-primary/20 text-axis-primary"
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
                  <span className="ml-auto text-[10px] text-axis-primary">
                    ✓
                  </span>
                )}
                {isCurrent && (
                  <span className="ml-auto size-1.5 animate-pulse rounded-full bg-axis-primary" />
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
                          ? "bg-axis-primary/60"
                          : isCurrent
                            ? "bg-axis-primary"
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
      <section className="axis-grid relative flex min-h-[92vh] items-center justify-center px-6 pt-16">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-axis-primary/5 blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-axis-blue/3 blur-[100px]" />
          <div className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-axis-accent/4 blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Phase badge */}
          <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-axis-primary/20 bg-axis-primary/5 px-4 py-1.5">
            <Sparkles className="size-3.5 text-axis-primary" />
            <span className="font-mono text-xs font-medium text-axis-primary">
              {SITE_META.sprint} · {SITE_META.phase} {SITE_META.phaseTitle}
            </span>
          </div>

          {/* Headline — 비즈니스 메시지 전면 */}
          <h1 className="animate-fade-in-up stagger-1 font-display text-5xl leading-[1.08] font-bold tracking-tight sm:text-6xl md:text-7xl">
            AI 에이전트가
            <br />
            <span className="bg-gradient-to-r from-axis-primary via-axis-primary-hover to-axis-accent bg-clip-text text-transparent">
              일하는 방식을 설계하다
            </span>
          </h1>

          {/* Subheading */}
          <p className="animate-fade-in-up stagger-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            사업기회 수집부터 PoC/MVP 구축, 고객 데모까지 —
            <br className="hidden sm:block" />
            <span className="text-foreground/80">
              6종 전문 에이전트가 개발 라이프사이클을 자동화해요.
            </span>
          </p>

          {/* Value proposition — 3-step */}
          <div className="animate-fade-in-up stagger-3 mx-auto mt-8 flex max-w-lg flex-col gap-2">
            {[
              {
                icon: Timer,
                text: "85% 단축",
                desc: "PoC/MVP 제작 시간 — 2~4주에서 3일 이내로",
              },
              {
                icon: Network,
                text: "6종 에이전트",
                desc: "Architect · Test · Security · QA · Infra · Reviewer",
              },
              {
                icon: GitBranch,
                text: "Git = 진실",
                desc: "Spec ↔ Code ↔ Test 동기화 — 자동 정합성 검증",
              },
            ].map((step) => (
              <div
                key={step.text}
                className="flex items-center gap-3 rounded-lg border border-border/20 bg-background/40 px-4 py-2.5 backdrop-blur-sm"
              >
                <step.icon className="size-4 shrink-0 text-axis-primary" />
                <span className="w-24 font-display text-sm font-bold text-axis-primary">
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
              className="axis-glow-strong group inline-flex h-12 items-center gap-2 rounded-xl bg-axis-primary px-7 text-sm font-bold text-white transition-all hover:bg-axis-primary-hover"
            >
              Dashboard 열기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/KTDS-AXBD/Foundry-X"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-7 text-sm font-medium backdrop-blur transition-all hover:border-axis-primary/30 hover:bg-axis-primary/5"
            >
              <GitBranch className="size-4 text-axis-primary" />
              GitHub에서 보기
            </a>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="border-y border-border/30 bg-muted/20">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5">
              <span className="font-display text-2xl font-bold text-axis-primary sm:text-3xl">
                {stat.value}
              </span>
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PROCESS — 사업 프로세스 흐름 ═══ */}
      <section id="process" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-axis-primary uppercase">
              How It Works
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              사업기회에서{" "}
              <span className="text-axis-primary">데모까지</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              AI 에이전트가 수주 파이프라인의 모든 단계를 가속해요.
            </p>
          </div>
          <ProcessFlow />
        </div>
      </section>

      {/* ═══ 3 PILLARS ═══ */}
      <section id="features" className="relative bg-muted/10 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-axis-primary uppercase">
              Core Pillars
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              세 가지{" "}
              <span className="text-axis-primary">차별점</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              에이전트 오케스트레이션, 속도, 동기화.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {pillars.map((p, i) => (
              <div
                key={p.title}
                className={`animate-fade-in-up stagger-${i + 1} axis-glass group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:border-axis-primary/20 hover:bg-axis-primary/5`}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex size-11 items-center justify-center rounded-xl transition-colors group-hover:bg-axis-primary/20"
                    style={{
                      backgroundColor: `color-mix(in oklch, var(--${p.color}) 10%, transparent)`,
                    }}
                  >
                    <p.icon
                      className="size-5"
                      style={{ color: `var(--${p.color})` }}
                    />
                  </div>
                  <div>
                    <span
                      className="rounded-md px-2 py-0.5 font-mono text-[10px] font-medium"
                      style={{
                        backgroundColor: `color-mix(in oklch, var(--${p.color}) 10%, transparent)`,
                        color: `var(--${p.color})`,
                      }}
                    >
                      {p.label}
                    </span>
                  </div>
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
                <div className="mt-4 border-t border-border/30 pt-3">
                  <span className="font-mono text-[11px] text-muted-foreground/60">
                    {p.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AGENTS ═══ */}
      <section id="agents" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-axis-primary uppercase">
              Agent Ecosystem
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              6종{" "}
              <span className="text-axis-primary">전문 에이전트</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              각 역할에 특화된 AI 에이전트가 병렬로 작업해요.
              모델 라우팅 + Fallback 체인 + 피드백 루프로 품질을 보장해요.
            </p>
          </div>
          <AgentGrid />
        </div>
      </section>

      {/* ═══ ARCHITECTURE ═══ */}
      <section id="architecture" className="relative bg-muted/10 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-axis-primary uppercase">
              Architecture
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              4-Layer{" "}
              <span className="text-axis-primary">아키텍처</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              CLI에서 데이터까지, 모든 레이어가 유기적으로 연결돼요.
            </p>
          </div>
          <ArchitectureBlueprint />
        </div>
      </section>

      {/* ═══ ECOSYSTEM ═══ */}
      <section id="ecosystem" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-axis-primary uppercase">
              Ecosystem
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              AX{" "}
              <span className="text-axis-primary">생태계</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              탐색 · 구축 · 디자인을 Foundry-X가 오케스트레이션해요.
            </p>
          </div>
          <EcosystemDiagram />
        </div>
      </section>

      {/* ═══ ROADMAP ═══ */}
      <section id="roadmap" className="relative bg-muted/10 px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <span className="mb-4 inline-block font-mono text-xs tracking-widest text-axis-primary uppercase">
              Roadmap
            </span>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              5 Phase{" "}
              <span className="text-axis-primary">로드맵</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              CLI에서 시작해 고객 파일럿까지.
              46 Sprint를 거치며 에이전트 생태계를 완성했어요.
            </p>
          </div>
          <RoadmapTimeline />
        </div>
      </section>

      {/* ═══ CTA SECTION ═══ */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            AI 에이전트와 함께
            <br />
            <span className="text-axis-primary">수주 경쟁력을 높이세요</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Foundry-X는 AX 사업개발의 전체 라이프사이클을 자동화해요.
            <br />
            PoC/MVP를 3일 이내로 구축하고, 고객에게 즉시 데모하세요.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="axis-glow-strong group inline-flex h-12 items-center gap-2 rounded-xl bg-axis-primary px-7 text-sm font-bold text-white transition-all hover:bg-axis-primary-hover"
            >
              시작하기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/KTDS-AXBD/Foundry-X"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-7 text-sm font-medium backdrop-blur transition-all hover:border-axis-primary/30 hover:bg-axis-primary/5"
            >
              GitHub
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
