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

// ─── Feature Cards Data ───

const featureCards = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "프로젝트 건강도와 SDD Triangle 상태를 한눈에 확인",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    href: "/agents",
    icon: Bot,
    title: "Agents",
    description: "AI 에이전트의 작업 현황과 PR 파이프라인 관리",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    href: "/spec-generator",
    icon: FileText,
    title: "Spec Generator",
    description: "자연어를 구조화된 명세로 변환",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    href: "/architecture",
    icon: Blocks,
    title: "Architecture",
    description: "코드 아키텍처를 4가지 뷰로 시각화",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    href: "/wiki",
    icon: BookOpen,
    title: "Wiki",
    description: "팀 지식을 구조화하고 AI가 자동 업데이트",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
];

// ─── FAQ Data ───

const faqItems = [
  {
    value: "faq-1",
    trigger: "Foundry-X는 무엇인가요?",
    content:
      "사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼입니다. Git이 진실, Foundry-X는 렌즈 — 모든 명세/코드/테스트 이력은 Git에 존재하고, Foundry-X가 이를 분석하고 동기화합니다.",
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

function WelcomeBanner({ progressPercent }: { progressPercent: number }) {
  return (
    <div className="rounded-lg border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-6">
      <h1 className="mb-2 text-2xl font-bold">Foundry-X 시작하기</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        아래 가이드를 따라 Foundry-X의 주요 기능을 살펴보고, 온보딩 체크리스트를
        완료해 보세요.
      </p>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
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

// ─── Feature Cards ───

function FeatureCardsSection() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">주요 기능</h2>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
      <WelcomeBanner progressPercent={progressPercent} />

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
