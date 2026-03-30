"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  Search,
  PenTool,
  CheckCircle,
  Rocket,
  TrendingUp,
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
    stage: 1,
    label: "수집",
    icon: Inbox,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    description:
      "고객 요청(SR), IR 제안, 외부 채널에서 사업 아이디어를 수집하는 단계예요. 다양한 출처에서 원석을 모으는 것이 목표예요.",
    agentHelp:
      "AI가 SR을 자동 분류하고, 유사 아이템을 감지하여 중복 등록을 방지해요.",
    nextAction: { label: "아이디어 발굴로 이동", href: "/ax-bd/discovery" },
    paths: ["/sr", "/discovery/collection", "/ir-proposals"],
  },
  {
    stage: 2,
    label: "발굴",
    icon: Search,
    color: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    description:
      "수집된 아이디어를 5유형(I/M/P/T/S)으로 분류하고, Discovery 프로세스를 통해 사업성을 평가하는 단계예요.",
    agentHelp:
      "AI가 시장 분석, 경쟁사 조사, BMC 초안 자동 생성을 도와요. Six Hats 토론으로 다각도 검증도 가능해요.",
    nextAction: { label: "Spec 형상화로 이동", href: "/spec-generator" },
    paths: ["/ax-bd/discovery", "/ax-bd/ideas", "/ax-bd/bmc", "/discovery-progress"],
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
    nextAction: { label: "파이프라인 검증으로", href: "/pipeline" },
    paths: ["/spec-generator", "/ax-bd", "/offering-packs"],
  },
  {
    stage: 4,
    label: "검증/공유",
    icon: CheckCircle,
    color: "text-green-500 bg-green-500/10 border-green-500/20",
    description:
      "ORB/PRB 게이트를 통과하고, 산출물을 공유하여 팀과 의사결정자의 승인을 받는 단계예요.",
    agentHelp:
      "AI가 게이트 문서 패키지를 자동 수집하고, 산출물 공유 링크를 생성해요.",
    nextAction: { label: "MVP 제작으로", href: "/mvp-tracking" },
    paths: ["/pipeline"],
  },
  {
    stage: 5,
    label: "제품화",
    icon: Rocket,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    description:
      "승인된 아이템의 MVP를 제작하고, PoC 배포를 진행하는 단계예요.",
    agentHelp:
      "AI가 MVP 상태를 추적하고, 프로토타입 자동 생성 파이프라인을 지원해요.",
    nextAction: { label: "GTM 준비로", href: "/projects" },
    paths: ["/mvp-tracking"],
  },
  {
    stage: 6,
    label: "GTM",
    icon: TrendingUp,
    color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    description:
      "완성된 제품을 시장에 출시하고, 프로젝트 현황을 모니터링하는 최종 단계예요.",
    agentHelp:
      "AI가 KPI를 자동 수집하고, 프로젝트 건강도를 실시간으로 추적해요.",
    nextAction: { label: "대시보드로", href: "/dashboard" },
    paths: ["/projects"],
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
  const pathname = usePathname();
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
              <Link href={stage.nextAction.href}>
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
    for (let i = 1; i <= 6; i++) {
      localStorage.removeItem(STORAGE_PREFIX + i);
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
