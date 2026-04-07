"use client";

/**
 * F439 — 형상화 파이프라인 상태 바
 * 기획서→Offering→PRD→Prototype 순서 잠금/해제 로직
 */
import { CheckCircle2, Square, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ShapingArtifacts } from "@/lib/api-client";

interface ShapingPipelineProps {
  bizItemId: string;
  artifacts: ShapingArtifacts;
  onGenerateBusinessPlan: () => void;
  generatingPlan: boolean;
}

interface PipelineStage {
  key: keyof ShapingArtifacts;
  label: string;
  sublabel: string;
}

const STAGES: PipelineStage[] = [
  { key: "businessPlan", label: "사업기획서", sublabel: "Business Plan" },
  { key: "offering", label: "Offering", sublabel: "Offering Pack" },
  { key: "prd", label: "PRD", sublabel: "Product Requirements" },
  { key: "prototype", label: "Prototype", sublabel: "Proto" },
];

export default function ShapingPipeline({ bizItemId: _bizItemId, artifacts, onGenerateBusinessPlan, generatingPlan }: ShapingPipelineProps) {
  const isCompleted = (key: keyof ShapingArtifacts) => artifacts[key] !== null;

  // 이전 단계가 완료되어야 다음 단계가 활성화
  const isUnlocked = (idx: number): boolean => {
    if (idx === 0) return true; // 기획서는 항상 활성
    return isCompleted(STAGES[idx - 1].key);
  };

  return (
    <div className="space-y-4">
      {/* 파이프라인 진행 바 */}
      <div className="flex items-center gap-1">
        {STAGES.map((stage, idx) => {
          const done = isCompleted(stage.key);
          const unlocked = isUnlocked(idx);
          return (
            <div key={stage.key} className="flex items-center">
              {idx > 0 && (
                <ArrowRight className={`size-4 mx-1 ${unlocked ? "text-muted-foreground" : "text-slate-200"}`} />
              )}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  done
                    ? "bg-green-100 text-green-700"
                    : unlocked
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-50 text-slate-400"
                }`}
              >
                {done ? <CheckCircle2 className="size-3.5" /> : unlocked ? <Square className="size-3.5" /> : <Lock className="size-3.5" />}
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* 단계별 상세 */}
      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const done = isCompleted(stage.key);
          const unlocked = isUnlocked(idx);
          const artifact = artifacts[stage.key];

          return (
            <div key={stage.key} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                ) : (
                  <Square className={`size-5 shrink-0 ${unlocked ? "text-blue-400" : "text-slate-200"}`} />
                )}
                <div>
                  <p className={`text-sm font-medium ${!unlocked && !done ? "text-muted-foreground" : ""}`}>{stage.label}</p>
                  <p className="text-xs text-muted-foreground">{stage.sublabel}</p>
                  {done && artifact && "versionNum" in artifact && (
                    <Badge variant="outline" className="mt-1 text-xs">v{artifact.versionNum}</Badge>
                  )}
                  {done && artifact && "createdAt" in artifact && "versionNum" in artifact && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(artifact.createdAt as string).toLocaleDateString("ko")} 생성
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {/* 기획서 생성 액션 */}
                {stage.key === "businessPlan" && (
                  <>
                    {done ? (
                      <Button variant="outline" size="sm">보기</Button>
                    ) : (
                      <Button size="sm" onClick={onGenerateBusinessPlan} disabled={generatingPlan}>
                        {generatingPlan ? "생성 중..." : "생성하기"}
                      </Button>
                    )}
                    {done && <Button variant="ghost" size="sm">재생성</Button>}
                  </>
                )}
                {/* Offering, PRD, Prototype — P1 후속 */}
                {stage.key !== "businessPlan" && (
                  <Button variant="outline" size="sm" disabled={!unlocked}>
                    {done ? "보기" : "생성하기"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
