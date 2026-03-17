"use client";

import Link from "next/link";
import {
  Triangle,
  Bot,
  GitBranch,
  BookOpen,
  Wrench,
  Coins,
  Terminal,
  ArrowRight,
  Zap,
  Shield,
  Check,
  Anvil,
  Sparkles,
} from "lucide-react";

/* ─── Feature data ─── */
const features = [
  {
    icon: Triangle,
    title: "SDD Triangle",
    desc: "Spec, Code, Test 세 축의 동기화 상태를 실시간으로 추적해요. 불일치가 생기면 즉시 경고.",
    route: "/dashboard",
  },
  {
    icon: Bot,
    title: "AI Agent 투명성",
    desc: "에이전트가 무슨 작업을 하는지, 어떤 제약 조건 아래 있는지 팀 전체가 볼 수 있어요.",
    route: "/agents",
  },
  {
    icon: GitBranch,
    title: "Git-First 아키텍처",
    desc: "Git이 단일 진실 공급원. 모든 명세, 코드, 테스트, 결정 이력이 Git에 존재해요.",
    route: "/architecture",
  },
  {
    icon: BookOpen,
    title: "팀 지식 허브",
    desc: "Wiki와 문서를 Git과 동기화. 소유권 마커로 AI 자동 생성 구간을 명확히 구분해요.",
    route: "/wiki",
  },
  {
    icon: Wrench,
    title: "하네스 자동화",
    desc: "CLAUDE.md, ARCHITECTURE.md, CONSTITUTION.md를 프로젝트 구조에서 자동 생성해요.",
    route: "/dashboard",
  },
  {
    icon: Coins,
    title: "비용 투명성",
    desc: "모델별, 에이전트별 토큰 사용량과 비용을 추적. 예산 초과를 사전에 감지해요.",
    route: "/tokens",
  },
];

/* ─── How It Works ─── */
const steps = [
  {
    num: "01",
    title: "설치 & 초기화",
    desc: "npx foundry-x init 한 줄이면 프로젝트에 맞는 하네스가 자동 구성돼요.",
    code: "npx foundry-x init",
  },
  {
    num: "02",
    title: "동기화 & 검증",
    desc: "foundry-x sync로 Spec↔Code↔Test 정합성을 검사하고, 자동으로 보정 제안을 받아요.",
    code: "foundry-x sync",
  },
  {
    num: "03",
    title: "모니터링 & 협업",
    desc: "웹 대시보드에서 팀 전체가 프로젝트 건강도, 에이전트 상태, 비용을 한눈에 봐요.",
    code: "open fx.minu.best/dashboard",
  },
];

/* ─── Testimonials ─── */
const testimonials = [
  {
    quote:
      "AI 에이전트가 뭘 하고 있는지 처음으로 투명하게 보였어요. 코드 리뷰 시간이 절반으로 줄었습니다.",
    author: "Tech Lead",
    role: "AX BD팀",
  },
  {
    quote:
      "Git-First 접근이 정말 맞았어요. CLAUDE.md 자동 생성만으로도 온보딩 시간이 크게 줄었어요.",
    author: "Backend Engineer",
    role: "AX BD팀",
  },
  {
    quote:
      "SDD Triangle 점수 보면서 코드 품질 유지가 훨씬 쉬워졌어요. 명세 없는 코드가 눈에 바로 보여요.",
    author: "Frontend Developer",
    role: "AX BD팀",
  },
];

/* ─── Pricing ─── */
const plans = [
  {
    name: "Open Source",
    price: "Free",
    desc: "CLI + 핵심 기능",
    features: [
      "foundry-x init / sync / status",
      "하네스 자동 생성 (4 builders)",
      "SDD Triangle 건강도",
      "Git 연동 + 로컬 분석",
    ],
    cta: "npm install",
    highlighted: false,
  },
  {
    name: "Team",
    price: "Coming Soon",
    desc: "웹 대시보드 + 팀 협업",
    features: [
      "Open Source 기능 전부",
      "웹 대시보드 (6 pages)",
      "AI Agent 투명성 + SSE",
      "Wiki Git 동기화",
      "Token/비용 관리",
      "NL→Spec 변환",
    ],
    cta: "Request Access",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Contact",
    desc: "맞춤형 배포 + 전용 지원",
    features: [
      "Team 기능 전부",
      "On-premise 배포",
      "SSO / RBAC 고급 권한",
      "전용 지원 채널",
      "커스텀 에이전트 통합",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

/* ─── Landing Page ─── */
export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="forge-grid relative flex min-h-[90vh] items-center justify-center px-6 pt-16">
        {/* Gradient mesh background */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-forge-amber/5 blur-[120px]" />
          <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-forge-copper/5 blur-[100px]" />
          <div className="absolute top-0 left-0 h-[300px] w-[300px] rounded-full bg-forge-slate/5 blur-[80px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="animate-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-forge-amber/20 bg-forge-amber/5 px-4 py-1.5">
            <Sparkles className="size-3.5 text-forge-amber" />
            <span className="font-mono text-xs font-medium text-forge-amber">
              v0.7.0 &middot; Phase 2
            </span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-in stagger-1 font-display text-5xl leading-[1.1] font-bold tracking-tight sm:text-6xl md:text-7xl [animation-fill-mode:both]">
            Where Humans & AI
            <br />
            <span className="bg-gradient-to-r from-forge-amber via-forge-ember to-forge-copper bg-clip-text text-transparent">
              Forge Together
            </span>
          </h1>

          {/* Subheading */}
          <p className="animate-fade-in stagger-2 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground [animation-fill-mode:both]">
            Git이 진실, Foundry-X는 렌즈.
            <br className="hidden sm:block" />
            Spec↔Code↔Test 삼각 동기화로 사람과 AI 에이전트가
            <br className="hidden sm:block" />
            동등한 팀원으로 협업하는 플랫폼.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in stagger-3 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row [animation-fill-mode:both]">
            <Link
              href="/dashboard"
              className="forge-glow-strong group inline-flex h-12 items-center gap-2 rounded-xl bg-forge-amber px-7 text-sm font-bold text-forge-charcoal transition-all hover:bg-forge-ember"
            >
              Dashboard 열기
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://www.npmjs.com/package/foundry-x"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-7 text-sm font-medium backdrop-blur transition-all hover:border-forge-amber/30 hover:bg-forge-amber/5"
            >
              <Terminal className="size-4 text-forge-amber" />
              npm i -g foundry-x
            </a>
          </div>

          {/* Terminal preview */}
          <div className="animate-fade-in stagger-4 mx-auto mt-16 max-w-xl [animation-fill-mode:both]">
            <div className="forge-glass overflow-hidden rounded-xl">
              <div className="flex items-center gap-2 border-b border-border/30 px-4 py-3">
                <div className="size-3 rounded-full bg-forge-copper/40" />
                <div className="size-3 rounded-full bg-forge-amber/40" />
                <div className="size-3 rounded-full bg-green-500/40" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">
                  terminal
                </span>
              </div>
              <div className="space-y-2 p-5 font-mono text-sm">
                <div>
                  <span className="text-forge-amber">$</span>{" "}
                  <span className="text-foreground">npx foundry-x init</span>
                </div>
                <div className="text-muted-foreground">
                  Detecting project structure...
                </div>
                <div className="text-muted-foreground">
                  <span className="text-green-400">&#10003;</span> Node.js +
                  TypeScript + React detected
                </div>
                <div className="text-muted-foreground">
                  <span className="text-green-400">&#10003;</span>{" "}
                  CLAUDE.md generated
                </div>
                <div className="text-muted-foreground">
                  <span className="text-green-400">&#10003;</span>{" "}
                  ARCHITECTURE.md generated
                </div>
                <div className="text-muted-foreground">
                  <span className="text-green-400">&#10003;</span>{" "}
                  CONSTITUTION.md generated
                </div>
                <div className="mt-2">
                  <span className="text-forge-amber">$</span>{" "}
                  <span className="text-foreground">
                    foundry-x status
                  </span>
                </div>
                <div className="text-muted-foreground">
                  SDD Triangle:{" "}
                  <span className="font-bold text-green-400">92%</span> (Grade
                  A)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              하나의 플랫폼, 완전한{" "}
              <span className="text-forge-amber">투명성</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              코드, 명세, 테스트, 에이전트 — 모든 것이 연결되고 추적돼요.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <Link
                key={feat.title}
                href={feat.route}
                className={`forge-glass group relative rounded-2xl p-6 transition-all duration-300 hover:border-forge-amber/20 hover:bg-forge-amber/5 stagger-${i + 1}`}
              >
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-forge-amber/10 transition-colors group-hover:bg-forge-amber/20">
                  <feat.icon className="size-5 text-forge-amber" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold">
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feat.desc}
                </p>
                <ArrowRight className="mt-4 size-4 text-forge-amber/0 transition-all group-hover:text-forge-amber" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section
        id="how-it-works"
        className="forge-grid relative px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              3단계로{" "}
              <span className="text-forge-amber">시작</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              CLI 한 줄로 시작, 웹 대시보드로 확장.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                {/* Step number */}
                <div className="mb-6 font-display text-5xl font-bold text-forge-amber/15">
                  {step.num}
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">
                  {step.title}
                </h3>
                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                  {step.desc}
                </p>
                {/* Code snippet */}
                <div className="rounded-lg border border-border/30 bg-forge-charcoal/50 px-4 py-3 dark:bg-forge-charcoal/30">
                  <code className="font-mono text-xs text-forge-amber">
                    $ {step.code}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              팀의{" "}
              <span className="text-forge-amber">이야기</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="forge-glass rounded-2xl p-6"
              >
                <p className="mb-6 text-sm leading-relaxed text-muted-foreground italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-border/30 pt-4">
                  <div className="flex size-9 items-center justify-center rounded-full bg-forge-amber/10">
                    <span className="font-display text-xs font-bold text-forge-amber">
                      {t.author[0]}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.author}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="forge-grid relative px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              심플한{" "}
              <span className="text-forge-amber">가격 정책</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              오픈소스 CLI는 무료. 팀 기능은 곧 공개돼요.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 transition-all ${
                  plan.highlighted
                    ? "forge-glow border-2 border-forge-amber/30 bg-forge-amber/5"
                    : "forge-glass"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-forge-amber px-3 py-0.5 text-xs font-bold text-forge-charcoal">
                      <Zap className="size-3" />
                      Recommended
                    </span>
                  </div>
                )}
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                <div className="mt-2 font-display text-3xl font-bold text-forge-amber">
                  {plan.price}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.desc}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-forge-amber" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-8 flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? "bg-forge-amber text-forge-charcoal hover:bg-forge-ember"
                      : "border border-border/50 hover:border-forge-amber/30 hover:bg-forge-amber/5"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center justify-center gap-2">
            <Anvil className="size-8 text-forge-amber" />
            <Shield className="size-8 text-forge-amber/60" />
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            지금 바로{" "}
            <span className="bg-gradient-to-r from-forge-amber to-forge-copper bg-clip-text text-transparent">
              Forge
            </span>
            를 시작하세요
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            CLI 설치 한 줄이면 프로젝트의 명세-코드-테스트 동기화가 시작돼요.
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
              href="https://github.com/KTDS-AXBD/Foundry-X"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-border/50 bg-background/50 px-8 text-sm font-medium backdrop-blur transition-all hover:border-forge-amber/30"
            >
              <GitBranch className="size-4 text-forge-amber" />
              GitHub에서 보기
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
