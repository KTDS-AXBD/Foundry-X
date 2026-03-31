"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BD_STAGES,
  COMMIT_GATE_QUESTIONS,
  TYPE_INFO,
  INTENSITY_MATRIX,
  type DiscoveryType,
  type Intensity,
} from "@/data/bd-process";
import { BD_SKILLS } from "@/data/bd-skills";
import { ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";

const INTENSITY_LABELS: Record<Intensity, string> = {
  core: "핵심",
  normal: "보통",
  light: "간소",
};

const INTENSITY_STYLES: Record<Intensity, string> = {
  core: "bg-blue-600 text-white font-semibold",
  normal: "bg-slate-200 text-slate-700",
  light: "bg-transparent text-slate-400",
};

const TYPES: DiscoveryType[] = ["I", "M", "P", "T", "S"];

export default function ProcessGuide() {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const toggle = (id: string) => {
    setExpandedStage((prev) => (prev === id ? null : id));
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">BD 프로세스 가이드</h1>
        <p className="text-sm text-muted-foreground">
          AX BD 2단계 발굴 프로세스 v8.2 — 2-0 분류 → 2-1~2-7 유형별 분석 → 2-8~2-10 공통 패키징
        </p>
      </div>

      {/* Type Intensity Matrix */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-bold">유형별 강도 매트릭스</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-sm">
            <thead>
              <tr>
                <th className="border bg-muted/50 px-3 py-2 text-left text-xs font-semibold">
                  단계
                </th>
                {TYPES.map((t) => (
                  <th key={t} className="border px-3 py-2 text-xs font-semibold">
                    <div>Type {t}</div>
                    <div className="font-normal text-muted-foreground">{TYPE_INFO[t].name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(INTENSITY_MATRIX).map(([stageId, row]) => {
                const stage = BD_STAGES.find((s) => s.id === stageId);
                return (
                  <tr key={stageId}>
                    <td className="border px-3 py-2 text-left">
                      <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                        {stageId}
                      </span>
                      <span className="text-xs font-medium">{stage?.name}</span>
                    </td>
                    {TYPES.map((type) => {
                      const intensity = row[type];
                      return (
                        <td key={`${stageId}-${type}`} className="border px-2 py-1.5">
                          <span
                            className={cn(
                              "inline-block rounded px-2 py-0.5 text-[11px]",
                              INTENSITY_STYLES[intensity],
                            )}
                          >
                            {INTENSITY_LABELS[intensity]}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-blue-600" /> 핵심
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-slate-200" /> 보통
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded border bg-transparent" /> 간소
            </span>
          </div>
        </div>
      </div>

      {/* Stage Accordion */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold">단계별 상세 가이드</h2>

        {BD_STAGES.map((stage) => {
          const isOpen = expandedStage === stage.id;
          const stageSkills = BD_SKILLS.filter((s) => stage.skills.includes(s.id));

          return (
            <div
              key={stage.id}
              className={cn(
                "rounded-lg border transition-colors",
                stage.isCommitGate && "border-amber-300",
                stage.section === "common" && "border-dashed",
              )}
            >
              {/* Trigger */}
              <button
                type="button"
                onClick={() => toggle(stage.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  {stage.id}
                </Badge>
                <span className="flex-1 text-sm font-medium">{stage.name}</span>
                {stage.isCommitGate && (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                    Commit Gate
                  </Badge>
                )}
                {stage.checkpoint && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                )}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Content */}
              {isOpen && (
                <div className="space-y-4 border-t px-4 py-4">
                  <p className="text-sm text-muted-foreground">{stage.description}</p>

                  {/* Methodologies */}
                  {stage.methodologies.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        방법론
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {stage.methodologies.map((m) => (
                          <Badge key={m} variant="outline" className="text-xs">
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frameworks */}
                  {stage.frameworks.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        프레임워크
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {stage.frameworks.map((f) => (
                          <Badge
                            key={f}
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-xs text-blue-700"
                          >
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {stageSkills.length > 0 && (
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">
                        추천 스킬
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {stageSkills.map((s) => (
                          <Badge
                            key={s.id}
                            variant="outline"
                            className="border-violet-200 bg-violet-50 text-xs text-violet-700"
                          >
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Checkpoint */}
                  {stage.checkpoint && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="mb-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-xs font-semibold text-green-800">
                          사업성 체크포인트
                        </span>
                      </div>
                      <p className="text-sm font-medium text-green-900">
                        &ldquo;{stage.checkpoint.question}&rdquo;
                      </p>
                      <div className="mt-2 flex gap-2">
                        {stage.checkpoint.options.map((opt) => (
                          <Badge
                            key={opt}
                            variant="outline"
                            className={cn(
                              "text-xs",
                              opt === "Go" || opt === "Commit"
                                ? "border-green-300 text-green-700"
                                : opt === "Drop"
                                  ? "border-red-300 text-red-700"
                                  : "border-amber-300 text-amber-700",
                            )}
                          >
                            {opt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commit Gate Detail */}
                  {stage.isCommitGate && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <h4 className="mb-2 text-xs font-semibold text-amber-800">
                        Commit Gate 심화 논의 (4질문)
                      </h4>
                      <ol className="space-y-1.5">
                        {COMMIT_GATE_QUESTIONS.map((q, i) => (
                          <li key={i} className="flex gap-2 text-sm text-amber-900">
                            <span className="shrink-0 font-mono text-xs text-amber-600">
                              {i + 1}.
                            </span>
                            {q}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Checkpoint Timeline */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-bold">사업성 판단 체크포인트 타임라인</h2>
        <div className="relative space-y-3 pl-6">
          <div className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-px bg-slate-200" />
          {BD_STAGES.filter((s) => s.checkpoint).map((stage) => (
            <div key={stage.id} className="relative flex items-start gap-3">
              <div
                className={cn(
                  "absolute left-[-17px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white",
                  stage.isCommitGate ? "bg-amber-500" : "bg-green-500",
                )}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {stage.id}
                  </Badge>
                  <span className="text-xs font-medium">{stage.name}</span>
                  {stage.isCommitGate && (
                    <Badge className="border-amber-200 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700">
                      Gate
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  &ldquo;{stage.checkpoint!.question}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
