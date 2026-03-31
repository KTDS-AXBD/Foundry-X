"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

/* ------------------------------------------------------------------ */
/*  Tour Step 정의 — 역할별 분기 (F252)                                */
/* ------------------------------------------------------------------ */

interface TourStep {
  target: string; // data-tour="..." 셀렉터 값
  title: string;
  description: string;
  position: "right" | "bottom";
}

const BASE_STEPS: TourStep[] = [
  {
    target: "getting-started",
    title: "🚀 시작하기",
    description:
      "궁금할 때 언제든 여기로 오세요. AX BD 프로세스 가이드와 단계별 안내를 볼 수 있어요.",
    position: "right",
  },
  {
    target: "dashboard",
    title: "🏠 홈",
    description:
      "프로세스 전체 진행률과 최근 활동을 한눈에 확인하세요.",
    position: "right",
  },
  {
    target: "group-collect",
    title: "📥 1. 수집",
    description:
      "SR, IR, 외부 채널에서 사업 아이디어를 수집하는 첫 번째 단계예요.",
    position: "right",
  },
  {
    target: "group-discover",
    title: "🔍 2. 발굴",
    description:
      "수집된 아이디어를 분석하고 사업성을 평가해요. Discovery 프로세스, BMC, 진행률을 확인하세요.",
    position: "right",
  },
  {
    target: "group-shape",
    title: "📐 3. 형상화",
    description:
      "검증된 아이디어를 Spec, 사업제안서, Offering Pack으로 구체화해요.",
    position: "right",
  },
  {
    target: "group-validate",
    title: "✅ 4~6. 검증→제품화→GTM",
    description:
      "게이트 통과(ORB/PRB), MVP 제작, 시장 진출까지 나머지 단계를 진행하세요.",
    position: "right",
  },
];

const ADMIN_EXTRA_STEPS: TourStep[] = [
  {
    target: "settings",
    title: "⚙️ 팀 설정",
    description:
      "Org 설정과 멤버 관리를 여기서 할 수 있어요. 팀원 초대와 역할 변경이 가능해요.",
    position: "right",
  },
  {
    target: "agents",
    title: "🤖 에이전트 설정",
    description:
      "팀 에이전트를 커스터마이징하고 워크플로우 자동화를 구성하세요.",
    position: "right",
  },
  {
    target: "workspace",
    title: "📊 워크스페이스",
    description:
      "팀 전체의 KPI와 워크플로우 분석을 대시보드에서 확인하세요.",
    position: "right",
  },
  {
    target: "tokens",
    title: "🔑 토큰 관리",
    description:
      "API 토큰과 SSO 설정을 관리하세요. 외부 시스템 연동에 필요해요.",
    position: "right",
  },
];

const MEMBER_EXTRA_STEPS: TourStep[] = [
  {
    target: "getting-started",
    title: "💬 도움이 필요할 때",
    description:
      "이 페이지에서 업무 가이드, FAQ, 팀 연락처를 확인할 수 있어요. 언제든 다시 오세요.",
    position: "right",
  },
];

const FINISH_STEP: TourStep = {
  target: "getting-started",
  title: "🎉 투어 완료!",
  description:
    "이제 시작할 준비가 됐어요. 아래 '도움말' 메뉴에서 이 투어를 다시 볼 수 있어요.",
  position: "right",
};

export function buildTourSteps(isAdmin: boolean): TourStep[] {
  const extra = isAdmin ? ADMIN_EXTRA_STEPS : MEMBER_EXTRA_STEPS;
  return [...BASE_STEPS, ...extra, FINISH_STEP];
}

export { BASE_STEPS, ADMIN_EXTRA_STEPS, MEMBER_EXTRA_STEPS };

const STORAGE_KEY = "fx-tour-completed";

/* ------------------------------------------------------------------ */
/*  Tooltip Component                                                  */
/* ------------------------------------------------------------------ */

function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  if (!targetRect) return null;

  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  // 사이드바 기준 오른쪽에 배치
  const style: React.CSSProperties = {
    position: "fixed",
    top: Math.max(8, targetRect.top - 8),
    left: targetRect.right + 12,
    zIndex: 10001,
    maxWidth: 320,
  };

  return (
    <div style={style} className="fade-in-up">
      <div className="axis-glass rounded-xl p-4 shadow-lg ring-1 ring-border/20">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold font-display">{step.title}</h3>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="투어 건너뛰기"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {step.description}
        </p>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground/60">
            {stepIndex + 1} / {totalSteps}
          </span>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="mr-0.5 size-3" />
                이전
              </Button>
            )}
            <Button
              size="sm"
              onClick={onNext}
              className="h-7 px-3 text-xs"
            >
              {isLast ? "완료" : "다음"}
              {!isLast && <ChevronRight className="ml-0.5 size-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spotlight Overlay                                                   */
/* ------------------------------------------------------------------ */

function SpotlightOverlay({
  targetRect,
  onClick,
}: {
  targetRect: DOMRect | null;
  onClick: () => void;
}) {
  if (!targetRect) return null;

  const padding = 4;

  return (
    <div
      className="fixed inset-0 z-[10000] cursor-pointer"
      onClick={onClick}
      role="presentation"
    >
      <svg className="size-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - padding}
              y={targetRect.top - padding}
              width={targetRect.width + padding * 2}
              height={targetRect.height + padding * 2}
              rx={8}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="oklch(0 0 0 / 50%)"
          mask="url(#tour-spotlight)"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main OnboardingTour Component                                      */
/* ------------------------------------------------------------------ */

export function OnboardingTour() {
  const { isAdmin } = useUserRole();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>(0);

  const tourSteps = buildTourSteps(isAdmin);

  // 첫 로그인 시 자동 시작
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // 사이드바 렌더링 대기
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // 타겟 엘리먼트 위치 추적
  const updateRect = useCallback(() => {
    if (!active) return;
    const step = tourSteps[stepIndex];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    }
    rafRef.current = requestAnimationFrame(updateRect);
  }, [active, stepIndex, tourSteps]);

  useEffect(() => {
    if (active) {
      rafRef.current = requestAnimationFrame(updateRect);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [active, updateRect]);

  const finish = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const next = useCallback(() => {
    if (stepIndex >= tourSteps.length - 1) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [stepIndex, tourSteps.length, finish]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!active) return null;

  const step = tourSteps[stepIndex];

  return createPortal(
    <>
      <SpotlightOverlay targetRect={targetRect} onClick={finish} />
      <TourTooltip
        step={step}
        stepIndex={stepIndex}
        totalSteps={tourSteps.length}
        targetRect={targetRect}
        onNext={next}
        onPrev={prev}
        onSkip={finish}
      />
    </>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Re-trigger Hook (Getting Started 페이지에서 사용)                   */
/* ------------------------------------------------------------------ */

export function useRestartTour() {
  return useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);
}
