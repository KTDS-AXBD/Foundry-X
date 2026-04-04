"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  PenTool,
  ArrowRight,
  CheckCircle2,
  MousePointer2,
  Camera,
  GitPullRequest,
  LogIn,
  Edit3,
  Save,
  ExternalLink,
  HelpCircle,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

/* ═══════════════════════════════════════════════
   STEP DATA
   ═══════════════════════════════════════════════ */

interface Step {
  icon: typeof MessageSquare;
  title: string;
  description: string;
  detail?: string;
  simulation?: string;
}

const markerSteps: Step[] = [
  {
    icon: MousePointer2,
    title: "1. 위젯 버튼 클릭",
    description: "대시보드 우측 하단의 말풍선 버튼을 클릭해요.",
    detail: "로그인 후 모든 대시보드 페이지에서 위젯이 표시돼요. 랜딩 페이지에서는 보이지 않아요.",
    simulation: "우측 하단 → 💬 클릭",
  },
  {
    icon: Camera,
    title: "2. 화면 캡처 + 어노테이션",
    description: "문제가 있는 위치를 클릭하면 자동으로 스크린샷이 캡처돼요.",
    detail: "화살표, 사각형, 텍스트 등 어노테이션 도구로 정확한 위치를 표시할 수 있어요.",
    simulation: "클릭 → 📸 자동 캡처 → ✏️ 표시 추가",
  },
  {
    icon: Edit3,
    title: "3. 피드백 작성",
    description: "무엇이 문제인지, 어떻게 되어야 하는지 설명을 입력해요.",
    detail: "짧고 명확하게! 예: '이 버튼 텍스트가 잘려서 보여요' 또는 '이 수치가 잘못된 것 같아요'",
    simulation: "제목 + 설명 입력 → Submit",
  },
  {
    icon: CheckCircle2,
    title: "4. GitHub Issue 자동 생성!",
    description: "제출하면 스크린샷 + 브라우저 정보가 포함된 GitHub Issue가 자동 생성돼요.",
    detail: "visual-feedback 라벨이 자동 적용되고, 개발자가 바로 확인할 수 있어요.",
    simulation: "→ GitHub Issue #N 생성 완료 ✅",
  },
];

const tinaSteps: Step[] = [
  {
    icon: LogIn,
    title: "1. /admin 접속 + 로그인",
    description: "fx.minu.best/admin 에 접속하고 GitHub 계정으로 로그인해요.",
    detail: "TinaCloud에 등록된 계정만 접근 가능해요. 권한이 없으면 관리자에게 요청하세요.",
    simulation: "fx.minu.best/admin → GitHub 로그인",
  },
  {
    icon: MousePointer2,
    title: "2. 콘텐츠 선택",
    description: "좌측 사이드바에서 Landing Pages 또는 Wiki Pages를 선택해요.",
    detail: "현재 편집 가능한 콘텐츠: 랜딩 Hero 텍스트, Wiki 소개 문서",
    simulation: "사이드바 → Landing Pages → hero.md",
  },
  {
    icon: Edit3,
    title: "3. 텍스트 수정",
    description: "WYSIWYG 에디터에서 텍스트를 직접 클릭하고 수정해요.",
    detail: "볼드, 리스트, 링크 등 서식도 변경할 수 있어요. 이미지나 아이콘은 편집 불가.",
    simulation: "텍스트 클릭 → 수정 → 실시간 미리보기",
  },
  {
    icon: Save,
    title: "4. 저장 (Save)",
    description: "Save 버튼을 클릭하면 변경사항이 저장돼요.",
    detail: "저장 즉시 사이트에 반영되지 않아요 — GitHub에 PR이 생성되고, 개발자 리뷰 후 반영돼요.",
    simulation: "Save → GitHub PR 자동 생성",
  },
  {
    icon: GitPullRequest,
    title: "5. PR 리뷰 → 사이트 반영",
    description: "개발자가 PR을 확인하고 머지하면 프로덕션 사이트에 반영돼요.",
    detail: "보통 1시간 이내에 리뷰 + 반영이 완료돼요.",
    simulation: "PR 리뷰 → Merge → 🚀 프로덕션 배포",
  },
];

/* ═══════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════ */

function StepCard({ step, index, total }: { step: Step; index: number; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = step.icon;

  return (
    <div className="relative">
      {/* Connector line */}
      {index < total - 1 && (
        <div className="absolute left-6 top-14 h-[calc(100%-2rem)] w-0.5 bg-gradient-to-b from-indigo-300 to-transparent" />
      )}

      <Card
        className={cn(
          "cursor-pointer border transition-all duration-200 hover:border-indigo-300 hover:shadow-md",
          expanded && "border-indigo-400 bg-indigo-50/30 shadow-md dark:bg-indigo-950/20",
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              expanded ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300",
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{step.title}</h4>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>

              {expanded && (
                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  {step.detail && (
                    <p className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                      💡 {step.detail}
                    </p>
                  )}
                  {step.simulation && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 p-3 text-xs font-mono text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span>{step.simulation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SimulationFlow({ steps }: { steps: Step[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-4">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              <Icon className="h-3 w-3" />
              <span>{step.title.replace(/^\d+\.\s*/, "")}</span>
            </div>
            {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </div>
        );
      })}
    </div>
  );
}

function InfoBox({ type, children }: { type: "tip" | "warning"; children: React.ReactNode }) {
  return (
    <div className={cn(
      "mt-4 flex items-start gap-2 rounded-lg p-3 text-sm",
      type === "tip" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    )}>
      {type === "tip" ? <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════ */

const tabs = [
  { id: "marker-io", label: "Marker.io", icon: MessageSquare, color: "text-blue-600" },
  { id: "tinacms", label: "TinaCMS", icon: PenTool, color: "text-purple-600" },
] as const;

/* ═══════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════ */

export function Component() {
  const [selected, setSelected] = useState<string>("marker-io");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">도구 가이드</h1>
        <p className="mt-1 text-muted-foreground">
          팀 협업 도구의 사용법을 단계별로 안내해요. 각 단계를 클릭하면 상세 정보가 펼쳐져요.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <Sparkles className="mb-0.5 mr-1 inline h-3 w-3" />
          Help Agent(우측 하단 ✨)에서 "Marker.io 사용법" 또는 "콘텐츠 수정하고 싶어"라고 질문해도 안내받을 수 있어요.
        </p>
      </div>

      {/* Tab selector */}
      <div className="mb-6 flex gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSelected(tab.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                selected === tab.id
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300"
                  : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className={cn("h-4 w-4", selected === tab.id ? tab.color : "")} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {selected === "marker-io" && <MarkerGuide />}
      {selected === "tinacms" && <TinaGuide />}
    </div>
  );
}

function MarkerGuide() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Marker.io 비주얼 피드백</h2>
              <p className="text-sm text-muted-foreground">화면에 직접 핀을 꼽고 피드백 → GitHub Issue 자동 생성</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              계정 불필요
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              2분 이내 완료
            </span>
            <span className="rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              스크린샷 자동 캡처
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Flow overview */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">전체 흐름</h3>
        <SimulationFlow steps={markerSteps} />
      </div>

      {/* Step by step */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">단계별 가이드</h3>
        <div className="space-y-3">
          {markerSteps.map((step, i) => (
            <StepCard key={i} step={step} index={i} total={markerSteps.length} />
          ))}
        </div>
      </div>

      <InfoBox type="tip">
        <strong>피드백 예시:</strong> "로그인 버튼이 모바일에서 잘려 보여요", "이 수치가 0으로 표시돼요 — 실제로는 15건이 있어야 해요"
      </InfoBox>

      <InfoBox type="warning">
        랜딩 페이지(비로그인 영역)에서는 위젯이 표시되지 않아요. 로그인 후 대시보드에서 사용해주세요.
      </InfoBox>
    </div>
  );
}

function TinaGuide() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/20 dark:to-fuchsia-950/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white">
              <PenTool className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">TinaCMS 콘텐츠 편집</h2>
              <p className="text-sm text-muted-foreground">브라우저에서 텍스트 직접 수정 → GitHub PR 자동 생성</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              GitHub 계정 필요
            </span>
            <span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              5분 이내 완료
            </span>
            <span className="rounded-full bg-purple-100 px-3 py-1 font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              리뷰 후 반영
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick link */}
      <a
        href="https://fx.minu.best/admin"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between rounded-lg border border-dashed border-purple-300 bg-purple-50/50 p-3 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-950/20 dark:text-purple-300"
      >
        <span>fx.minu.best/admin 바로가기</span>
        <ExternalLink className="h-4 w-4" />
      </a>

      {/* Flow overview */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">전체 흐름</h3>
        <SimulationFlow steps={tinaSteps} />
      </div>

      {/* Step by step */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">단계별 가이드</h3>
        <div className="space-y-3">
          {tinaSteps.map((step, i) => (
            <StepCard key={i} step={step} index={i} total={tinaSteps.length} />
          ))}
        </div>
      </div>

      {/* Editable content table */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">편집 가능한 콘텐츠</h3>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">페이지</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">편집 대상</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-2 font-medium">랜딩 Hero</td>
                  <td className="px-4 py-2 text-muted-foreground">태그라인, Phase 정보, 통계 수치</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Wiki 소개</td>
                  <td className="px-4 py-2 text-muted-foreground">Foundry-X 소개 문서</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <InfoBox type="warning">
        수정 후 <strong>바로 사이트에 반영되지 않아요</strong>. GitHub PR이 생성되고 개발자 리뷰 + 머지 후 프로덕션에 반영돼요.
      </InfoBox>

      <InfoBox type="tip">
        /admin 접근 시 에러가 나면 TinaCloud에 GitHub 계정이 등록되지 않은 거예요. 관리자(서민원)에게 권한 요청해주세요.
      </InfoBox>
    </div>
  );
}
