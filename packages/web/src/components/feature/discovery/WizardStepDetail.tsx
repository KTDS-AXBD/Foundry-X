"use client";

import { ArrowRight, CheckCircle2, Play, BookOpen, Wrench, FileText, HelpCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import IntensityIndicator from "./IntensityIndicator";
import type { IntensityLevel } from "./IntensityIndicator";

/** 5유형×7단계 강도 매트릭스 (analysis-path-v82.ts 기준) */
const INTENSITY_MATRIX: Record<string, Record<string, IntensityLevel>> = {
  "2-1": { I: "light", M: "normal", P: "light", T: "core", S: "core" },
  "2-2": { I: "core", M: "core", P: "core", T: "core", S: "light" },
  "2-3": { I: "normal", M: "core", P: "core", T: "core", S: "core" },
  "2-4": { I: "core", M: "normal", P: "core", T: "core", S: "core" },
  "2-5": { I: "core", M: "core", P: "core", T: "core", S: "normal" },
  "2-6": { I: "core", M: "core", P: "core", T: "normal", S: "normal" },
  "2-7": { I: "normal", M: "normal", P: "core", T: "normal", S: "core" },
};

interface WizardStepDetailProps {
  stage: string;
  status: string;
  discoveryType?: string;
  bizItemId: string;
  intensity?: IntensityLevel;
  onStatusChange: (stage: string, status: string) => void;
  onArtifactReview?: (artifactId: string, content: string | null) => void;
}

interface StageContent {
  purpose: string;
  skills: string[];
  outputs: string[];
  question: string;
  nextStage: string | null;
  nextStageName: string | null;
}

const STAGE_CONTENT: Record<string, StageContent> = {
  "2-0": {
    purpose: "AI Agent 3턴 대화로 사업 아이템의 5유형(I/M/P/T/S)을 분류하고, 유형에 맞는 맞춤 분석 경로를 제안해요.",
    skills: ["item-classifier"],
    outputs: ["5유형 분류 결과", "맞춤 분석 경로"],
    question: "이 아이템을 어떤 관점에서 접근하면 좋을까요?",
    nextStage: "2-1",
    nextStageName: "레퍼런스 분석",
  },
  "2-1": {
    purpose: "유사 사례와 레퍼런스를 수집·분석하여 우리만의 차별화 포인트를 찾아요.",
    skills: ["competitor-analysis", "market-research"],
    outputs: ["레퍼런스 분석 보고서", "차별화 포인트 정리"],
    question: "여기까지 봤을 때, 우리가 뭔가 다르게 할 수 있는 부분이 보이나요?",
    nextStage: "2-2",
    nextStageName: "수요 시장 검증",
  },
  "2-2": {
    purpose: "시장 규모와 타이밍을 검증하고, 우리 팀이 지금 추진할 이유를 확인해요.",
    skills: ["market-research", "market-scan"],
    outputs: ["시장 규모 분석", "TAM/SAM/SOM 추정"],
    question: "시장 규모나 타이밍을 보니, 우리 팀이 이걸 지금 추진할 만한 이유가 있나요?",
    nextStage: "2-3",
    nextStageName: "경쟁·자사 분석",
  },
  "2-3": {
    purpose: "경쟁사와 자사 역량을 비교하여 우리만의 포지션을 확인해요.",
    skills: ["competitor-scanner", "competitive-analysis"],
    outputs: ["경쟁 분석 매트릭스", "포지셔닝 맵"],
    question: "경쟁 상황을 보니, 우리만의 자리가 있을까요?",
    nextStage: "2-4",
    nextStageName: "사업 아이템 도출",
  },
  "2-4": {
    purpose: "분석 결과를 종합하여 핵심 사업 아이템을 구체화해요.",
    skills: ["business-plan", "value-proposition"],
    outputs: ["사업 아이템 초안", "가치 제안 캔버스"],
    question: "이 아이템을 30초로 설명한다면, 듣는 사람이 고개를 끄덕일까요?",
    nextStage: "2-5",
    nextStageName: "핵심 아이템 선정 (Commit Gate)",
  },
  "2-5": {
    purpose: "⚡ Commit Gate — 4주 투자 대비 가치, 조직 적합성, 방향 확신, 리스크를 종합 판단하는 Go/Kill 의사결정이에요.",
    skills: ["commit-gate", "pre-mortem"],
    outputs: ["Go/Kill 판정", "의사결정 기록"],
    question: "이 아이템에 앞으로 4주를 투자한다면, 그 시간이 아깝지 않을까요?",
    nextStage: "2-6",
    nextStageName: "타겟 고객 정의",
  },
  "2-6": {
    purpose: "타겟 고객 세그먼트를 구체적으로 정의하고 페르소나를 수립해요.",
    skills: ["customer-persona", "interview"],
    outputs: ["고객 페르소나", "세그먼트 정의"],
    question: "이 고객이 진짜 존재하고, 진짜 이 문제를 겪고 있다는 확신이 있나요?",
    nextStage: "2-7",
    nextStageName: "비즈니스 모델 정의",
  },
  "2-7": {
    purpose: "비즈니스 모델을 설계하고 수익 구조를 확인해요.",
    skills: ["bmc-generator", "business-model"],
    outputs: ["BMC (Business Model Canvas)", "수익 구조 초안"],
    question: "이 비즈니스 모델로 돈을 벌 수 있다고 믿나요? 아니면 희망사항인가요?",
    nextStage: "2-8",
    nextStageName: "패키징",
  },
  "2-8": {
    purpose: "사업 제안서와 Offering Pack으로 패키징해요.",
    skills: ["packaging", "presentation"],
    outputs: ["사업 제안서", "Offering Pack"],
    question: "이 패키지를 고객/의사결정권자에게 보여주면 관심을 보일까요?",
    nextStage: "2-9",
    nextStageName: "AI 멀티페르소나 평가",
  },
  "2-9": {
    purpose: "8명의 AI 페르소나(전략, 영업, AP사업, AI기술, 재무, 보안, 파트너, 제품)가 다각도로 평가해요.",
    skills: ["persona-evaluator"],
    outputs: ["멀티페르소나 평가 점수", "종합 의견"],
    question: "8명의 관점에서 이 아이템의 사각지대는 무엇인가요?",
    nextStage: "2-10",
    nextStageName: "최종 보고서",
  },
  "2-10": {
    purpose: "전체 발굴 프로세스 결과를 최종 보고서로 정리해요.",
    skills: ["report-generator"],
    outputs: ["최종 보고서", "발굴 완료 기록"],
    question: "이 보고서가 의사결정에 충분한 정보를 담고 있나요?",
    nextStage: null,
    nextStageName: null,
  },
};

const STAGE_NAMES: Record<string, string> = {
  "2-0": "사업 아이템 분류",
  "2-1": "레퍼런스 분석",
  "2-2": "수요 시장 검증",
  "2-3": "경쟁·자사 분석",
  "2-4": "사업 아이템 도출",
  "2-5": "핵심 아이템 선정",
  "2-6": "타겟 고객 정의",
  "2-7": "비즈니스 모델 정의",
  "2-8": "패키징",
  "2-9": "AI 멀티페르소나 평가",
  "2-10": "최종 보고서",
};

export default function WizardStepDetail({
  stage,
  status,
  discoveryType,
  bizItemId,
  intensity: intensityProp,
  onStatusChange,
  onArtifactReview,
}: WizardStepDetailProps) {
  const content = STAGE_CONTENT[stage];
  if (!content) return null;

  const stageName = STAGE_NAMES[stage] ?? stage;

  // 강도 결정: prop 우선, 없으면 discoveryType + 매트릭스에서 자동 계산
  const intensity: IntensityLevel | undefined =
    intensityProp ??
    (discoveryType ? INTENSITY_MATRIX[stage]?.[discoveryType] : undefined);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4" data-tour="discovery-step-detail">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Step {stage}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                status === "completed" && "border-green-300 bg-green-50 text-green-700",
                status === "in_progress" && "border-blue-300 bg-blue-50 text-blue-700",
                status === "pending" && "border-slate-200 text-slate-500",
                status === "skipped" && "border-slate-200 text-slate-400 line-through",
              )}
            >
              {status === "completed" ? "완료" : status === "in_progress" ? "진행 중" : status === "skipped" ? "건너뜀" : "대기"}
            </Badge>
            {intensity && <IntensityIndicator intensity={intensity} />}
          </div>
          <h3 className="text-lg font-bold mt-1">{stageName}</h3>
        </div>

        {/* Status Change Button */}
        <div className="flex gap-2">
          {status === "pending" && intensity === "light" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(stage, "skipped")}
              className="gap-1 text-muted-foreground"
            >
              <SkipForward className="h-3 w-3" /> 건너뛰기
            </Button>
          )}
          {status === "pending" && (
            <Button
              size="sm"
              onClick={() => onStatusChange(stage, "in_progress")}
              className="gap-1"
            >
              <Play className="h-3 w-3" /> 시작하기
            </Button>
          )}
          {status === "in_progress" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(stage, "completed")}
              className="gap-1 border-green-300 text-green-700 hover:bg-green-50"
            >
              <CheckCircle2 className="h-3 w-3" /> 완료
            </Button>
          )}
          {status === "completed" && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> 완료됨
            </div>
          )}
        </div>
      </div>

      {/* Purpose */}
      <div className="flex gap-2">
        <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{content.purpose}</p>
      </div>

      {/* Skills */}
      <div className="flex gap-2">
        <Wrench className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap gap-1">
          {content.skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      {/* Outputs */}
      <div className="flex gap-2">
        <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex flex-wrap gap-1">
          {content.outputs.map((output) => (
            <Badge key={output} variant="outline" className="text-xs">
              {output}
            </Badge>
          ))}
        </div>
      </div>

      {/* Viability Question */}
      <div className="rounded-lg bg-muted/50 p-3 flex gap-2">
        <HelpCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
        <p className="text-sm italic text-muted-foreground">"{content.question}"</p>
      </div>

      {/* Next Stage */}
      {content.nextStage && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowRight className="h-4 w-4" />
          다음 단계: <span className="font-medium text-foreground">{content.nextStage} {content.nextStageName}</span>
        </div>
      )}
    </div>
  );
}
