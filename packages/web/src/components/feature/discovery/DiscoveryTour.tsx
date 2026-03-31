"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fx-discovery-tour-completed";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position: "right" | "bottom" | "top";
}

const STEPS: TourStep[] = [
  {
    target: "discovery-wizard",
    title: "🧭 발굴 프로세스 위저드",
    description:
      "사업 아이템별로 2-0(분류)부터 2-10(최종 보고서)까지 단계를 순서대로 진행해요. 각 단계에서 할 일과 사용할 스킬을 안내받을 수 있어요.",
    position: "bottom",
  },
  {
    target: "discovery-item-select",
    title: "📋 아이템 선택",
    description:
      "분석할 사업 아이템을 선택하세요. 아이템이 없다면 먼저 등록 페이지에서 새 아이템을 만들어 보세요.",
    position: "bottom",
  },
  {
    target: "discovery-stepper",
    title: "📊 단계 진행 바",
    description:
      "현재 어디까지 왔는지 한눈에 확인하세요. 각 단계 원을 클릭하면 상세 정보를 볼 수 있어요. 녹색은 완료, 파란색은 진행 중이에요.",
    position: "bottom",
  },
  {
    target: "discovery-step-detail",
    title: "📝 단계 상세 패널",
    description:
      "각 단계의 목적, 사용할 스킬, 예상 산출물, 사업성 질문을 확인하세요. '시작하기' 버튼으로 단계를 시작하고, 완료 후 '완료' 버튼을 눌러요.",
    position: "top",
  },
  {
    target: "discovery-items-list",
    title: "📌 아이템 현황",
    description:
      "전체 사업 아이템의 진행 상태와 사업성 신호등(녹/황/적)을 한눈에 확인할 수 있어요. 클릭하면 상세 페이지로 이동해요.",
    position: "top",
  },
];

export default function DiscoveryTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  // Check if tour was already completed
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Delay to let page render
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateTargetRect = useCallback(() => {
    if (!active) return;
    const currentStep = STEPS[step];
    if (!currentStep) return;
    const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [active, step]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    // Watch for DOM changes (lazy-loaded components)
    observerRef.current = new MutationObserver(updateTargetRect);
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
      observerRef.current?.disconnect();
    };
  }, [updateTargetRect]);

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }, [step]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleClose = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  if (!active) return null;

  const currentStep = STEPS[step]!;
  const padding = 8;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop with spotlight */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="discovery-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#discovery-tour-mask)"
        />
      </svg>

      {/* Tooltip */}
      {targetRect && (
        <div
          className={cn(
            "absolute z-10 w-80 rounded-xl border bg-card p-4 shadow-xl",
          )}
          style={getTooltipPosition(targetRect, currentStep.position)}
        >
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-bold">{currentStep.title}</h3>
            <button
              onClick={handleClose}
              className="ml-2 rounded-md p-1 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {step + 1} / {STEPS.length}
            </span>
            <div className="flex gap-1">
              {step > 0 && (
                <Button size="sm" variant="ghost" onClick={handlePrev} className="h-7 px-2 text-xs">
                  <ChevronLeft className="mr-1 h-3 w-3" /> 이전
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="h-7 px-2 text-xs">
                {step < STEPS.length - 1 ? (
                  <>다음 <ChevronRight className="ml-1 h-3 w-3" /></>
                ) : (
                  <>완료 <Sparkles className="ml-1 h-3 w-3" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

function getTooltipPosition(
  rect: DOMRect,
  position: "right" | "bottom" | "top",
): React.CSSProperties {
  const gap = 16;
  switch (position) {
    case "right":
      return { top: rect.top, left: rect.right + gap };
    case "bottom":
      return { top: rect.bottom + gap, left: Math.max(16, rect.left) };
    case "top":
      return { bottom: window.innerHeight - rect.top + gap, left: Math.max(16, rect.left) };
  }
}
