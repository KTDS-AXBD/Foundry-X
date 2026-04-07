"use client";

import { Fragment } from "react";
import { Link } from "react-router-dom";
import {
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
  sprint: "Sprint 186",
  phase: "Phase 20 진행 중",
  phaseTitle: "AX BD MSA 재조정",
  tagline: "사업기회 발굴부터 데모까지, AI가 자동화하는 BD 플랫폼",
} as const;

const STATS_FALLBACK = [
  { value: "6", label: "BD 파이프라인" },
  { value: "10+", label: "AI 에이전트" },
  { value: "22", label: "자동화 스킬" },
  { value: "186", label: "Sprints" },
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
    icon: Layers,
    title: "오케스트레이션",
    label: "에이전트 조율 · 품질 보장",
    desc: "에이전트들이 병렬로 일하고, 결과를 자동 검증하고, 품질 기준을 강제해요.",
    detail: "O-G-D 적대적 루프 + Gap Analysis 90%+ 통과 + Sprint 자동화",
  },
];

interface AgentGroup {
  group: string;
  label: string;
  agents: { name: string; role: string; icon: typeof Brain }[];
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

interface SystemNode {
  name: string;
  desc: string;
  tech: string;
  icon: typeof Brain;
}

const systemFlow: SystemNode[] = [
  { name: "사용자", desc: "웹 브라우저", tech: "fx.minu.best", icon: Eye },
  { name: "Web Dashboard", desc: "시각화 · 관리", tech: "React + Vite", icon: Layers },
  { name: "API Server", desc: "비즈니스 로직", tech: "Hono on CF Workers", icon: GitBranch },
  { name: "AI 에이전트", desc: "자동화 파이프라인", tech: "멀티모델 오케스트레이션", icon: Brain },
  { name: "Data Store", desc: "영속 저장소", tech: "D1 SQLite + Git", icon: Shield },
];

const openSourcePartners = [
  { name: "gstack", role: "코드리뷰 · QA · 배포", desc: "AI 기반 코드 리뷰, QA 자동화, 원클릭 배포" },
  { name: "bkit", role: "PDCA 사이클 관리", desc: "Plan→Design→Do→Check→Act 전체 사이클 자동화" },
  { name: "OpenSpec", role: "명세 자동화", desc: "Spec ↔ Code ↔ Test 동기화 엔진" },
  { name: "TinaCMS", role: "콘텐츠 관리", desc: "랜딩 페이지·위키 콘텐츠를 Git 기반으로 편집" },
  { name: "Marker.io", role: "피드백 수집", desc: "스크린샷 기반 시각 피드백 → 자동 이슈 생성" },
];

const roadmap: {
  phase: string;
  version: string;
  status: "done" | "current" | "planned";
  items: string[];
}[] = [
  { phase: "기반 구축", version: "Sprint 1~74", status: "done",
    items: ["CLI + API + Web Dashboard", "SSO + RBAC 멀티테넌시", "6종 AI Agent 기반"] },
  { phase: "BD 자동화", version: "Sprint 75~121", status: "done",
    items: ["BD Pipeline E2E 통합", "O-G-D Agent Loop", "IA 대개편 12 F-items"] },
  { phase: "현재", version: "Sprint 122~147", status: "current",
    items: ["Skill Unification", "TinaCMS + Marker.io", "IA 재설계 v1.3"] },
  { phase: "다음 목표", version: "Phase 14+", status: "planned",
    items: ["평가 프레임워크", "팀 확산 온보딩", "외부 공개 준비"] },
];

const processSteps = [
  { step: "01", title: "수집", desc: "시장/트렌드/경쟁사 데이터 자동 수집 (Discovery-X 연동)", icon: Scan, active: true },
  { step: "02", title: "발굴", desc: "아이디어 등록 + 5유형(I/M/P/T/S) 분류 + 사업성 체크포인트", icon: Lightbulb, active: true },
  { step: "03", title: "형상화", desc: "BMC 에디터 + AI 초안 + PRD 자동 작성 + 다중 AI 검토", icon: PenTool, active: true },
  { step: "04", title: "검증", desc: "본부/전사/임원 3단계 검증 + Go/Hold/Drop 의사결정", icon: CheckCircle2, active: true },
  { step: "05", title: "제품화", desc: "PoC/MVP 자동 구축 — AI 에이전트가 코드·테스트·배포 처리", icon: Rocket, active: true },
  { step: "06", title: "GTM", desc: "제안서·Offering Pack·데모 환경 자동 생성", icon: Megaphone, active: true },
  { step: "07", title: "평가", desc: "KPI 추적 + 포트폴리오 대시보드 + Go/Kill 판단", icon: BarChart3, active: false },
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
          <div className={`bp-box group relative px-4 py-3 transition-colors w-full md:w-auto ${!step.active ? "opacity-40 border-dashed" : "hover:bg-[oklch(0.55_0.15_250/5%)]"}`}>
            <div className="flex items-center gap-2">
              <span className="bp-annotation font-bold">{step.step}</span>
              <step.icon className="size-4 bp-line" />
            </div>
            <h3 className="bp-line mt-1 font-display text-sm font-bold">{step.title}</h3>
            {!step.active && (
              <span className="bp-annotation text-[10px]">향후 구현</span>
            )}
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

function OpenSourcePartnersGrid() {
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

function RoadmapTimeline() {
  return (
    <div className="space-y-3">
      {roadmap.map((phase) => (
        <div key={phase.phase} className={`flex flex-col gap-2 md:flex-row md:items-center md:gap-4 ${phase.status === "planned" ? "opacity-60" : ""}`}>
          {/* Phase label */}
          <div className="w-28 shrink-0">
            <span className="bp-line font-display text-sm font-bold">{phase.phase}</span>
            <br />
            <span className="bp-annotation">{phase.version}</span>
          </div>
          {/* Gantt bar */}
          <div className="flex-1">
            <div className={`bp-box flex flex-wrap items-center gap-3 px-4 py-2 ${phase.status === "planned" ? "border-dashed" : ""}`}>
              <span className="text-xs text-muted-foreground">
                {phase.items.join(" · ")}
              </span>
              {phase.status === "done" && (
                <span className="ml-auto bp-annotation">✓ DONE</span>
              )}
              {phase.status === "current" && (
                <span className="ml-auto bp-annotation">● NOW</span>
              )}
              {phase.status === "planned" && (
                <span className="ml-auto bp-annotation">○ NEXT</span>
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
                사업기회 발굴부터
                <br />
                데모까지,
                <br />
                AI가 자동화해요
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                BDP 6단계를 AI 에이전트가 자동으로 처리해요.
                수집→발굴→형상화→검증→제품화→GTM.
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
          title="BDP 6+1 프로세스"
          desc="수집에서 GTM까지, AI 에이전트가 사업개발 전 과정을 자동화해요."
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
          desc="BDP 라이프사이클, AI 에이전트 파이프라인, 오케스트레이션."
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
          title="10+ AI 에이전트 · 3개 파이프라인"
          desc="발굴에서 배포까지. 에이전트 그룹이 사업개발 전 과정을 자동화해요."
        />
        <AgentGroupGrid />
      </div>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section id="architecture" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="System"
          title="시스템 구성도"
          desc="사용자부터 데이터까지, 요청이 흐르는 경로를 한눈에."
        />
        <SystemFlowDiagram />
      </div>
    </section>
  );
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          label="Open Source"
          title="오픈소스 연계"
          desc="혼자 하지 않아요 — 검증된 오픈소스와 함께."
        />
        <OpenSourcePartnersGrid />
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
          title="로드맵"
          desc="147 Sprint를 거치며 사업개발 자동화 플랫폼을 구축해왔어요."
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
          사업개발, 수동으로 하고 계신가요?
        </h2>
        <p className="mt-6 text-lg text-muted-foreground">
          Foundry-X가 발굴부터 데모까지 자동화해요.
          <br />
          우리 팀의 BD 프로세스를 한 단계 올려보세요.
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
