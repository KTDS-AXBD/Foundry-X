"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { postApi } from "@/lib/api-client";

// ─── Types ───

interface CreatedItem {
  id: string;
  title: string;
  description: string | null;
  discoveryType: string | null;
}

interface ClassifyResult {
  type?: string;
  category?: string;
}

// ─── Step Indicator ───

const STEPS = ["아이디어 입력", "AI 분석", "확인 & 등록"] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                i < current
                  ? "bg-green-500 text-white"
                  : i === current
                    ? "bg-axis-primary text-white"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i < current ? <CheckCircle2 className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs whitespace-nowrap",
                i === current ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-3 mb-5 h-px w-16 transition-colors",
                i < current ? "bg-green-500" : "bg-muted",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: 아이디어 입력 ───

function Step1({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onNext,
  loading,
  error,
}: {
  title: string;
  description: string;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onNext: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">사업 아이디어를 알려주세요</h2>
        <p className="text-sm text-muted-foreground">
          아이템 제목과 설명을 입력하면 AI가 분석해요.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="item-title" className="text-sm font-medium">
            아이템 제목 <span className="text-destructive">*</span>
          </label>
          <input
            id="item-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="예: AI 기반 사내 지식 관리 시스템"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="item-desc" className="text-sm font-medium">
            아이디어 설명 <span className="text-destructive">*</span>
          </label>
          <textarea
            id="item-desc"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="사업 아이디어를 자유롭게 설명해 주세요. 목적, 타깃 고객, 해결하려는 문제 등을 포함하면 더 정확한 분석이 가능해요."
            rows={5}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!title.trim() || !description.trim() || loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              다음
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: AI 분석 결과 ───

const TYPE_LABELS: Record<string, string> = {
  I: "I — Intelligence (데이터/분석)",
  M: "M — Mechanism (프로세스 자동화)",
  P: "P — Platform (플랫폼/생태계)",
  T: "T — Tool (도구/솔루션)",
  S: "S — Service (서비스/컨설팅)",
};

function Step2({
  item,
  classifyResult,
  classifyLoading,
  onBack,
  onNext,
}: {
  item: CreatedItem;
  classifyResult: ClassifyResult | null;
  classifyLoading: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const typeKey = classifyResult?.type ?? classifyResult?.category ?? null;
  const typeLabel = typeKey ? (TYPE_LABELS[typeKey] ?? typeKey) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">AI 분석 결과</h2>
        <p className="text-sm text-muted-foreground">
          아이템이 등록되었어요. 분류 결과를 확인하고 다음 단계로 진행하세요.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">제목</p>
          <p className="font-medium">{item.title}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">설명</p>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">발굴 유형 (AI 분류)</p>
          {classifyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              분류 중...
            </div>
          ) : typeLabel ? (
            <span className="inline-flex items-center rounded-full bg-axis-violet/10 px-3 py-1 text-sm font-medium text-axis-violet">
              {typeLabel}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">분류 정보 없음</span>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          이전
        </Button>
        <Button onClick={onNext} className="gap-2">
          다음
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: 확인 & 등록 ───

function Step3({
  item,
  onBack,
  onFinish,
}: {
  item: CreatedItem;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-lg font-semibold">등록 완료!</h2>
        <p className="text-sm text-muted-foreground">
          아이템이 성공적으로 등록되었어요. 발굴 분석을 시작할 수 있어요.
        </p>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-500" />
          <div className="space-y-1">
            <p className="font-medium text-green-900">{item.title}</p>
            {item.discoveryType && (
              <p className="text-sm text-green-700">유형: {TYPE_LABELS[item.discoveryType] ?? item.discoveryType}</p>
            )}
            <p className="text-sm text-green-700">아이템 ID: {item.id}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        이제 발굴 분석 대시보드에서 11단계 발굴 프로세스를 진행할 수 있어요.
        AI가 자동으로 시작점 분류, 자동 분류, 다관점 평가를 수행해 드려요.
      </p>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="size-4" />
          이전
        </Button>
        <Button onClick={onFinish} className="gap-2 bg-axis-primary hover:bg-axis-primary/90">
          발굴 분석 시작
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Page ───

export function Component() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdItem, setCreatedItem] = useState<CreatedItem | null>(null);
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [classifyLoading, setClassifyLoading] = useState(false);

  const handleStep1Next = async () => {
    setError(null);
    setLoading(true);
    try {
      const item = await postApi<CreatedItem>("/biz-items", {
        title: title.trim(),
        description: description.trim(),
        source: "wizard",
      });
      setCreatedItem(item);
      setStep(1);

      // Kick off classification in background
      setClassifyLoading(true);
      postApi<ClassifyResult>(`/biz-items/${item.id}/classify`)
        .then((result) => setClassifyResult(result))
        .catch(() => {/* non-fatal */})
        .finally(() => setClassifyLoading(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : "아이템 등록에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (createdItem) {
      navigate(`/discovery/items/${createdItem.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-bold font-display">새 사업 아이템 등록</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          아이디어를 입력하면 AI가 분석하고 발굴 프로세스를 시작해 드려요.
        </p>
      </div>

      <StepIndicator current={step} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">
            Step {step + 1} / {STEPS.length} — {STEPS[step]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && (
            <Step1
              title={title}
              description={description}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onNext={handleStep1Next}
              loading={loading}
              error={error}
            />
          )}
          {step === 1 && createdItem && (
            <Step2
              item={createdItem}
              classifyResult={classifyResult}
              classifyLoading={classifyLoading}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && createdItem && (
            <Step3
              item={{
                ...createdItem,
                discoveryType: classifyResult?.type ?? classifyResult?.category ?? createdItem.discoveryType,
              }}
              onBack={() => setStep(1)}
              onFinish={handleFinish}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
