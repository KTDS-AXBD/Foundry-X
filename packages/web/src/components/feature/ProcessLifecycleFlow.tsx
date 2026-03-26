"use client";

import { useState } from "react";
import {
  Inbox,
  Search,
  PenTool,
  CheckCircle2,
  Package,
  Rocket,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ProcessFlowData {
  lifecycle: Array<{ stage: number; name: string; description: string; tools: string[] }>;
  discovery: {
    types: Array<{ code: string; name: string; description: string; icon: string }>;
    stages: Array<{ id: string; name: string; coreFor: string[]; normalFor: string[]; lightFor: string[] }>;
    commitGate: { stage: string; questions: string[] };
  };
}

const stageIcons = [Inbox, Search, PenTool, CheckCircle2, Package, Rocket];

const typeIcons: Record<string, string> = {
  I: "💡",
  M: "📊",
  P: "🏗️",
  T: "🔬",
  S: "🤝",
};

const intensityColors: Record<string, { bg: string; text: string; label: string }> = {
  core: { bg: "bg-blue-100", text: "text-blue-700", label: "핵심" },
  normal: { bg: "bg-gray-100", text: "text-gray-600", label: "보통" },
  light: { bg: "bg-gray-50", text: "text-gray-400", label: "간소" },
};

export default function ProcessLifecycleFlow({ data }: { data: ProcessFlowData | null }) {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        프로세스 데이터를 불러오는 중...
      </div>
    );
  }

  const discoveryStageIndex = data.lifecycle.findIndex(
    (s) => s.name === "발굴" || s.stage === 2,
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-display mb-1">프로세스 가이드</h2>
        <p className="text-sm text-muted-foreground mb-4">
          AX BD 사업개발 6단계 라이프사이클이에요. 발굴 단계를 클릭하면 상세 정보를 확인할 수 있어요.
        </p>
      </div>

      {/* Lifecycle Stages */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {data.lifecycle.map((stage, i) => {
          const Icon = stageIcons[i] ?? Search;
          const isDiscovery = i === discoveryStageIndex;
          const isExpanded = expandedStage === i;

          return (
            <button
              key={stage.stage}
              type="button"
              onClick={() => {
                if (isDiscovery) {
                  setExpandedStage(isExpanded ? null : i);
                }
              }}
              className={cn(
                "group relative flex flex-col items-center rounded-xl border p-4 text-center transition-all",
                isDiscovery && "cursor-pointer hover:shadow-md",
                isDiscovery && isExpanded && "border-blue-300 bg-blue-50/50 shadow-md",
                isDiscovery && !isExpanded && "border-blue-200 bg-blue-50/30",
                !isDiscovery && "cursor-default border-border",
              )}
            >
              <div
                className={cn(
                  "mb-2 flex size-10 items-center justify-center rounded-lg",
                  isDiscovery ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
              </div>
              <p className="text-sm font-medium">{stage.name}</p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground leading-snug">
                {stage.description}
              </p>
              {isDiscovery && (
                <ChevronDown
                  className={cn(
                    "mt-1 size-3.5 text-blue-500 transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Discovery Detail */}
      {expandedStage === discoveryStageIndex && (
        <div className="space-y-4">
          {/* Type Classifier */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">5유형 분류</CardTitle>
              <p className="text-sm text-muted-foreground">
                사업 아이템의 성격에 따라 I/M/P/T/S 5가지 유형으로 분류해요.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-5">
                {data.discovery.types.map((type) => (
                  <div
                    key={type.code}
                    className="flex flex-col items-center rounded-lg border p-3 text-center"
                  >
                    <span className="mb-1 text-2xl">{typeIcons[type.code] ?? type.icon}</span>
                    <p className="text-sm font-semibold">
                      {type.code} — {type.name}
                    </p>
                    <p className="mt-0.5 text-[0.65rem] text-muted-foreground leading-snug">
                      {type.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Intensity Legend */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-muted-foreground">강도 범례:</span>
            {Object.entries(intensityColors).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("inline-block size-3 rounded-sm", val.bg)} />
                <span className={cn("text-xs", val.text)}>{val.label}</span>
              </div>
            ))}
          </div>

          {/* Commit Gate */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  {data.discovery.commitGate.stage}
                </Badge>
                Commit Gate
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                이 단계에서 4가지 핵심 질문에 답해야 해요.
              </p>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1.5">
                {data.discovery.commitGate.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[0.6rem] font-bold text-amber-700">
                      {i + 1}
                    </span>
                    {q}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
