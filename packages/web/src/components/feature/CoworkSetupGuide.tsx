"use client";

import { useState } from "react";
import { Check, Copy, Monitor, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Environment = "cowork" | "claude-code";

const steps: Array<{
  number: number;
  title: string;
  description: string;
  commands: Record<Environment, string[]>;
}> = [
  {
    number: 1,
    title: "환경 확인",
    description: "필수 도구가 설치되어 있는지 확인해요.",
    commands: {
      cowork: ["node --version  # v20 이상 필요", "cowork --version"],
      "claude-code": ["node --version  # v20 이상 필요", "claude --version  # 최신 버전 권장"],
    },
  },
  {
    number: 2,
    title: "플러그인 설치",
    description: "AX BD 스킬 플러그인을 설치해요.",
    commands: {
      cowork: ["cowork plugin install pm-skills ai-biz"],
      "claude-code": [
        "# .claude/skills/ 디렉토리에 스킬 복사",
        "cp -r /path/to/pm-skills .claude/skills/",
        "cp -r /path/to/ai-biz .claude/skills/",
      ],
    },
  },
  {
    number: 3,
    title: "설정 확인",
    description: "설치된 플러그인이 정상 동작하는지 확인해요.",
    commands: {
      cowork: ["cowork plugin list", "cowork plugin verify pm-skills ai-biz"],
      "claude-code": ["ls .claude/skills/", "claude /ax-help"],
    },
  },
  {
    number: 4,
    title: "첫 실행",
    description: "Discovery 프로세스를 시작해 보세요.",
    commands: {
      cowork: ["/ax-bd-discovery start [아이템명]"],
      "claude-code": ["/ax-bd-discovery start [아이템명]"],
    },
  },
];

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
      className="shrink-0 opacity-0 group-hover/cmd:opacity-100 transition-opacity"
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

export default function CoworkSetupGuide() {
  const [env, setEnv] = useState<Environment>("cowork");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-display mb-1">설치 가이드</h2>
        <p className="text-sm text-muted-foreground mb-4">
          사용 환경을 선택하고 단계별로 따라해 보세요.
        </p>
      </div>

      {/* Environment Selector */}
      <div className="flex gap-2">
        <Button
          variant={env === "cowork" ? "default" : "outline"}
          size="sm"
          onClick={() => setEnv("cowork")}
          className="gap-1.5"
        >
          <Monitor className="size-3.5" />
          Cowork
        </Button>
        <Button
          variant={env === "claude-code" ? "default" : "outline"}
          size="sm"
          onClick={() => setEnv("claude-code")}
          className="gap-1.5"
        >
          <Terminal className="size-3.5" />
          Claude Code
        </Button>
      </div>

      {/* Step Cards */}
      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.number}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.number}
                </span>
                {step.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                {step.commands[env].map((cmd, i) => (
                  <div
                    key={i}
                    className={cn(
                      "group/cmd flex items-center justify-between gap-2 font-mono text-sm",
                      cmd.startsWith("#") && "text-muted-foreground",
                    )}
                  >
                    <code className="break-all">
                      {!cmd.startsWith("#") && (
                        <span className="mr-1.5 text-muted-foreground">$</span>
                      )}
                      {cmd}
                    </code>
                    {!cmd.startsWith("#") && <CopyButton text={cmd} />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
