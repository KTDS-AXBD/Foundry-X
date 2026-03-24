"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AnalysisContext {
  stepOrder: number;
  pmSkill: string;
  outputText: string;
}

interface AnalysisStep {
  order: number;
  activity: string;
  pmSkills: string[];
  discoveryMapping: number[];
}

interface PmSkillGuide {
  skill: string;
  name: string;
  purpose: string;
  inputExample: string;
  tips: string[];
  relatedCriteria: number[];
}

interface NextGuide {
  currentStep: number;
  nextStep: AnalysisStep | null;
  skillGuide: PmSkillGuide | null;
  previousContexts: AnalysisContext[];
  completedCriteria: number[];
  suggestedCriteria: number[];
  isLastStep: boolean;
}

interface NextGuidePanelProps {
  guide: NextGuide;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback: no-op in non-secure contexts
  }
}

export default function NextGuidePanel({ guide }: NextGuidePanelProps) {
  if (!guide.nextStep || !guide.skillGuide) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {guide.isLastStep ? "🎉 모든 분석 단계를 완료했어요!" : "다음 단계 정보를 불러올 수 없어요."}
        </p>
      </div>
    );
  }

  const { nextStep, skillGuide, previousContexts, suggestedCriteria } = guide;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground">📋 다음 단계: Step {nextStep.order}</p>
        <h3 className="mt-0.5 text-base font-semibold">{skillGuide.skill}</h3>
        <p className="text-sm text-muted-foreground">{skillGuide.name}</p>
      </div>

      {/* Purpose */}
      <div className="mb-3">
        <p className="text-sm">
          <span className="mr-1">💡</span>
          <span className="font-medium">목적:</span> {skillGuide.purpose}
        </p>
      </div>

      {/* Input example */}
      <div className="mb-3 rounded-md border border-border bg-muted/30 p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">📝 입력 예시:</p>
        <p className="text-sm">{skillGuide.inputExample}</p>
      </div>

      {/* Tips */}
      {skillGuide.tips.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">💡 팁:</p>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-muted-foreground">
            {skillGuide.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Previous contexts */}
      {previousContexts.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            📎 이전 분석 결과 (자동 첨부):
          </p>
          <div className="space-y-1">
            {previousContexts.map((ctx) => (
              <div
                key={ctx.stepOrder}
                className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5"
              >
                <span className="flex-1 truncate text-sm">
                  Step {ctx.stepOrder}: {ctx.outputText.slice(0, 60)}
                  {ctx.outputText.length > 60 ? "…" : ""}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => copyToClipboard(ctx.outputText)}
                >
                  복사
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="xs"
            className="mt-1.5"
            onClick={() =>
              copyToClipboard(
                previousContexts.map((c) => `[Step ${c.stepOrder}] ${c.outputText}`).join("\n\n"),
              )
            }
          >
            전체 복사
          </Button>
        </div>
      )}

      {/* Related criteria */}
      {suggestedCriteria.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Discovery 기준 연관:</span>
          {suggestedCriteria.map((id) => (
            <Badge
              key={id}
              className="border border-violet-200 bg-violet-50 px-1.5 py-0 text-[10px] font-normal text-violet-700"
            >
              #{id}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
