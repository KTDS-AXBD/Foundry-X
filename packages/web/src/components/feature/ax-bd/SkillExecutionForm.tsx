"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { postApi } from "@/lib/api-client";
import type { BdSkill } from "@/data/bd-skills";

interface ExecutionResult {
  artifactId: string;
  skillId: string;
  version: number;
  outputText: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  status: "completed" | "failed";
}

interface SkillExecutionFormProps {
  skill: BdSkill;
  bizItemId: string;
  stageId: string;
}

export default function SkillExecutionForm({
  skill,
  bizItemId,
  stageId,
}: SkillExecutionFormProps) {
  const [inputText, setInputText] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!inputText.trim()) return;
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const res = await postApi<ExecutionResult>(
        `/ax-bd/skills/${encodeURIComponent(skill.id)}/execute`,
        { bizItemId, stageId, inputText },
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 중 오류가 발생했어요");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
          스킬 실행
        </h4>
        <Textarea
          placeholder={skill.input ?? "분석할 내용을 입력하세요..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={4}
          className="mb-3 resize-none"
          disabled={isExecuting}
        />
        <Button
          onClick={handleExecute}
          disabled={isExecuting || !inputText.trim()}
          size="sm"
          className="w-full"
        >
          {isExecuting ? "실행 중..." : "실행하기"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant={result.status === "completed" ? "default" : "destructive"}
              className="text-[10px]"
            >
              {result.status === "completed" ? "완료" : "실패"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              v{result.version} · {result.tokensUsed.toLocaleString()} 토큰 ·{" "}
              {(result.durationMs / 1000).toFixed(1)}초
            </span>
          </div>
          <div className="prose prose-sm max-h-[400px] overflow-y-auto whitespace-pre-wrap text-sm">
            {result.outputText}
          </div>
        </div>
      )}
    </div>
  );
}
