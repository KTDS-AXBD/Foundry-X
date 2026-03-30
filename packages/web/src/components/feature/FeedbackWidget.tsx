"use client";

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitContextFeedback } from "@/lib/api-client";

const FEEDBACK_TYPES = [
  { value: "nps" as const, label: "NPS" },
  { value: "general" as const, label: "일반" },
  { value: "feature" as const, label: "기능 제안" },
  { value: "bug" as const, label: "버그" },
];

type FeedbackType = "nps" | "feature" | "bug" | "general";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("nps");
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { pathname } = useLocation();

  // Session time tracking
  const mountTimeRef = useRef(Date.now());

  function getSessionSeconds(): number {
    return Math.round((Date.now() - mountTimeRef.current) / 1000);
  }

  // Reset on close
  useEffect(() => {
    if (!open) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        if (submitted) {
          setScore(null);
          setComment("");
          setFeedbackType("nps");
          setSubmitted(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, submitted]);

  async function handleSubmit() {
    if (score === null) return;
    setSubmitting(true);
    try {
      await submitContextFeedback({
        npsScore: score,
        comment: comment || undefined,
        pagePath: pathname,
        sessionSeconds: getSessionSeconds(),
        feedbackType,
      });
      setSubmitted(true);
      setTimeout(() => setOpen(false), 1500);
    } catch {
      // silent fail — non-critical
    } finally {
      setSubmitting(false);
    }
  }

  function formatSessionTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105",
          "bg-primary text-primary-foreground",
          open && "rotate-45",
        )}
        aria-label="피드백 보내기"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Feedback panel */}
      {open && (
        <div
          className="fixed bottom-20 right-5 z-50 w-80 rounded-xl border border-border/50 bg-card shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
            <span className="text-sm font-semibold">피드백 보내기</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 p-4">
            {submitted ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="text-3xl">✅</div>
                <p className="text-sm font-medium">감사합니다!</p>
              </div>
            ) : (
              <>
                {/* Feedback type */}
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">유형</label>
                  <div className="flex gap-1.5">
                    {FEEDBACK_TYPES.map((ft) => (
                      <button
                        key={ft.value}
                        type="button"
                        onClick={() => setFeedbackType(ft.value)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          feedbackType === ft.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                        )}
                      >
                        {ft.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* NPS score */}
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">만족도</label>
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScore(n)}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md text-xs font-medium transition-colors",
                          score === n
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-background hover:bg-muted",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>😞</span>
                    <span>😊</span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">의견 (선택)</label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="자유롭게 작성해주세요..."
                    className="min-h-[60px] resize-none text-xs"
                  />
                </div>

                {/* Context info */}
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  <div>📍 현재: {pathname}</div>
                  <div>⏱️ 세션: {formatSessionTime(getSessionSeconds())}</div>
                </div>

                {/* Submit */}
                <Button
                  onClick={handleSubmit}
                  disabled={score === null || submitting}
                  className="w-full"
                  size="sm"
                >
                  {submitting ? "보내는 중..." : "보내기"}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
