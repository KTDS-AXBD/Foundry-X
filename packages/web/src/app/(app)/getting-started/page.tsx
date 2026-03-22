"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Bot,
  FileText,
  Blocks,
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
  Inbox,
  TrendingUp,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import {
  getOnboardingProgress,
  completeOnboardingStep,
  submitFeedback,
  type OnboardingProgress,
  type OnboardingStep,
} from "@/lib/api-client";
import { useRestartTour } from "@/components/feature/OnboardingTour";

// ─── 3대 업무 동선 퀵스타트 ───

const workflowCards = [
  {
    href: "/sr",
    icon: Inbox,
    title: "📥 SR 처리하기",
    subtitle: "SR 접수 → AI 분류 → 제안서",
    description:
      "고객 서비스 요청(SR)을 접수하면 AI가 자동으로 유형을 분류하고, 워크플로우를 매핑해요.",
    cta: "SR 관리로 이동",
    color: "text-axis-primary",
    bg: "bg-axis-primary/10",
    border: "border-axis-primary/20",
  },
  {
    href: "/spec-generator",
    icon: FileText,
    title: "📝 아이디어 → 명세",
    subtitle: "아이디어 → Spec 생성 → 에이전트 실행",
    description:
      "아이디어를 자연어로 입력하면 구조화된 명세가 자동 생성돼요. 에이전트가 바로 작업을 시작해요.",
    cta: "Spec 생성으로 이동",
    color: "text-axis-accent",
    bg: "bg-axis-accent/10",
    border: "border-axis-accent/20",
  },
  {
    href: "/dashboard",
    icon: TrendingUp,
    title: "📈 현황 확인하기",
    subtitle: "대시보드 → KPI → 비용",
    description:
      "프로젝트 건강도, 스프린트 상태, KPI 지표, 토큰 비용을 한눈에 모니터링하세요.",
    cta: "대시보드로 이동",
    color: "text-axis-green",
    bg: "bg-axis-green/10",
    border: "border-axis-green/20",
  },
];

// ─── Feature Cards Data (기존 — 하단 보조) ───

const featureCards = [
  {
    href: "/agents",
    icon: Bot,
    title: "에이전트",
    description: "AI 에이전트의 작업 현황과 PR 파이프라인 관리",
    color: "text-axis-primary",
    bg: "bg-axis-primary/10",
  },
  {
    href: "/architecture",
    icon: Blocks,
    title: "아키텍처",
    description: "코드 아키텍처를 4가지 뷰로 시각화",
    color: "text-axis-warm",
    bg: "bg-axis-warm/10",
  },
  {
    href: "/wiki",
    icon: BookOpen,
    title: "지식베이스",
    description: "팀 지식을 구조화하고 AI가 자동 업데이트",
    color: "text-axis-violet",
    bg: "bg-axis-violet/10",
  },
];

// ─── FAQ Data ───

const faqItems = [
  {
    value: "faq-1",
    trigger: "Foundry-X는 무엇인가요?",
    content:
      "AX 사업개발 업무의 전체 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼입니다. Git이 진실, Foundry-X는 렌즈 — 6종 전문 에이전트가 코드 생성, 테스트, 보안 검토, 배포까지 자동 수행합니다.",
  },
  {
    value: "faq-2",
    trigger: "프로젝트를 어떻게 연결하나요?",
    content:
      "Dashboard에서 'Add Project'를 클릭하고 GitHub 리포지토리 URL을 입력하세요. Foundry-X가 자동으로 코드 구조를 분석하고 하네스를 생성합니다.",
  },
  {
    value: "faq-3",
    trigger: "에이전트는 어떤 일을 하나요?",
    content:
      "에이전트는 코드 리뷰, PR 생성, 충돌 해결, 명세 동기화 등을 자동으로 수행합니다. PlannerAgent가 작업을 계획하고, ReviewerAgent가 품질을 검증합니다.",
  },
  {
    value: "faq-4",
    trigger: "SDD Triangle이 무엇인가요?",
    content:
      "Spec(명세) ↔ Code ↔ Test 3요소의 정합성을 실시간으로 추적하는 Foundry-X의 핵심 메커니즘입니다. 건강도 점수가 낮으면 동기화가 필요합니다.",
  },
  {
    value: "faq-5",
    trigger: "NPS 피드백은 어떻게 제출하나요?",
    content:
      "이 페이지 하단의 피드백 폼에서 점수와 코멘트를 입력하여 제출할 수 있습니다. 또는 Analytics 페이지에서도 확인할 수 있습니다.",
  },
];

// ─── Welcome Banner ───

function WelcomeBanner({
  progressPercent,
  onRestartTour,
}: {
  progressPercent: number;
  onRestartTour: () => void;
}) {
  return (
    <div className="rounded-xl border border-axis-primary/20 bg-gradient-to-r from-axis-primary/5 via-axis-primary/10 to-axis-accent/5 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold font-display">
            Foundry-X 시작하기
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">
            아래 3가지 업무 동선을 확인하고, 바로 시작해 보세요.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRestartTour}
          className="shrink-0 gap-1.5 text-xs"
        >
          <RotateCcw className="size-3" />
          투어 다시 보기
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-axis-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-sm font-medium tabular-nums">
          {progressPercent}%
        </span>
      </div>
    </div>
  );
}

// ─── 3대 동선 퀵스타트 카드 ───

function WorkflowQuickstart() {
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold font-display">
        어디서부터 시작할까요?
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        아래 3가지 업무 흐름 중 하나를 선택해서 바로 시작하세요.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {workflowCards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Card
              className={cn(
                "flex h-full flex-col border transition-all duration-200 hover:shadow-md",
                card.border,
              )}
            >
              <CardHeader className="pb-2">
                <div
                  className={cn(
                    "mb-2 flex size-10 items-center justify-center rounded-lg",
                    card.bg,
                  )}
                >
                  <card.icon className={cn("size-5", card.color)} />
                </div>
                <CardTitle className="text-base">{card.title}</CardTitle>
                <p className="text-xs font-medium text-muted-foreground/80">
                  {card.subtitle}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col pt-0">
                <CardDescription className="flex-1">
                  {card.description}
                </CardDescription>
                <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-axis-primary group-hover:underline">
                  {card.cta}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 보조 기능 카드 ───

function FeatureCardsSection() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">더 알아보기</h2>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {featureCards.map((card) => (
          <Card key={card.href} className="flex flex-col">
            <CardHeader className="pb-2">
              <div
                className={cn(
                  "mb-2 flex size-10 items-center justify-center rounded-lg",
                  card.bg,
                )}
              >
                <card.icon className={cn("size-5", card.color)} />
              </div>
              <CardTitle className="text-base">{card.title}</CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <Link href={card.href}>
                <Button variant="outline" size="sm" className="w-full">
                  둘러보기
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─── Onboarding Checklist ───

function OnboardingChecklist({
  steps,
  onToggle,
  loading,
}: {
  steps: OnboardingStep[];
  onToggle: (stepId: string) => void;
  loading: boolean;
}) {
  const completedCount = steps.filter((s) => s.completed).length;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">온보딩 체크리스트</h2>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>
            {completedCount}/{steps.length} 완료
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              불러오는 중...
            </div>
          )}
          {!loading &&
            steps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (!step.completed) onToggle(step.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  step.completed
                    ? "text-muted-foreground"
                    : "hover:bg-muted/50",
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="size-5 shrink-0 text-green-500" />
                ) : (
                  <Circle className="size-5 shrink-0 text-muted-foreground/40" />
                )}
                <span className={cn(step.completed && "line-through")}>
                  {step.label}
                </span>
              </button>
            ))}
          {!loading && steps.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              체크리스트 항목이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

// ─── FAQ Section ───

function FaqSection() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">자주 묻는 질문</h2>
      <Accordion items={faqItems} type="single" />
    </section>
  );
}

// ─── NPS Feedback Form ───

function NpsFeedbackForm() {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (score === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({ npsScore: score, comment: comment || undefined });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section>
        <h2 className="mb-4 text-lg font-semibold">피드백</h2>
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <CheckCircle2 className="size-10 text-green-500" />
            <p className="text-sm font-medium">감사합니다! 피드백이 제출되었습니다.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">피드백</h2>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Foundry-X를 추천할 의향이 있으신가요?
          </CardTitle>
          <CardDescription>
            1(전혀 아니다) ~ 10(매우 그렇다) 중 선택해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                  score === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>전혀 아니다</span>
            <span>매우 그렇다</span>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="추가 의견이 있다면 자유롭게 작성해 주세요 (선택)"
            className="min-h-[80px] w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={score === null || submitting}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                제출 중...
              </>
            ) : (
              "피드백 제출"
            )}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── Page ───

export default function GettingStartedPage() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const restartTour = useRestartTour();

  useEffect(() => {
    let cancelled = false;
    getOnboardingProgress()
      .then((data) => {
        if (!cancelled) {
          setProgress(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleStep = async (stepId: string) => {
    if (!progress) return;
    // optimistic update
    setProgress((prev) => {
      if (!prev) return prev;
      const updatedSteps = prev.steps.map((s) =>
        s.id === stepId ? { ...s, completed: true, completedAt: new Date().toISOString() } : s,
      );
      const completedSteps = updatedSteps.filter((s) => s.completed).map((s) => s.id);
      return {
        ...prev,
        steps: updatedSteps,
        completedSteps,
        progressPercent: Math.round((completedSteps.length / prev.totalSteps) * 100),
      };
    });
    try {
      await completeOnboardingStep(stepId);
    } catch {
      // revert on error
      setProgress((prev) => {
        if (!prev) return prev;
        const revertedSteps = prev.steps.map((s) =>
          s.id === stepId ? { ...s, completed: false, completedAt: null } : s,
        );
        const completedSteps = revertedSteps.filter((s) => s.completed).map((s) => s.id);
        return {
          ...prev,
          steps: revertedSteps,
          completedSteps,
          progressPercent: Math.round((completedSteps.length / prev.totalSteps) * 100),
        };
      });
    }
  };

  const progressPercent = progress?.progressPercent ?? 0;
  const steps = progress?.steps ?? [];

  return (
    <div className="space-y-8">
      <WelcomeBanner
        progressPercent={progressPercent}
        onRestartTour={restartTour}
      />

      <WorkflowQuickstart />

      <FeatureCardsSection />

      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          온보딩 데이터를 불러오지 못했습니다: {error}
        </div>
      )}

      <OnboardingChecklist
        steps={steps}
        onToggle={handleToggleStep}
        loading={loading}
      />

      <FaqSection />

      <NpsFeedbackForm />
    </div>
  );
}
