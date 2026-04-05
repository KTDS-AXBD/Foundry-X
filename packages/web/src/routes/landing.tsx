"use client";

import { Fragment } from "react";
import { Link } from "react-router-dom";
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
  PenTool,
  Rocket,
  Scan,
  Shield,
  ShieldCheck,
  Target,
  TestTube,
} from "lucide-react";
import { parseFrontmatter, type HeroContent } from "@/lib/content-loader";
import heroRaw from "../../content/landing/hero.md?raw";
import featuresRaw from "../../content/landing/features.md?raw";
import statsRaw from "../../content/landing/stats.md?raw";
import ctaRaw from "../../content/landing/cta.md?raw";

interface LandingSectionContent {
  title: string;
  section: string;
  sort_order?: number;
}

// Build-time content from TinaCMS-managed Markdown — used for section ordering
const sectionContents = [
  parseFrontmatter<LandingSectionContent>(heroRaw),
  parseFrontmatter<LandingSectionContent>(statsRaw),
  parseFrontmatter<LandingSectionContent>(featuresRaw),
  parseFrontmatter<LandingSectionContent>(ctaRaw),
];

// Section key → sort_order map (CMS-driven ordering)
const sectionOrder: Record<string, number> = {};
for (const s of sectionContents) {
  if (s.data.section) {
    sectionOrder[s.data.section] = s.data.sort_order ?? 99;
  }
}

// Default section order (fallback when no sort_order in content)
const DEFAULT_SECTION_ORDER: Record<string, number> = {
  hero: 0,
  process: 1,
  features: 2,
  agents: 3,
  architecture: 4,
  ecosystem: 5,
  roadmap: 6,
  cta: 7,
};

function getSectionOrder(section: string): number {
  return sectionOrder[section] ?? DEFAULT_SECTION_ORDER[section] ?? 99;
}

/* ═══════════════════════════════════════════════
   DATA — PRD v8 기반 (TinaCMS content with fallback)
   ═══════════════════════════════════════════════ */

const SITE_META_FALLBACK = {
  sprint: "Sprint 137",
  phase: "Phase 12 완료",
  phaseTitle: "Skill Unification",
  tagline: "AX 사업개발 AI 오케스트레이션 플랫폼",
} as const;

const STATS_FALLBACK = [
  { value: "~89", label: "API Routes" },
  { value: "~206", label: "Services" },
  { value: "3,148+", label: "Tests" },
  { value: "101", label: "D1 Migrations" },
  { value: "137", label: "Sprints" },
];

// Build-time content from TinaCMS-managed Markdown
const heroContent = parseFrontmatter<HeroContent>(heroRaw);

const SITE_META = {
  sprint: SITE_META_FALLBACK.sprint,
  phase: heroContent.data.phase ?? SITE_META_FALLBACK.phase,
  phaseTitle: heroContent.data.phaseTitle ?? SITE_META_FALLBACK.phaseTitle,
  tagline: heroContent.data.tagline ?? SITE_META_FALLBACK.tagline,
} as const;

const stats =
  heroContent.data.stats && heroContent.data.stats.length > 0
    ? heroContent.data.stats
    : STATS_FALLBACK;

const pillars = [
  {
    icon: Brain,
    title: "BDP 라이프사이클",
    label: "7단계 자동화",
    desc: "수집→발굴→형상화→검증→제품화→GTM→평가. 사업개발 전체를 한 곳에서.",
    detail: "AX BD 프로세스 v8.2 기반, 5유형(I/M/P/T/S) 강도 라우팅 + 사업성 체크포인트",
  },
  {
    icon: Target,
    title: "AI 에이전트 하네스",
    label: "BMCAgent + InsightAgent",
    desc: "BMC 초안 자동 작성, 인사이트 도출, 다중 AI 검토까지. 에이전트가 사업기회를 형상화해요.",
    detail: "Anthropic + OpenAI + Gemini + DeepSeek 멀티모델 파이프라인",
  },
  {
    icon: Shield,
    title: "SDD Triangle",
    label: "Spec ↔ Code ↔ Test",
    desc: "명세, 코드, 테스트가 항상 동기화돼요. Git이 진실, Foundry-X는 렌즈.",
    detail: "~89 routes, 3,148+ tests, 101 D1 migrations — 자동 정합성 검증",
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
  { layer: "API Layer", items: ["~89 Routes", "~206 Services", "~104 Schemas"], tech: "Hono on Cloudflare Workers" },
  { layer: "Agent Layer", items: ["BMCAgent", "InsightAgent", "ReviewAgent", "ArchitectAgent + 3종"], tech: "Orchestrator + MCP + Multi-Model" },
  { layer: "Data Layer", items: ["D1 SQLite (101 Migrations)", "KV Cache", "Git (SSOT)"], tech: "Cloudflare D1 + simple-git" },
];

const roadmap: {
  phase: string;
  title: string;
  version: string;
  status: "done" | "current" | "planned";
  items: string[];
}[] = [
  { phase: "Phase 1~5", title: "Foundation", version: "Sprint 1~74", status: "done",
    items: ["CLI + Ink TUI", "API + Web Dashboard", "SSO + RBAC 멀티테넌시", "6종 AI Agent + TDD"] },
  { phase: "Phase 6~7", title: "Ecosystem + BD Pipeline", version: "Sprint 75~81", status: "done",
    items: ["BMAD/OpenSpec 벤치마킹", "BD Pipeline E2E 통합", "Discovery-X 연동"] },
  { phase: "Phase 8~9", title: "IA + 팀 온보딩", version: "Sprint 82~100", status: "done",
    items: ["IA 구조 개선 + 인증 강화", "BD 스킬 배포 + Plugin 전환", "발굴 UX (GIVC PoC)"] },
  { phase: "Phase 10", title: "O-G-D + Skill Evolution", version: "Sprint 101~112", status: "done",
    items: ["O-G-D Agent Loop", "BD 형상화 A~F", "BD ROI 벤치마크"] },
  { phase: "Phase 11", title: "IA 대개편", version: "Sprint 113~121", status: "done",
    items: ["12 F-items 전체 완료", "구조 기반 + 기능 확장", "GTM 선제안 아웃리치"] },
  { phase: "Phase 12", title: "Skill Unification", version: "Sprint 125~128", status: "done",
    items: ["3개 스킬 시스템 통합", "D1~D4 4대 단절 해소", "메트릭 수집 + 대시보드"] },
];

const ecosystem = [
  { name: "Discovery-X", role: "수집 엔진", desc: "시장/트렌드/경쟁사 데이터 수집 → API로 Foundry-X에 공급", arrow: "API 연동" },
  { name: "Foundry-X", role: "베이스캠프", desc: "발굴→형상화→검증→제품화→GTM→평가 전 단계 오케스트레이션", arrow: "중심" },
  { name: "AXIS DS", role: "UI 일관성", desc: "디자인 토큰 + React 컴포넌트 시스템", arrow: "컴포넌트 공급" },
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
   SHARED COMPONENTS
   ═══════════════════════════════════════════════ */

function SectionHeader({ label, title, desc }: { label: string; title: React.ReactNode; desc: string }) {
  return (
    <div className="mb-16 text-center">
      <span className="bp-annotation mb-4 inline-block uppercase tracking-widest">{label}</span>
      <h2 className="bp-line font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 text-lg text-muted-foreground">{desc}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION COMPONENTS — Blueprint Style
   ═══════════════════════════════════════════════ */

function ProcessFlow() {
  return (
    <div className="flex flex-col items-center gap-2 md:flex-row md:flex-wrap md:justify-center md:gap-3">
      {processSteps.map((step, i) => (
        <Fragment key={step.step}>
          {/* Diamond decision node */}
          {i > 0 && (
            <>
              <span className="bp-line hidden text-lg md:inline">→</span>
              <div className="bp-diamond shrink-0 md:block hidden" />
              <span className="bp-line hidden text-lg md:inline">→</span>
              {/* mobile vertical separator */}
              <div className="h-4 w-px bg-current/20 md:hidden" />
            </>
          )}
          {/* Process box */}
          <div className="bp-box group relative px-4 py-3 transition-colors hover:bg-[oklch(0.55_0.15_250/5%)] w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="bp-annotation font-bold">{step.step}</span>
              <step.icon className="size-4 bp-line" />
            </div>
            <h3 className="bp-line mt-1 font-display text-sm font-bold">{step.title}</h3>
            {/* Hover tooltip */}
            <div className="pointer-events-none absolute top-full left-0 z-20 mt-1 hidden w-48 p-3 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 md:block bp-box">
              {step.desc}
            </div>
            {/* Mobile: always show desc */}
            <p className="mt-1 text-xs text-muted-foreground md:hidden">{step.desc}</p>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function PillarGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {pillars.map((p) => (
        <div key={p.title} className="bp-box p-6 transition-colors hover:bg-[oklch(0.55_0.15_250/5%)]">
          <div className="mb-4 flex items-center gap-3">
            <p.icon className="size-6 bp-line" />
            <span className="bp-annotation uppercase">{p.label}</span>
          </div>
          <h3 className="bp-line font-display text-lg font-bold">{p.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
          <div className="mt-4 border-t border-current/10 pt-3">
            <span className="bp-annotation">{p.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <div key={agent.name} className="bp-box group relative p-5 transition-colors hover:bg-[oklch(0.55_0.15_250/5%)]">
          {/* Left pin marker */}
          <div className="absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-[oklch(0.55_0.15_250)]" />
          <div className="mb-3 flex items-center gap-3">
            <agent.icon className="size-5 bp-line" />
            <div>
              <h3 className="bp-line font-display text-sm font-bold">{agent.name}</h3>
              <span className="bp-annotation">{agent.role}</span>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{agent.desc}</p>
        </div>
      ))}
    </div>
  );
}

function ArchitectureBlueprint() {
  return (
    <div className="bp-bg space-y-0 rounded-lg p-6">
      {architecture.map((layer, i) => (
        <Fragment key={layer.layer}>
          <div className="bp-box relative p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="min-w-[120px]">
                <span className="bp-line font-display text-sm font-bold">{layer.layer}</span>
                <br />
                <span className="bp-annotation">{layer.tech}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {layer.items.map((item) => (
                  <span key={item} className="bp-box px-2.5 py-1 font-mono text-[11px] bp-line">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {/* Arrow between layers */}
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

function EcosystemDiagram() {
  return (
    <div className="relative mx-auto max-w-2xl py-8">
      {/* Central node */}
      <div className="mx-auto flex w-fit flex-col items-center">
        <div className="bp-box flex size-28 items-center justify-center rounded-full">
          <div className="flex flex-col items-center gap-1">
            <Anvil className="size-8 bp-line" />
            <span className="bp-line font-display text-xs font-bold">Foundry-X</span>
          </div>
        </div>
        <span className="bp-annotation mt-2 uppercase tracking-widest">오케스트레이션</span>
      </div>
      {/* Connection lines + satellite nodes */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ecosystem.map((svc) => (
          <div key={svc.name} className="flex flex-col items-center gap-3">
            <div className="h-8 w-px bg-current/20" />
            <span className="bp-annotation">{svc.arrow}</span>
            <div className="bp-box w-full p-4 text-center">
              <span className="bp-line font-display text-sm font-bold">{svc.name}</span>
              <br />
              <span className="bp-annotation">{svc.role}</span>
              <p className="mt-1 text-[11px] text-muted-foreground">{svc.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapTimeline() {
  return (
    <div className="space-y-3">
      {roadmap.map((phase) => (
        <div key={phase.phase} className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          {/* Phase label */}
          <div className="w-28 shrink-0">
            <span className="bp-line font-display text-sm font-bold">{phase.phase}</span>
            <br />
            <span className="bp-annotation">{phase.version}</span>
          </div>
          {/* Gantt bar */}
          <div className="flex-1">
            <div className="bp-box flex flex-wrap items-center gap-3 px-4 py-2">
              <span className="bp-line text-sm font-bold">{phase.title}</span>
              <span className="text-xs text-muted-foreground">
                {phase.items.join(" · ")}
              </span>
              {phase.status === "done" && (
                <span className="ml-auto bp-annotation">✓ DONE</span>
              )}
              {phase.status === "current" && (
                <span className="ml-auto bp-annotation">● NOW</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PAGE SECTIONS
   ═══════════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="bp-bg relative min-h-[92vh] px-6 pt-16">
      <div className="mx-auto flex max-w-6xl items-center" style={{ minHeight: "calc(92vh - 4rem)" }}>
        <div className="w-full">
          {/* Phase badge */}
          <div className="bp-annotation mb-6 inline-block border border-current/20 px-3 py-1">
            {SITE_META.sprint} · {SITE_META.phase} {SITE_META.phaseTitle}
          </div>

          <div className="grid gap-12 lg:grid-cols-12">
            {/* Left: headline + CTA */}
            <div className="lg:col-span-7">
              <h1 className="bp-line font-display text-5xl font-bold leading-[1.1] sm:text-6xl md:text-7xl">
                AI 에이전트가
                <br />
                일하는 방식을
                <br />
                설계하다
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                수집→발굴→형상화→검증→제품화→GTM→평가 —
                BDP 7단계를 AI 에이전트가 자동화해요.
              </p>
              {/* CTA buttons — bp-box style */}
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/dashboard" className="bp-box inline-flex items-center gap-2 px-6 py-3 font-bold bp-line transition-colors hover:bg-[oklch(0.55_0.15_250/10%)]">
                  Dashboard 열기
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="https://github.com/KTDS-AXBD/Foundry-X"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bp-box inline-flex items-center gap-2 px-6 py-3 bp-line/60 transition-colors hover:bg-[oklch(0.55_0.15_250/5%)]"
                >
                  <GitBranch className="size-4" />
                  GitHub
                  <ArrowUpRight className="size-3" />
                </a>
              </div>
            </div>

            {/* Right: measurement annotations (stats) */}
            <div className="flex flex-col justify-center gap-4 lg:col-span-5">
              {stats.map((stat) => (
                <div key={stat.label} className="bp-box flex items-baseline gap-3 p-4">
                  <span className="bp-line font-display text-3xl font-bold">{stat.value}</span>
                  <span className="bp-annotation uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section id="process" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="How It Works"
          title="BDP 7단계 프로세스"
          desc="수집에서 평가까지, AI 에이전트가 사업개발 전 과정을 자동화해요."
        />
        <ProcessFlow />
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="Core Pillars"
          title="세 가지 차별점"
          desc="BDP 라이프사이클, AI 에이전트, SDD Triangle."
        />
        <PillarGrid />
      </div>
    </section>
  );
}

function AgentsSection() {
  return (
    <section id="agents" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="Agent Ecosystem"
          title="6종 AI 에이전트"
          desc="사업기회 형상화부터 코드 검증까지. 멀티모델 파이프라인으로 품질을 보장해요."
        />
        <AgentGrid />
      </div>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section id="architecture" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="Architecture"
          title="4-Layer 아키텍처"
          desc="CLI에서 데이터까지, 모든 레이어가 유기적으로 연결돼요."
        />
        <ArchitectureBlueprint />
      </div>
    </section>
  );
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="Ecosystem"
          title="AX 생태계"
          desc="수집 · 오케스트레이션 · 디자인을 연결해요."
        />
        <EcosystemDiagram />
      </div>
    </section>
  );
}

function RoadmapSection() {
  return (
    <section id="roadmap" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="Roadmap"
          title="Phase 1~12 로드맵"
          desc="CLI에서 시작해 Skill Unification까지. 137 Sprint를 거치며 사업개발 플랫폼을 구축했어요."
        />
        <RoadmapTimeline />
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="bp-line font-display text-3xl font-bold">
          AI 에이전트와 함께
          <br />
          사업개발을 자동화하세요
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">
          Foundry-X는 AX 사업개발의 전체 라이프사이클을 자동화해요.
          <br />
          수집에서 평가까지, BDP 7단계를 한 곳에서.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/dashboard"
            className="bp-box inline-flex items-center gap-2 px-7 py-3 font-bold bp-line transition-colors hover:bg-[oklch(0.55_0.15_250/10%)]"
          >
            시작하기
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="https://github.com/KTDS-AXBD/Foundry-X"
            target="_blank"
            rel="noopener noreferrer"
            className="bp-box inline-flex items-center gap-2 px-7 py-3 bp-line/60 transition-colors hover:bg-[oklch(0.55_0.15_250/5%)]"
          >
            GitHub
            <ArrowUpRight className="size-3" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════
   Section registry — CMS sort_order 기반 동적 정렬
   ═══════════════════════════════════════════════ */

const landingSections = [
  { key: "hero", Component: HeroSection },
  { key: "process", Component: ProcessSection },
  { key: "features", Component: FeaturesSection },
  { key: "agents", Component: AgentsSection },
  { key: "architecture", Component: ArchitectureSection },
  { key: "ecosystem", Component: EcosystemSection },
  { key: "roadmap", Component: RoadmapSection },
  { key: "cta", Component: CtaSection },
].sort((a, b) => getSectionOrder(a.key) - getSectionOrder(b.key));

/* ═══════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════ */

export function Component() {
  return (
    <div className="bp-bg relative overflow-hidden">
      {landingSections.map(({ key, Component: Section }) => (
        <Section key={key} />
      ))}
    </div>
  );
}
