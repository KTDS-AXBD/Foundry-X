"use client";

/**
 * Sprint 220 F454 — 사업기획서 기반 1차 PRD 자동 생성 패널
 */
import { useState } from "react";
import { FileText, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeneratedPrd {
  id: string;
  version: number;
  content: string;
  sourceType: string;
  generatedAt: string;
}

interface PrdFromBpPanelProps {
  bizItemId: string;
  hasBp: boolean;
  onPrdGenerated?: (prd: GeneratedPrd) => void;
  onStartInterview?: (prdId: string) => void;
}

type PanelState = "idle" | "generating" | "done" | "error";

interface StepStatus {
  parsing: "pending" | "done";
  llm: "pending" | "running" | "done";
  saving: "pending" | "done";
}

/** 마크다운 간단 렌더링 */
function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[보강\]/g, '<mark class="bg-yellow-100 px-0.5 rounded text-xs">[보강]</mark>')
    .replace(/\n\n/g, '<br class="block mb-2" />')
    .replace(/\n/g, "\n");
}

export default function PrdFromBpPanel({ bizItemId, hasBp, onPrdGenerated, onStartInterview }: PrdFromBpPanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [steps, setSteps] = useState<StepStatus>({ parsing: "pending", llm: "pending", saving: "pending" });
  const [prd, setPrd] = useState<GeneratedPrd | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function handleGenerate() {
    setState("generating");
    setError(null);
    setSteps({ parsing: "pending", llm: "pending", saving: "pending" });

    try {
      // 파싱 단계 (API 호출 시작 시 즉시 표시)
      setSteps((s) => ({ ...s, parsing: "done" }));
      setSteps((s) => ({ ...s, llm: "running" }));

      const res = await fetch(`/api/biz-items/${bizItemId}/generate-prd-from-bp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skipLlmRefine: false }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "UNKNOWN" })) as { error: string };
        throw new Error(err.error ?? "PRD_GENERATION_FAILED");
      }

      const data = await res.json() as GeneratedPrd;
      setSteps({ parsing: "done", llm: "done", saving: "done" });
      setPrd(data);
      setState("done");
      onPrdGenerated?.(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요.";
      setError(msg);
      setState("error");
    }
  }

  if (!hasBp) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-5 text-center">
        <FileText className="mx-auto mb-2 size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">사업기획서를 먼저 생성하거나 연결해야 PRD를 자동 생성할 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">사업기획서 기반 PRD 자동 생성</h3>
      </div>

      {/* idle */}
      {state === "idle" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            연결된 사업기획서(HTML)를 분석하여 1차 PRD를 자동 생성해요. 생성 후 인터뷰를 통해 보강할 수 있어요.
          </p>
          <Button size="sm" onClick={() => void handleGenerate()}>
            사업기획서 기반 PRD 생성하기
          </Button>
        </div>
      )}

      {/* generating */}
      {state === "generating" && (
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {steps.parsing === "done" ? (
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            ) : (
              <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0" />
            )}
            <span className={steps.parsing === "done" ? "text-green-700" : "text-muted-foreground"}>
              HTML 파싱 {steps.parsing === "done" ? "완료" : "중..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {steps.llm === "done" ? (
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            ) : steps.llm === "running" ? (
              <Loader2 className="size-4 animate-spin text-blue-500 shrink-0" />
            ) : (
              <div className="size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className={steps.llm === "done" ? "text-green-700" : steps.llm === "running" ? "text-blue-700" : "text-muted-foreground"}>
              AI 보강 {steps.llm === "done" ? "완료" : steps.llm === "running" ? "중..." : "대기"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {steps.saving === "done" ? (
              <CheckCircle2 className="size-4 text-green-500 shrink-0" />
            ) : (
              <div className="size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
            )}
            <span className={steps.saving === "done" ? "text-green-700" : "text-muted-foreground"}>
              저장 {steps.saving === "done" ? "완료" : "대기"}
            </span>
          </div>
        </div>
      )}

      {/* done */}
      {state === "done" && prd && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <CheckCircle2 className="size-4 shrink-0" />
            1차 PRD v{prd.version} 생성 완료
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "미리보기 닫기" : "PRD 미리보기"}
            </Button>
            {onStartInterview && (
              <Button size="sm" onClick={() => onStartInterview(prd.id)}>
                PRD 보강 인터뷰 시작 →
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setState("idle"); setPrd(null); }}>
              <RefreshCw className="size-3 mr-1" />
              재생성
            </Button>
          </div>

          {showPreview && (
            <div
              className="rounded-md border bg-muted/30 p-4 text-xs leading-relaxed max-h-80 overflow-y-auto prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(prd.content) }}
            />
          )}
        </div>
      )}

      {/* error */}
      {state === "error" && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>PRD 생성에 실패했어요: {error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => { setState("idle"); setError(null); }}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  );
}
