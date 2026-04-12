"use client";

import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import {
  Search,
  PenTool,
  X,
  ArrowRight,
  Bot,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  프로세스 단계 정의 — 경로별 자동 매칭                                */
/* ------------------------------------------------------------------ */

interface StageInfo {
  stage: number;
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
  agentHelp: string;
  nextAction: { label: string; href: string };
  paths: string[]; // 이 단계에 해당하는 라우트 경로 목록
}

const STAGES: StageInfo[] = [
  {
    stage: 2,
    label: "발굴",
    icon: Search,
    color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    description:
      "수집된 아이디어를 5유형(I/M/P/T/S)으로 분류하고, Discovery 프로세스를 통해 사업성을 평가하는 단계예요.",
    agentHelp:
      "AI가 시장 분석, 경쟁사 조사, BMC 초안 자동 생성을 도와요. Six Hats 토론으로 다각도 검증도 가능해요.",
    nextAction: { label: "Spec 형상화로 이동", href: "/shaping/prd" },
    paths: ["/discovery/items", "/discovery/ideas-bmc", "/discovery/progress"],
  },
  {
    stage: 3,
    label: "형상화",
    icon: PenTool,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    description:
      "검증된 아이디어를 Spec 문서, 사업제안서, Offering Pack으로 구체화하는 단계예요.",
    agentHelp:
      "AI가 NL(자연어) 요구사항을 Spec으로 변환하고, 사업제안서 초안을 자동 생성해요.",
    nextAction: { label: "Offering 작성으로", href: "/shaping/offerings" },
    paths: ["/shaping/prd", "/shaping/proposal", "/shaping/offering", "/shaping/offerings"],
  },
];

/* ------------------------------------------------------------------ */
/*  경로로 현재 단계 찾기                                               */
/* ------------------------------------------------------------------ */

function findStage(pathname: string): StageInfo | null {
  // 정확한 매칭 우선, 그 다음 prefix 매칭
  for (const stage of STAGES) {
    if (stage.paths.some((p) => pathname === p)) return stage;
  }
  for (const stage of STAGES) {
    if (stage.paths.some((p) => pathname.startsWith(p + "/"))) return stage;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  ProcessStageGuide 컴포넌트                                         */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = "fx-stage-guide-";

export function ProcessStageGuide() {
  const { pathname } = useLocation();
  const stage = findStage(pathname);
  const [dismissed, setDismissed] = useState(true); // 기본 숨김 → hydrate 후 표시

  useEffect(() => {
    if (!stage) return;
    const key = STORAGE_PREFIX + stage.stage;
    setDismissed(localStorage.getItem(key) === "dismissed");
  }, [stage]);

  if (!stage || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_PREFIX + stage.stage, "dismissed");
    setDismissed(true);
  };

  const colorParts = stage.color.split(" ");

  return (
    <div
      className={cn(
        "mb-6 rounded-lg border p-4",
        colorParts[1], // bg
        colorParts[2], // border
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
              colorParts[1],
            )}
          >
            <stage.icon className={cn("size-4", colorParts[0])} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {stage.stage}단계: {stage.label}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {stage.description}
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-md bg-background/60 p-2.5">
              <Bot className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Agent 도움:</span>{" "}
                {stage.agentHelp}
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Link to={stage.nextAction.href}>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  {stage.nextAction.label}
                  <ArrowRight className="ml-1 size-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={dismiss}
          title="다시 보지 않기"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  가이드 다시 보기 버튼 (설정 또는 도움말에서 사용)                     */
/* ------------------------------------------------------------------ */

export function ResetStageGuides() {
  const [hidden, setHidden] = useState(false);

  const reset = () => {
    for (const stage of STAGES) {
      localStorage.removeItem(STORAGE_PREFIX + stage.stage);
    }
    setHidden(true);
    setTimeout(() => setHidden(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={reset} disabled={hidden}>
      {hidden ? (
        <>
          <Eye className="mr-2 size-4" />
          가이드 초기화 완료
        </>
      ) : (
        <>
          <EyeOff className="mr-2 size-4" />
          단계별 가이드 다시 보기
        </>
      )}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  프로세스 단계 요약 데이터 (대시보드 등에서 사용)                      */
/* ------------------------------------------------------------------ */

export { STAGES };
export type { StageInfo };
