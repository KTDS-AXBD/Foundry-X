/**
 * F448 — 파이프라인 단계 간 자동 전환 CTA
 * 발굴 완료 → 형상화 이동 / 형상화 완료 → Offering 이동
 */
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advancePipelineStage } from "@/lib/api-client";

interface PipelineTransitionCTAProps {
  bizItemId: string;
  bizStatus: string;
  currentStage: string;
  hasBusinessPlan: boolean;
  onTransitionComplete: () => void;
}

interface CTAConfig {
  condition: boolean;
  title: string;
  description: string;
  buttonLabel: string;
  targetStage: string;
  notes: string;
  colorClass: string;
  buttonClass: string;
}

function getCTAConfig(props: PipelineTransitionCTAProps): CTAConfig | null {
  const { bizStatus, currentStage, hasBusinessPlan } = props;

  if (bizStatus === "analyzed" && currentStage === "DISCOVERY") {
    return {
      condition: true,
      title: "발굴 분석 완료 — 형상화를 시작할 수 있어요",
      description: "9기준 발굴 분석이 완료됐어요. 형상화 단계로 이동해서 사업기획서를 생성하세요.",
      buttonLabel: "형상화 단계로 이동",
      targetStage: "FORMALIZATION",
      notes: "자동 전환: 발굴 완료",
      colorClass: "border-emerald-200 bg-emerald-50",
      buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    };
  }

  if (hasBusinessPlan && currentStage === "FORMALIZATION") {
    return {
      condition: true,
      title: "사업기획서 완성 — Offering 단계로 이동해요",
      description: "사업기획서가 생성됐어요. Offering 단계로 이동해서 제안서를 준비하세요.",
      buttonLabel: "Offering 단계로 이동",
      targetStage: "OFFERING",
      notes: "자동 전환: 기획서 완성",
      colorClass: "border-blue-200 bg-blue-50",
      buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
    };
  }

  return null;
}

export default function PipelineTransitionCTA(props: PipelineTransitionCTAProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = getCTAConfig(props);
  if (!config) return null;

  async function handleTransition() {
    setLoading(true);
    setError(null);
    try {
      await advancePipelineStage(props.bizItemId, config!.targetStage, config!.notes);
      props.onTransitionComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "단계 전환에 실패했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${config.colorClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{config.title}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
        <Button
          size="sm"
          onClick={() => void handleTransition()}
          disabled={loading}
          className={config.buttonClass}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin mr-1.5" />
          ) : (
            <ArrowRight className="size-3.5 mr-1.5" />
          )}
          {loading ? "처리 중..." : config.buttonLabel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
