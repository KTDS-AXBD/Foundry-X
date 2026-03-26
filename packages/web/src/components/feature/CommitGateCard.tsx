"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { CommitGateResponse } from "@/lib/api-client";

const COMMIT_GATE_QUESTIONS = [
  "이 아이템에 앞으로 4주를 투자한다면, 그 시간이 아깝지 않을까요?",
  "우리 조직이 이걸 해야 하는 이유가 명확한가요? 규모가 아니더라도요.",
  "지금까지 Pivot한 부분이 있었다면, 그 방향 전환에 확신이 있나요?",
  "이 아이템이 안 되면, 우리가 잃는 것과 얻는 것은 뭔가요?",
];

const DECISION_CONFIG = {
  commit: { label: "Commit", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  explore_alternatives: { label: "Explore", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
  drop: { label: "Drop", color: "text-red-700", bg: "bg-red-50 border-red-200" },
} as const;

interface CommitGateCardProps {
  gate: CommitGateResponse | null;
}

export default function CommitGateCard({ gate }: CommitGateCardProps) {
  if (!gate) {
    return (
      <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-5">
        <div className="flex items-center gap-2">
          <Badge className="border-amber-200 bg-amber-100 text-amber-700">2-5</Badge>
          <h3 className="text-sm font-bold">Commit Gate</h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Commit Gate가 아직 실행되지 않았어요. 2-4 단계(아이템 도출) 완료 후 진행해요.
        </p>
      </div>
    );
  }

  const config = DECISION_CONFIG[gate.finalDecision];
  const answers = [gate.question1Answer, gate.question2Answer, gate.question3Answer, gate.question4Answer];

  return (
    <div className={cn("rounded-xl border-2 p-5", config.bg)}>
      <div className="flex items-center gap-2">
        <Badge className="border-amber-200 bg-amber-100 text-amber-700">2-5</Badge>
        <h3 className="text-sm font-bold">Commit Gate</h3>
        <Badge className={cn("ml-auto", config.color, config.bg)}>
          {config.label}
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        {COMMIT_GATE_QUESTIONS.map((q, idx) => (
          <div key={idx} className="rounded-lg border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">Q{idx + 1}. {q}</p>
            <p className="mt-1 text-sm">
              {answers[idx] || <span className="text-muted-foreground">-</span>}
            </p>
          </div>
        ))}
      </div>

      {gate.reason && (
        <div className="mt-3 rounded-lg border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">최종 판단 사유</p>
          <p className="mt-1 text-sm">{gate.reason}</p>
        </div>
      )}

      <p className="mt-2 text-right text-[10px] text-muted-foreground">
        {new Date(gate.decidedAt).toLocaleDateString("ko-KR")}
      </p>
    </div>
  );
}
