"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  Terminal,
  Monitor,
  Globe,
  ChevronRight,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ───

type Environment = "claude-code" | "claude-desktop" | "web";

interface SetupStep {
  number: number;
  title: string;
  description: string;
  why?: string;
  commands?: string[];
  note?: string;
  tip?: string;
  warning?: string;
  verify?: string;
}

// ─── Environment Configs ───

const ENV_META: Record<
  Environment,
  { icon: typeof Terminal; label: string; badge: string; desc: string }
> = {
  "claude-code": {
    icon: Terminal,
    label: "Claude Code (터미널)",
    badge: "권장",
    desc: "터미널에서 claude 명령으로 실행. ax plugin(23개 워크플로우 스킬) + CLAUDE_AXBD(76개 BD 분석 스킬) 모두 사용 가능.",
  },
  "claude-desktop": {
    icon: Monitor,
    label: "Claude Desktop App",
    badge: "",
    desc: "Claude Desktop 앱의 Code 탭에서 폴더를 열어 사용. CLAUDE_AXBD 스킬을 GUI로 실행.",
  },
  web: {
    icon: Globe,
    label: "Foundry-X 웹 (여기)",
    badge: "",
    desc: "별도 설치 없이 이 웹 대시보드에서 바로 사용. Discovery 프로세스 + 스킬 실행 가능.",
  },
};

const PREREQUISITES: Record<Environment, string[]> = {
  "claude-code": [
    "Node.js v20 이상 (node --version 으로 확인)",
    "Claude Code CLI 설치 (npm install -g @anthropic-ai/claude-code)",
    "Git 설치 (git --version 으로 확인)",
    "Claude Pro/Team 구독 (Plugin 설치에 필요)",
  ],
  "claude-desktop": [
    "Claude Desktop 앱 설치 (claude.ai/download)",
    "Git 설치 (CLAUDE_AXBD 폴더 다운로드용)",
  ],
  web: [
    "Foundry-X 계정 (이미 로그인되어 있다면 준비 완료!)",
  ],
};

const STEPS: Record<Environment, SetupStep[]> = {
  "claude-code": [
    {
      number: 1,
      title: "ax 워크플로우 Plugin 설치",
      description:
        "세션 관리, Sprint, 거버넌스, 요구사항 관리 등 23개 개발 워크플로우 스킬을 설치해요.",
      why: "Plugin으로 설치하면 어떤 프로젝트 폴더에서든 ax:session-start, ax:sprint 등을 사용할 수 있어요.",
      commands: [
        "claude plugin install ax@ax-marketplace",
      ],
      note: "marketplace가 아직 등록되지 않았다면 아래 명령을 먼저 실행하세요.",
      tip: "설치 후 / 를 입력하면 ax:session-start, ax:sprint 등이 자동완성 목록에 표시돼요.",
    },
    {
      number: 2,
      title: "(선택) ax marketplace 등록",
      description:
        "Plugin 설치가 실패하면, marketplace를 수동으로 등록해야 할 수 있어요.",
      commands: [
        '# ~/.claude/settings.json의 extraKnownMarketplaces에 추가:',
        '# "ax-marketplace": {',
        '#   "source": { "source": "github", "repo": "KTDS-AXBD/ax-plugin" }',
        '# }',
        '',
        '# 또는 직접 settings 편집:',
        'claude settings edit',
      ],
      tip: "Step 1에서 설치가 성공했다면 이 단계는 건너뛰어도 돼요.",
    },
    {
      number: 3,
      title: "CLAUDE_AXBD BD 분석 스킬 설치",
      description:
        "사업 발굴 분석용 76개 전문 스킬이 포함된 작업 폴더를 받아요.",
      why: "ax plugin(개발 워크플로우)과 별도로, BD 사업 분석에 특화된 스킬 세트예요.",
      commands: [
        "git clone https://github.com/KTDS-AXBD/CLAUDE_AXBD.git",
        "cd CLAUDE_AXBD",
        "claude",
      ],
      note: "CLAUDE_AXBD 폴더 안에서 Claude Code를 실행해야 BD 스킬이 인식돼요.",
    },
    {
      number: 4,
      title: "스킬 동작 확인",
      description: "두 가지 스킬 세트가 모두 정상 로드됐는지 테스트해요.",
      commands: [
        "# ax plugin 스킬 (어디서든 사용 가능)",
        "/ax:help",
        "",
        "# BD 분석 스킬 (CLAUDE_AXBD 폴더에서만)",
        "/swot-analysis 테스트 주제",
      ],
      verify:
        "ax:help 이 응답하고, /swot-analysis 가 분석 결과를 보여주면 설치 완료!",
    },
    {
      number: 5,
      title: "발굴 프로세스 시작",
      description:
        "실제 사업 아이템으로 2단계 발굴 프로세스를 시작해요.",
      commands: [
        '# CLAUDE_AXBD 폴더에서 대화 시작:',
        '나는 AX BD팀 [이름]입니다.',
        '[사업 아이템명]에 대해 2단계 발굴을 시작합니다.',
        '[아이템 설명 1~2문장]',
      ],
      note: "AI가 자동으로 5유형(I/M/P/T/S) 중 하나로 분류하고, 유형에 맞는 분석 경로를 안내해요.",
    },
    {
      number: 6,
      title: "업데이트 (수시)",
      description:
        "새 스킬이 추가되면 최신 버전으로 업데이트해요.",
      commands: [
        "# ax plugin 업데이트",
        "claude plugin update ax@ax-marketplace",
        "",
        "# BD 스킬 업데이트",
        "cd CLAUDE_AXBD && git pull origin main",
      ],
      tip: "팀 Slack에서 업데이트 공지가 오면 두 명령만 실행하면 끝!",
    },
  ],
  "claude-desktop": [
    {
      number: 1,
      title: "CLAUDE_AXBD 폴더 다운로드",
      description:
        "팀 공용 스킬 폴더를 내 PC에 받아요.",
      commands: [
        "git clone https://github.com/KTDS-AXBD/CLAUDE_AXBD.git",
      ],
      tip: "Git이 없다면, GitHub에서 'Code > Download ZIP'으로 다운로드 후 압축 해제해도 돼요.",
    },
    {
      number: 2,
      title: "Claude Desktop에서 폴더 열기",
      description:
        "Claude Desktop 앱을 열고 CLAUDE_AXBD 폴더를 연결해요.",
      commands: [
        '1. Claude Desktop 앱 실행',
        '2. 좌측 하단 Code 탭 클릭',
        '3. "Select folder" 클릭',
        '4. 다운로드한 CLAUDE_AXBD 폴더 선택',
      ],
      note: "폴더를 선택하면 Claude가 CLAUDE.md를 자동으로 읽어 팀 컨텍스트를 로딩해요.",
    },
    {
      number: 3,
      title: "스킬 동작 확인 + 발굴 시작",
      description: "대화창에서 바로 스킬을 호출하고, 발굴 프로세스를 시작해요.",
      commands: [
        '# 스킬 테스트',
        '/swot-analysis 물류 AI 플랫폼',
        '',
        '# 발굴 시작',
        '나는 AX BD팀 [이름]입니다.',
        '[아이템명]에 대해 2단계 발굴을 시작합니다.',
      ],
      verify: "/ 입력 시 자동완성 목록이 표시되면 정상!",
    },
  ],
  web: [
    {
      number: 1,
      title: "Foundry-X 로그인",
      description:
        "이미 로그인되어 있다면 이 단계는 건너뛰세요.",
      commands: [
        '1. fx.minu.best 접속',
        '2. 팀 계정으로 로그인',
      ],
      note: "계정이 없다면 관리자(서민원, 김기욱, 김정원)에게 요청하세요.",
    },
    {
      number: 2,
      title: "Discovery 페이지로 이동",
      description:
        "좌측 사이드바에서 Discovery를 클릭하면 발굴 프로세스 대시보드로 이동해요.",
      commands: [
        '1. 좌측 사이드바 → "Discovery" 클릭',
        '2. 또는 주소창에 fx.minu.best/ax-bd/discovery 입력',
      ],
      tip: "이 페이지에서 스킬 카탈로그, 프로세스 가이드, 스킬 실행까지 모두 가능해요.",
    },
    {
      number: 3,
      title: "사업 아이템 등록 + 스킬 실행",
      description:
        "새 사업 아이템을 등록하고, 단계별 스킬을 웹에서 바로 실행해요.",
      commands: [
        '1. "새 아이템 추가" 버튼 클릭',
        '2. 아이템명 + 설명 입력',
        '3. AI가 5유형(I/M/P/T/S) 자동 분류',
        '4. 각 단계에서 추천 스킬 클릭 → 실행',
      ],
      note: "실행 결과는 자동으로 저장되고, 진행 상황은 신호등(Go/Pivot/Drop)으로 추적돼요.",
    },
  ],
};

// ─── Components ───

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      className="shrink-0 opacity-0 transition-opacity group-hover/cmd:opacity-100"
      aria-label="복사"
    >
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3" />
      )}
    </Button>
  );
}

function CommandBlock({ commands }: { commands: string[] }) {
  return (
    <div className="space-y-1 rounded-lg bg-muted/50 p-3">
      {commands.map((cmd, i) => {
        const isComment = cmd.startsWith("#");
        const isInstruction = /^\d+\./.test(cmd);
        const isEmpty = cmd === "";
        if (isEmpty) return <div key={i} className="h-2" />;
        return (
          <div
            key={i}
            className={cn(
              "group/cmd flex items-center justify-between gap-2 font-mono text-sm",
              (isComment || isInstruction) && "text-muted-foreground",
            )}
          >
            <code className="break-all">
              {!isComment && !isInstruction && (
                <span className="mr-1.5 select-none text-muted-foreground">
                  $
                </span>
              )}
              {isInstruction && (
                <span className="mr-1 font-sans">{""}</span>
              )}
              {cmd}
            </code>
            {!isComment && !isInstruction && <CopyButton text={cmd} />}
          </div>
        );
      })}
    </div>
  );
}

function StepCard({ step }: { step: SetupStep }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {step.number}
          </span>
          {step.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{step.description}</p>
        {step.why && (
          <p className="mt-1 text-xs text-muted-foreground/80 italic">
            {step.why}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {step.commands && <CommandBlock commands={step.commands} />}

        {step.note && (
          <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{step.note}</span>
          </div>
        )}

        {step.tip && (
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            <Lightbulb className="mt-0.5 size-4 shrink-0" />
            <span>{step.tip}</span>
          </div>
        )}

        {step.warning && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{step.warning}</span>
          </div>
        )}

        {step.verify && (
          <div className="flex gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
            <Check className="mt-0.5 size-4 shrink-0" />
            <span>{step.verify}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Resources Section ───

function ResourcesSection() {
  const resources = [
    {
      title: "ax plugin (개발 워크플로우)",
      desc: "23개 워크플로우 스킬 — 세션/Sprint/거버넌스/요구사항",
      href: "https://github.com/KTDS-AXBD/ax-plugin",
      internal: false,
    },
    {
      title: "CLAUDE_AXBD (BD 분석 스킬)",
      desc: "76개 사업 분석 스킬 — SWOT/해자/타당성/원가모델 등",
      href: "https://github.com/KTDS-AXBD/CLAUDE_AXBD",
      internal: false,
    },
    {
      title: "스킬 카탈로그",
      desc: "전체 스킬 레퍼런스 테이블",
      href: "/getting-started?tab=skills",
      internal: true,
    },
    {
      title: "프로세스 가이드",
      desc: "2-0~2-10 발굴 프로세스 상세 설명",
      href: "/getting-started?tab=process",
      internal: true,
    },
    {
      title: "Discovery 대시보드",
      desc: "사업 아이템 등록 + 스킬 실행 + 진행 추적",
      href: "/discovery/items",
      internal: true,
    },
  ];

  return (
    <div className="rounded-xl border border-dashed p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <FolderOpen className="size-4" />
        관련 리소스
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {resources.map((r) => (
          <a
            key={r.title}
            href={r.href}
            target={r.internal ? undefined : "_blank"}
            rel={r.internal ? undefined : "noopener noreferrer"}
            className="group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            <div>
              <span className="font-medium">{r.title}</span>
              {!r.internal && (
                <ExternalLink className="ml-1 inline-block size-3 text-muted-foreground" />
              )}
              <p className="text-xs text-muted-foreground">{r.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function CoworkSetupGuide() {
  const [env, setEnv] = useState<Environment>("claude-code");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 font-display text-lg font-semibold">팀 개발 환경 설정</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          사용 환경을 선택하고 단계별로 따라해 보세요. ax plugin(개발 워크플로우)과
          CLAUDE_AXBD(BD 분석 스킬)를 함께 설치하면 모든 기능을 사용할 수 있어요.
        </p>
      </div>

      {/* Environment Selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(ENV_META) as [Environment, typeof ENV_META[Environment]][]).map(
          ([key, meta]) => {
            const Icon = meta.icon;
            const isActive = env === key;
            return (
              <Button
                key={key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setEnv(key)}
                className="gap-1.5"
              >
                <Icon className="size-3.5" />
                {meta.label}
                {meta.badge && (
                  <span
                    className={cn(
                      "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-axis-primary/10 text-axis-primary",
                    )}
                  >
                    {meta.badge}
                  </span>
                )}
              </Button>
            );
          },
        )}
      </div>

      {/* Environment Description */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        {ENV_META[env].desc}
      </div>

      {/* Prerequisites */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            사전 요구사항
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {PREREQUISITES[env].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-green-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Step Cards */}
      <div className="space-y-4">
        {STEPS[env].map((step) => (
          <StepCard key={step.number} step={step} />
        ))}
      </div>

      {/* Resources */}
      <ResourcesSection />
    </div>
  );
}
