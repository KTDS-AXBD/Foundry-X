"use client";

/**
 * Sprint 220 F455 — PRD 보강 인터뷰 패널
 * 질문 표시 → 응답 입력 → 제출 → 다음 질문 루프
 */
import { useState, useEffect } from "react";
import { MessageSquare, ChevronRight, ChevronLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterviewQuestion {
  seq: number;
  question: string;
  questionContext: string;
  answer: string | null;
}

interface InterviewSession {
  id: string;
  status: "in_progress" | "completed" | "cancelled";
  questionCount: number;
  answeredCount: number;
  questions: InterviewQuestion[];
}

interface UpdatedPrd {
  id: string;
  version: number;
  content: string;
}

interface PrdInterviewPanelProps {
  bizItemId: string;
  prdId: string;
  onComplete?: (prd: UpdatedPrd) => void;
}

type PanelState = "not_started" | "loading" | "in_progress" | "completing" | "completed" | "error";

async function startInterview(bizItemId: string, prdId: string): Promise<InterviewSession> {
  const res = await fetch(`/api/biz-items/${bizItemId}/prd-interview/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ prdId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "UNKNOWN" })) as { error: string };
    throw new Error(err.error ?? "START_FAILED");
  }
  return res.json() as Promise<InterviewSession>;
}

async function submitAnswer(bizItemId: string, interviewId: string, seq: number, answer: string): Promise<{
  isComplete: boolean;
  answeredCount: number;
  remainingCount: number;
  updatedPrd?: UpdatedPrd;
}> {
  const res = await fetch(`/api/biz-items/${bizItemId}/prd-interview/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ interviewId, seq, answer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "UNKNOWN" })) as { error: string };
    throw new Error(err.error ?? "ANSWER_FAILED");
  }
  return res.json() as Promise<{ isComplete: boolean; answeredCount: number; remainingCount: number; updatedPrd?: UpdatedPrd }>;
}

export default function PrdInterviewPanel({ bizItemId, prdId, onComplete }: PrdInterviewPanelProps) {
  const [state, setState] = useState<PanelState>("not_started");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentSeq, setCurrentSeq] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completedPrd, setCompletedPrd] = useState<UpdatedPrd | null>(null);

  const currentQuestion = session?.questions.find((q) => q.seq === currentSeq);

  useEffect(() => {
    if (state === "in_progress" && session) {
      const saved = answers[currentSeq] ?? "";
      setCurrentAnswer(saved);
    }
  }, [currentSeq, state, session, answers]);

  async function handleStart() {
    setState("loading");
    setError(null);
    try {
      const s = await startInterview(bizItemId, prdId);
      setSession(s);
      setCurrentSeq(1);
      setAnswers({});
      setState("in_progress");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "시작 실패";
      if (msg === "INTERVIEW_ALREADY_IN_PROGRESS") {
        setError("이미 진행 중인 인터뷰가 있어요. 페이지를 새로고침하면 이어할 수 있어요.");
      } else {
        setError(msg);
      }
      setState("error");
    }
  }

  async function handleSubmit() {
    if (!session || !currentAnswer.trim()) return;

    const answer = currentAnswer.trim();
    setAnswers((a) => ({ ...a, [currentSeq]: answer }));

    const isLast = currentSeq === session.questionCount;

    if (isLast) {
      setState("completing");
    }

    try {
      const result = await submitAnswer(bizItemId, session.id, currentSeq, answer);

      if (result.isComplete && result.updatedPrd) {
        setCompletedPrd(result.updatedPrd);
        setState("completed");
        onComplete?.(result.updatedPrd);
      } else if (!isLast) {
        setCurrentSeq((s) => s + 1);
        setCurrentAnswer("");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "제출 실패";
      setError(msg);
      setState("error");
    }
  }

  function handlePrev() {
    if (currentSeq <= 1) return;
    setAnswers((a) => ({ ...a, [currentSeq]: currentAnswer }));
    setCurrentSeq((s) => s - 1);
  }

  function handleSkip() {
    if (!session) return;
    setAnswers((a) => ({ ...a, [currentSeq]: "" }));
    if (currentSeq < session.questionCount) {
      setCurrentSeq((s) => s + 1);
      setCurrentAnswer("");
    }
  }

  // not_started
  if (state === "not_started") {
    return (
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">PRD 보강 인터뷰</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          1차 PRD를 바탕으로 5~8개의 질문에 답변하면 AI가 2차 PRD를 자동으로 보강해요.
        </p>
        <Button size="sm" onClick={() => void handleStart()}>
          인터뷰 시작하기
        </Button>
      </div>
    );
  }

  // loading
  if (state === "loading") {
    return (
      <div className="rounded-lg border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        인터뷰 질문을 생성하고 있어요...
      </div>
    );
  }

  // error
  if (state === "error") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5 space-y-3">
        <div className="flex items-start gap-2 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setState("not_started")}>
          처음으로
        </Button>
      </div>
    );
  }

  // completed
  if (state === "completed" && completedPrd) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5 space-y-3">
        <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle2 className="size-4" />
          2차 PRD v{completedPrd.version} 생성 완료!
        </div>
        <p className="text-xs text-green-600">인터뷰 응답이 반영된 보강된 PRD가 생성되었어요.</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          새로고침하여 PRD 확인
        </Button>
      </div>
    );
  }

  // completing
  if (state === "completing") {
    return (
      <div className="rounded-lg border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        인터뷰 응답을 반영하여 2차 PRD를 생성하고 있어요...
      </div>
    );
  }

  // in_progress
  if (!session || !currentQuestion) return null;

  const progress = Math.round(((currentSeq - 1) / session.questionCount) * 100);

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">PRD 보강 인터뷰</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {currentSeq}/{session.questionCount} 완료
        </span>
      </div>

      {/* 진행률 */}
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className="bg-primary h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 현재 질문 */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-primary">Q{currentSeq}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {currentQuestion.questionContext}
          </span>
        </div>
        <p className="text-sm font-medium leading-relaxed">{currentQuestion.question}</p>
      </div>

      {/* 응답 입력 */}
      <textarea
        className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        rows={4}
        placeholder="답변을 입력하세요..."
        value={currentAnswer}
        onChange={(e) => setCurrentAnswer(e.target.value)}
      />

      {/* 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentSeq <= 1}
            onClick={handlePrev}
          >
            <ChevronLeft className="size-3.5 mr-1" />
            이전
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={currentSeq >= session.questionCount}
          >
            건너뛰기
          </Button>
        </div>
        <Button
          size="sm"
          disabled={!currentAnswer.trim()}
          onClick={() => void handleSubmit()}
        >
          {currentSeq === session.questionCount ? "완료 및 PRD 보강" : "답변 제출"}
          <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>

      {/* 이전 응답 요약 */}
      {Object.keys(answers).length > 0 && (
        <div className="border-t pt-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">이전 답변</p>
          {session.questions
            .filter((q) => answers[q.seq] && q.seq !== currentSeq)
            .slice(-3)
            .map((q) => (
              <div key={q.seq} className="text-xs flex gap-2">
                <span className="text-green-600 shrink-0">Q{q.seq} ✓</span>
                <span className="text-muted-foreground truncate">{answers[q.seq]?.slice(0, 60)}...</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
