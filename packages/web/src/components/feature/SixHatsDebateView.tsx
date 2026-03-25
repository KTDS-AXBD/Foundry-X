"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type HatColor = "white" | "red" | "black" | "yellow" | "green" | "blue";

interface TurnData {
  turnNumber: number;
  hat: HatColor;
  hatLabel: string;
  content: string;
  tokens: number;
  durationSeconds: number;
}

interface DebateData {
  id: string;
  status: "running" | "completed" | "failed";
  totalTurns: number;
  completedTurns: number;
  turns: TurnData[];
  keyIssues: string[];
  summary: string;
  model: string;
  totalTokens: number;
  durationSeconds: number;
}

interface SixHatsDebateViewProps {
  debate: DebateData | null;
  onStartDebate: () => void;
  isLoading: boolean;
}

const HAT_STYLES: Record<HatColor, { bg: string; border: string; text: string }> = {
  white: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
  red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  black: { bg: "bg-zinc-100", border: "border-zinc-300", text: "text-zinc-800" },
  yellow: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  green: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

export default function SixHatsDebateView({
  debate,
  onStartDebate,
  isLoading,
}: SixHatsDebateViewProps) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);

  if (!debate) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          Six Hats 토론을 시작하면 6가지 사고 관점에서 PRD를 자동 분석해요.
        </p>
        <Button onClick={onStartDebate} disabled={isLoading} size="sm">
          {isLoading ? "토론 진행 중..." : "🎩 Six Hats 토론 시작"}
        </Button>
      </div>
    );
  }

  const progressPercent = (debate.completedTurns / debate.totalTurns) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Six Hats 토론</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>⏱️ {formatDuration(debate.durationSeconds)}</span>
          <span>📊 {formatTokens(debate.totalTokens)} tokens</span>
          <Badge variant={debate.status === "completed" ? "default" : "secondary"}>
            {debate.status === "completed" ? "완료" : debate.status === "running" ? "진행 중" : "실패"}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      {debate.status === "running" && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Turn cards */}
      <div className="space-y-2">
        {debate.turns.map((turn) => {
          const style = HAT_STYLES[turn.hat];
          const isExpanded = expandedTurn === turn.turnNumber;

          return (
            <div
              key={turn.turnNumber}
              className={cn("rounded-lg border p-3 transition-colors", style.border, style.bg)}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 text-left"
                onClick={() => setExpandedTurn(isExpanded ? null : turn.turnNumber)}
              >
                <Badge className={cn("text-xs", style.text, style.bg, style.border)}>
                  {turn.hatLabel}
                </Badge>
                <span className="flex-1 text-xs text-muted-foreground">
                  Turn {turn.turnNumber}/{debate.totalTurns}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDuration(turn.durationSeconds)}
                </span>
              </button>

              {isExpanded && (
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {turn.content}
                </div>
              )}

              {!isExpanded && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {turn.content}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
