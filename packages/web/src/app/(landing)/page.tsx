"use client";

import Link from "next/link";
import {
  Anvil,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Eye,
  GitBranch,
  Layers,
  Lightbulb,
  Megaphone,
  Network,
  PenTool,
  Rocket,
  Scan,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TestTube,
  Timer,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   DATA — PRD v8 기반
   ═══════════════════════════════════════════════ */

const SITE_META = {
  sprint: "Sprint 71",
  phase: "Phase 5f 완료",
  phaseTitle: "AX BD 사업개발 체계 수립",
  tagline: "AX 사업개발 AI 오케스트레이션 플랫폼",
} as const;

const stats = [
  { value: "304", label: "API Endpoints" },
  { value: "135", label: "Services" },
  { value: "2,032+", label: "Tests" },
  { value: "60", label: "D1 Migrations" },
  { value: "71", label: "Sprints" },
];

const pillars = [
  {
    icon: Brain,
    title: "BDP 라이프사이클",
    label: "7단계 자동화",
    desc: "수집→발굴→형상화→검증→제품화→GTM→평가. 사업개발 전체를 한 곳에서.",
    detail: "AX BD 프로세스 v8.2 기반, 5유형(I/M/P/T/S) 강도 라우팅 + 사업성 체크포인트",
    color: "axis-primary",
  },
  {
    icon: Target,
    title: "AI 에이전트 하네스",
    label: "BMCAgent + InsightAgent",
    desc: "BMC 초안 자동 작성, 인사이트 도출, 다중 AI 검토까지. 에이전트가 사업기회를 형상화해요.",
    detail: "Anthropic + OpenAI + Gemini + DeepSeek 멀티모델 파이프라인",
    color: "axis-blue",
  },
  {
    icon: Shield,
    title: "SDD Triangle",
    label: "Spec ↔ Code ↔ Test",
    desc: "명세, 코드, 테스트가 항상 동기화돼요. Git이 진실, Foundry-X는 렌즈.",
    detail: "304 endpoints, 2,032+ tests, 60 D1 migrations — 자동 정합성 검증",
    color: "axis-green",
  },
];

const agents = [
  { name: "BMCAgent", role: "BMC 초안 · AI 자동 생성", desc: "9블록 BMC를 아이디어 기반으로 자동 작성. 업계 트렌드와 경쟁사 데이터를 반영해요.", icon: PenTool },
  { name: "InsightAgent", role: "인사이트 · 기회 발굴", desc: "수집 데이터에서 패턴을 발견하고, 사업기회 인사이트를 자동 도출해요.", icon: Lightbulb },
  { name: "ReviewAgent", role: "다중 AI 검토 · Six Hats", desc: "ChatGPT, Gemini, DeepSeek로 BMC/PRD를 교차 검토. Six Hats 토론으로 다각도 분석.", icon: Eye },
  { name: "ArchitectAgent", role: "아키텍처 분석 · 설계 리뷰", desc: "코드베이스 구조를 분석하고, 의존성 관계를 파악하며, 설계 품질을 평가해요.", icon: Layers },
  { name: "TestAgent", role: "테스트 생성 · 커버리지 분석", desc: "테스트 케이스를 자동 생성하고, 커버리지 갭과 엣지 케이스를 탐지해요.", icon: TestTube },
  { name: "SecurityAgent", role: "OWASP 스캔 · PR 보안 분석", desc: "보안 취약점을 사전에 탐지하고, PR diff를 분석해 위험 요소를 리포트해요.", icon: ShieldCheck },
];

const architecture = [
  { layer: "CLI Layer", items: ["foundry-x init", "foundry-x sync", "foundry-x status"], tech: "TypeScript + Commander + Ink TUI" },
  { layer: "API Layer", items: ["304 Endpoints", "135 Services", "47 Route Modules"], tech: "Hono on Cloudflare Workers" },
  { layer: "Agent Layer", items: ["BMCAgent", "InsightAgent", "ReviewAgent", "ArchitectAgent + 3종"], tech: "Orchestrator + MCP + Multi-Model" },
  { layer: "Data Layer", items: ["D1 SQLite (60 Migrations)", "KV Cache", "Git (SSOT)"], tech: "Cloudflare D1 + simple-git" },
];

const roadmap: {
  phase: string;
  title: string;
  version: string;
  status: "done" | "current" | "planned";
  items: string[];
}[] = [
  { phase: "Phase 1~4", title: "CLI + API + Web + 멀티테넌시", version: "v0.1 → v2.1", status: "done",
    items: ["CLI 3커맨드 + Ink TUI", "304 API Endpoints", "Next.js Dashboard", "SSO + RBAC"] },
  { phase: "Phase 5a", title: "Agent Evolution", version: "Sprint 32~47", status: "done",
    items: ["6종 에이전트", "모델 라우팅", "PRD v8 확정"] },
  { phase: "Phase 5b", title: "BDP 자동화", version: "Sprint 48~58", status: "done",
    items: ["Discovery 9기준", "다중 AI 검토", "Six Hats 토론", "수집 채널 통합"] },
  { phase: "Phase 5c", title: "방법론 플러그인", version: "Sprint 59~60", status: "done",
    items: ["레지스트리 + 인터페이스", "BDP 모듈화", "pm-skills 모듈"] },
  { phase: "Phase 5d", title: "Ideation MVP", version: "Sprint 61~67", status: "done",
    items: ["BMC CRUD + AI", "아이디어-BMC 연결", "인사이트 + 평가", "Discovery-X 연동"] },
  { phase: "Phase 5f", title: "사업개발 체계 수립", version: "Sprint 68~71", status: "done",
    items: ["ai-biz 11스킬 CC전환", "API v8.2 (5유형+체크포인트)", "Discovery 대시보드", "팀 가이드"] },
  { phase: "Phase 5g", title: "Test Agent + TDD", version: "Sprint 72~74", status: "planned",
    items: ["TestAgent Web UI 활성화", "Agent SDK PoC", "TDD 자동화 CC Skill"] },
];

const ecosystem = [
  { name: "Discovery-X", role: "수집 엔진", desc: "시장/트렌드/경쟁사 데이터 수집 → API로 Foundry-X에 공급", arrow: "API 연동", color: "axis-green" },
  { name: "Foundry-X", role: "베이스캠프", desc: "발굴→형상화→검증→제품화→GTM→평가 전 단계 오케스트레이션", arrow: "중심", color: "axis-primary" },
  { name: "AXIS DS", role: "UI 일관성", desc: "디자인 토큰 + React 컴포넌트 시스템", arrow: "컴포넌트 공급", color: "axis-blue" },
];

const processSteps = [
  { step: "01", title: "수집", desc: "시장/트렌드/경쟁사 데이터 자동 수집 (Discovery-X 연동)", icon: Scan },
  { step: "02", title: "발굴", desc: "아이디어 등록 + 5유형(I/M/P/T/S) 분류 + 사업성 체크포인트", icon: Lightbulb },
  { step: "03", title: "형상화", desc: "BMC 에디터 + AI 초안 (BMCAgent) + PRD 자동 작성", icon: PenTool },
  { step: "04", title: "검증", desc: "다중 AI 검토 + Six Hats 토론 + 팀 승인", icon: CheckCircle2 },
  { step: "05", title: "제품화", desc: "PoC/MVP 자동 구축 — AI 에이전트가 코드·테스트·배포 처리", icon: Rocket },
  { step: "06", title: "GTM", desc: "제안서·발표자료·데모 환경 자동 생성", icon: Megaphone },
  { step: "07", title: "평가", desc: "KPI 추적 + 포트폴리오 대시보드 + Go/Kill 판단", icon: BarChart3 },
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
    <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
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
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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
            수집→발굴→형상화→검증→제품화→GTM→평가 —
            <br className="hidden sm:block" />
            <span className="text-foreground/80">
              BDP 7단계를 AI 에이전트가 자동화해요.
            </span>
          </p>

          {/* Value proposition — 3-step */}
          <div className="animate-fade-in-up stagger-3 mx-auto mt-8 flex max-w-lg flex-col gap-2">
            {[
              {
                icon: Timer,
                text: "85% 단축",
                desc: "사업기회 발굴→PoC 구축 — 2~4주에서 3일 이내로",
              },
              {
                icon: Network,
                text: "BDP 7단계",
                desc: "수집 · 발굴 · 형상화 · 검증 · 제품화 · GTM · 평가",
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
              BDP{" "}
              <span className="text-axis-primary">7단계</span> 프로세스
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              수집에서 평가까지, AI 에이전트가 사업개발 전 과정을 자동화해요.
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
              BDP 라이프사이클, AI 에이전트, SDD Triangle.
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
              <span className="text-axis-primary">AI 에이전트</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              사업기회 형상화부터 코드 검증까지. 멀티모델 파이프라인으로 품질을 보장해요.
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
              수집 · 오케스트레이션 · 디자인을 연결해요.
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
              Phase 5{" "}
              <span className="text-axis-primary">로드맵</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              CLI에서 시작해 BDP 자동화까지. 71 Sprint를 거치며 사업개발 플랫폼을 구축했어요.
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
            <span className="text-axis-primary">사업개발을 자동화하세요</span>
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Foundry-X는 AX 사업개발의 전체 라이프사이클을 자동화해요.
            <br />
            수집에서 평가까지, BDP 7단계를 한 곳에서.
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
