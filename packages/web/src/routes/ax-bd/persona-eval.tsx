"use client";

/**
 * Sprint 155 F344+F345: AI 멀티 페르소나 평가 페이지
 * URL: /ax-bd/persona-eval/:itemId
 * 4단계: 설정 → 브리핑 → 평가 → 결과
 */
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, Settings, FileText, BarChart3, Zap } from "lucide-react";
import { usePersonaEvalStore } from "@/lib/stores/persona-eval-store";
import PersonaCardGrid from "@/components/feature/PersonaCardGrid";
import WeightSliderPanel from "@/components/feature/WeightSliderPanel";
import ContextEditor from "@/components/feature/ContextEditor";
import BriefingInput from "@/components/feature/BriefingInput";
import EvalProgress from "@/components/feature/EvalProgress";
import EvalResults from "@/components/feature/EvalResults";
import { useState } from "react";

const STEPS = [
  { key: "config", label: "설정", icon: Settings },
  { key: "briefing", label: "브리핑", icon: FileText },
  { key: "eval", label: "평가", icon: Zap },
  { key: "results", label: "결과", icon: BarChart3 },
] as const;

export function Component() {
  const { itemId } = useParams<{ itemId: string }>();
  const [selectedPersonaId, setSelectedPersonaId] = useState("strategy");

  const {
    configs, briefing, evaluations, result, isRunning, demoMode, activeStep,
    updateWeight, updateContext, setBriefing, setDemoMode, setActiveStep, startEval,
  } = usePersonaEvalStore();

  if (!itemId) {
    return <div className="p-8 text-destructive">itemId가 필요해요.</div>;
  }

  const handleStartEval = () => {
    startEval(itemId);
  };

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/ax-bd/discovery/${itemId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">AI 멀티 페르소나 평가</h1>
            <p className="text-sm text-muted-foreground">8개 KT DS 역할 페르소나가 사업 아이템을 다축 평가해요</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="rounded"
            />
            데모 모드
          </label>
        </div>
      </div>

      {/* 스텝 네비게이션 */}
      <div className="flex items-center gap-1 border-b">
        {STEPS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => !isRunning && setActiveStep(key)}
            disabled={isRunning && key !== "eval"}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeStep === key
                ? "border-[#8b5cf6] text-[#8b5cf6]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            } ${isRunning && key !== "eval" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {activeStep === "config" && (
        <div className="space-y-6">
          <PersonaCardGrid
            personas={configs}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={setSelectedPersonaId}
          />

          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg border p-4">
              <WeightSliderPanel
                personaId={selectedPersonaId}
                weights={configs.find((c) => c.personaId === selectedPersonaId)?.weights ?? {} as never}
                onChangeWeight={updateWeight}
              />
            </div>
            <div className="rounded-lg border p-4">
              <ContextEditor
                personas={configs}
                selectedPersonaId={selectedPersonaId}
                onSelectPersona={setSelectedPersonaId}
                onUpdateContext={updateContext}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setActiveStep("briefing")}
              className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg hover:bg-[#8b5cf6]/90 text-sm font-medium"
            >
              다음: 브리핑 →
            </button>
          </div>
        </div>
      )}

      {activeStep === "briefing" && (
        <div className="space-y-6">
          <BriefingInput
            itemId={itemId}
            briefing={briefing}
            onChange={setBriefing}
          />

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveStep("config")}
              className="px-4 py-2 border rounded-lg hover:bg-muted text-sm"
            >
              ← 이전: 설정
            </button>
            <button
              type="button"
              onClick={handleStartEval}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8b5cf6] text-white rounded-lg hover:bg-[#8b5cf6]/90 text-sm font-medium disabled:opacity-50"
            >
              <Play className="size-4" />
              {demoMode ? "데모 평가 시작" : "AI 평가 시작"}
            </button>
          </div>
        </div>
      )}

      {activeStep === "eval" && (
        <EvalProgress evaluations={evaluations} isRunning={isRunning} />
      )}

      {activeStep === "results" && result && (
        <EvalResults result={result} />
      )}

      {activeStep === "results" && !result && (
        <div className="text-center py-12 text-muted-foreground">
          <p>아직 평가 결과가 없어요. 브리핑 탭에서 평가를 시작해주세요.</p>
        </div>
      )}
    </div>
  );
}
